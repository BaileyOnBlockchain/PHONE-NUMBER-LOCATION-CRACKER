import { parsePhoneNumber, isValidPhoneNumber, isPossiblePhoneNumber, getNumberType } from 'libphonenumber-js';
import { getCountryByISO } from '../data/countries.js';

export const LINE_TYPE_LABELS = {
  MOBILE: 'Mobile',
  FIXED_LINE: 'Fixed Line',
  FIXED_LINE_OR_MOBILE: 'Fixed/Mobile',
  TOLL_FREE: 'Toll-Free',
  PREMIUM_RATE: 'Premium Rate',
  SHARED_COST: 'Shared Cost',
  VOIP: 'VoIP',
  PERSONAL_NUMBER: 'Personal Number',
  PAGER: 'Pager',
  UAN: 'Universal Access Number',
  VOICEMAIL: 'Voicemail',
  UNKNOWN: 'Unknown',
};

export const LINE_TYPE_ICONS = {
  MOBILE: '📱',
  FIXED_LINE: '📞',
  FIXED_LINE_OR_MOBILE: '📟',
  TOLL_FREE: '🆓',
  PREMIUM_RATE: '💰',
  SHARED_COST: '🤝',
  VOIP: '🌐',
  PERSONAL_NUMBER: '🔀',
  PAGER: '📟',
  UAN: '🏢',
  VOICEMAIL: '📬',
  UNKNOWN: '❓',
};

/**
 * Parse and validate a phone number string
 * @param {string} raw - Raw phone number input
 * @param {string} [defaultCountry] - ISO 2-letter country code for ambiguous numbers
 * @returns {object} Parsed phone data
 */
export function parsePhone(raw, defaultCountry = null) {
  const cleaned = raw.trim().replace(/[^\d+]/g, match => {
    // Allow + only at start; allow spaces, dashes, parens for readability then strip
    return /[\s\-().ext]/i.test(match) ? '' : match;
  });

  let phone = null;
  let parseError = null;
  let isValid = false;
  let isPossible = false;

  try {
    if (defaultCountry) {
      phone = parsePhoneNumber(raw, defaultCountry);
    } else {
      phone = parsePhoneNumber(raw);
    }
    isValid = phone.isValid();
    isPossible = true;
  } catch (e) {
    parseError = e.message;
    // Try a more lenient parse
    try {
      isPossible = isPossiblePhoneNumber(raw, defaultCountry || undefined);
    } catch {}
  }

  if (!phone) {
    return {
      raw,
      valid: false,
      possible: isPossible,
      error: parseError || 'Could not parse number',
      e164: null,
      national: null,
      international: null,
      countryCode: null,
      country: null,
      countryData: null,
      lineType: 'UNKNOWN',
      lineTypeLabel: 'Unknown',
      lineTypeIcon: '❓',
      nationalNumber: null,
      significantNumber: cleaned,
    };
  }

  const lineType = phone.getType() || 'UNKNOWN';
  const countryISO = phone.country || null;
  const countryData = countryISO ? getCountryByISO(countryISO) : null;

  return {
    raw,
    valid: isValid,
    possible: isPossible,
    error: null,
    e164: phone.format('E.164'),
    national: isValid ? phone.formatNational() : null,
    international: isValid ? phone.formatInternational() : null,
    uri: isValid ? phone.getURI() : null,
    countryCode: phone.countryCallingCode,
    country: countryISO,
    countryData,
    lineType,
    lineTypeLabel: LINE_TYPE_LABELS[lineType] || lineType,
    lineTypeIcon: LINE_TYPE_ICONS[lineType] || '❓',
    nationalNumber: phone.nationalNumber,
    significantNumber: phone.nationalNumber || cleaned,
  };
}

/**
 * Format a number in multiple ways for display
 */
export function formatPhoneVariants(phoneData) {
  if (!phoneData.valid) return {};
  return {
    e164: phoneData.e164,
    national: phoneData.national,
    international: phoneData.international,
    rfc3966: phoneData.uri,
    digitsOnly: phoneData.e164?.replace(/\D/g, ''),
    countryStripped: phoneData.nationalNumber,
  };
}
