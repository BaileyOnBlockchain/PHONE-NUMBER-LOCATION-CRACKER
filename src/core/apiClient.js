import axios from 'axios';
import chalk from 'chalk';

/**
 * Optional API enrichment - all APIs are optional
 * Set API keys in .env to enable enhanced lookups
 */

/**
 * NumVerify API - provides carrier, line type, location
 * Free tier: 100 requests/month
 */
export async function numverifyLookup(phoneE164, apiKey) {
  if (!apiKey) return null;
  try {
    const number = phoneE164.replace('+', '');
    const res = await axios.get('http://apilayer.net/api/validate', {
      params: { access_key: apiKey, number, country_code: '', format: 1 },
      timeout: 8000,
    });
    if (res.data && res.data.valid) {
      return {
        source: 'NumVerify',
        carrier: res.data.carrier || null,
        lineType: res.data.line_type || null,
        location: res.data.location || null,
        countryCode: res.data.country_code || null,
        countryName: res.data.country_name || null,
        countryPrefix: res.data.country_prefix || null,
      };
    }
  } catch (e) {
    if (process.env.DEBUG) console.error(chalk.dim('[NumVerify error]'), e.message);
  }
  return null;
}

/**
 * AbstractAPI Phone Validation
 * Free tier: 500 requests/month
 */
export async function abstractAPILookup(phoneE164, apiKey) {
  if (!apiKey) return null;
  try {
    const res = await axios.get('https://phonevalidation.abstractapi.com/v1/', {
      params: { api_key: apiKey, phone: phoneE164 },
      timeout: 8000,
    });
    if (res.data && res.data.valid) {
      return {
        source: 'AbstractAPI',
        carrier: res.data.carrier || null,
        lineType: res.data.type || null,
        location: res.data.location || null,
        countryCode: res.data.country?.code || null,
        countryName: res.data.country?.name || null,
        timezones: res.data.timezones || null,
      };
    }
  } catch (e) {
    if (process.env.DEBUG) console.error(chalk.dim('[AbstractAPI error]'), e.message);
  }
  return null;
}

/**
 * Run all configured API enrichments and merge results
 */
export async function enrichWithAPIs(phoneData, config = {}) {
  const { numverifyKey, abstractKey } = config;
  if (!phoneData.valid || (!numverifyKey && !abstractKey)) return null;

  const results = await Promise.allSettled([
    numverifyLookup(phoneData.e164, numverifyKey),
    abstractAPILookup(phoneData.e164, abstractKey),
  ]);

  const enriched = { apis: [] };
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      enriched.apis.push(r.value);
    }
  }

  if (enriched.apis.length === 0) return null;

  // Merge: prefer first successful result for each field
  const merged = {};
  for (const api of enriched.apis) {
    for (const [k, v] of Object.entries(api)) {
      if (v && !merged[k]) merged[k] = v;
    }
  }

  return { ...merged, sources: enriched.apis.map(a => a.source) };
}
