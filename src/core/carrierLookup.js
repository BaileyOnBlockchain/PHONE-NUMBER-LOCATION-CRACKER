import { CARRIER_PREFIXES, VOIP_INDICATORS, FLAGGED_PATTERNS } from '../data/carriers.js';

/**
 * Look up carrier information for a parsed phone number
 * Matches national number prefix against known carrier databases
 *
 * @param {object} phoneData - Parsed phone data from phoneParser.js
 * @returns {object} Carrier info
 */
export function lookupCarrier(phoneData) {
  const { country, nationalNumber, lineType } = phoneData;

  if (!country || !nationalNumber) {
    return buildUnknown(country);
  }

  const prefixData = CARRIER_PREFIXES[country];
  if (!prefixData) {
    return buildUnknown(country);
  }

  // US has a more complex structure with separate mobile, tollFree, and areaCodes
  if (country === 'US') {
    return lookupUS(nationalNumber, lineType);
  }

  // CA has areaCodes sub-structure
  if (country === 'CA') {
    return lookupCA(nationalNumber);
  }

  // Array-based prefix lookup for other countries
  if (Array.isArray(prefixData)) {
    return lookupByPrefix(nationalNumber, prefixData, country);
  }

  return buildUnknown(country);
}

function lookupUS(nationalNumber, lineType) {
  const prefixData = CARRIER_PREFIXES.US;

  // Check toll-free first
  for (const entry of (prefixData.tollFree || [])) {
    if (nationalNumber.startsWith(entry.prefix)) {
      return {
        carrier: entry.carrier,
        type: entry.type,
        network: entry.network,
        confidence: 'high',
        region: null,
        note: 'US Toll-Free number',
      };
    }
  }

  // Try mobile prefix matching
  const mobile = prefixData.mobile || [];
  const mobileMatch = longestPrefixMatch(nationalNumber, mobile);
  if (mobileMatch) {
    const areaCode = nationalNumber.substring(0, 3);
    const areaInfo = prefixData.areaCodes[areaCode];
    return {
      carrier: mobileMatch.carrier,
      type: mobileMatch.type,
      network: mobileMatch.network,
      confidence: 'medium',
      region: areaInfo ? `${areaInfo.city}, ${areaInfo.state}` : stateFromAreaCode(areaCode),
      note: null,
    };
  }

  // Fall back to area code lookup for region
  const areaCode = nationalNumber.substring(0, 3);
  const areaInfo = prefixData.areaCodes[areaCode];
  return {
    carrier: 'Unknown US Carrier',
    type: lineType?.toLowerCase() || 'unknown',
    network: 'Unknown',
    confidence: 'low',
    region: areaInfo ? `${areaInfo.city}, ${areaInfo.state}` : null,
    note: areaInfo ? `Area code ${areaCode} serves ${areaInfo.city}` : null,
  };
}

function lookupCA(nationalNumber) {
  const prefixData = CARRIER_PREFIXES.CA;
  const areaCode = nationalNumber.substring(0, 3);
  const areaInfo = (prefixData.areaCodes || {})[areaCode];

  return {
    carrier: 'Canadian Carrier (Bell / Rogers / Telus / Shaw)',
    type: 'mobile',
    network: '5G/LTE',
    confidence: 'low',
    region: areaInfo ? `${areaInfo.city}, ${areaInfo.province}` : null,
    note: areaInfo ? `Area code ${areaCode} — ${areaInfo.province}` : null,
  };
}

function lookupByPrefix(nationalNumber, prefixArray, country) {
  const match = longestPrefixMatch(nationalNumber, prefixArray);
  if (match) {
    return {
      carrier: match.carrier,
      type: match.type,
      network: match.network || 'Unknown',
      confidence: match.prefix.length >= 3 ? 'high' : 'medium',
      region: match.region || match.circle || null,
      note: match.note || null,
    };
  }
  return buildUnknown(country);
}

/**
 * Find the longest matching prefix in a list of prefix entries
 */
function longestPrefixMatch(nationalNumber, entries) {
  let best = null;
  let bestLen = 0;
  for (const entry of entries) {
    const p = String(entry.prefix);
    if (nationalNumber.startsWith(p) && p.length > bestLen) {
      best = entry;
      bestLen = p.length;
    }
  }
  return best;
}

function buildUnknown(country) {
  return {
    carrier: country ? `Unknown ${country} Carrier` : 'Unknown Carrier',
    type: 'unknown',
    network: 'Unknown',
    confidence: 'none',
    region: null,
    note: 'Carrier database entry not found for this prefix',
  };
}

/**
 * Check if a number has VoIP indicators
 */
export function checkVoIPIndicators(phoneData) {
  const { nationalNumber, country, lineType } = phoneData;
  if (lineType === 'VOIP') return { isVoIP: true, note: 'Classified as VoIP by number type' };
  for (const indicator of VOIP_INDICATORS) {
    if (indicator.country === country && indicator.pattern.test(nationalNumber)) {
      return { isVoIP: true, note: indicator.note };
    }
  }
  return { isVoIP: false, note: null };
}

/**
 * Check if area code is flagged for premium/spam
 */
export function checkFlaggedPatterns(phoneData) {
  const { country, nationalNumber } = phoneData;
  const patterns = FLAGGED_PATTERNS[country] || [];
  for (const p of patterns) {
    if (nationalNumber.startsWith(p)) {
      return { flagged: true, reason: `Premium rate prefix (${p})` };
    }
  }
  return { flagged: false, reason: null };
}

/**
 * Helper: rough state lookup for US area codes not in DB
 */
function stateFromAreaCode(areaCode) {
  return null; // Could be extended with full NANPA data
}
