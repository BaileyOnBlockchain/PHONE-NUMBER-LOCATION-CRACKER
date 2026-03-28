/**
 * Risk scoring engine
 * Produces a 0-100 risk score based on observable phone number properties.
 * Higher = more suspicious. This is heuristic, not authoritative.
 */

export function calculateRiskScore(phoneData, carrierData, voipData, flaggedData) {
  const factors = [];
  let score = 0;

  // Invalid number
  if (!phoneData.valid) {
    score += 40;
    factors.push({ label: 'Invalid number format', delta: +40, severity: 'high' });
  }

  // VoIP number
  if (voipData?.isVoIP || phoneData.lineType === 'VOIP') {
    score += 25;
    factors.push({ label: 'VoIP number (frequently used for spam/scams)', delta: +25, severity: 'medium' });
  }

  // Premium rate
  if (phoneData.lineType === 'PREMIUM_RATE') {
    score += 30;
    factors.push({ label: 'Premium rate number', delta: +30, severity: 'high' });
  }

  // Toll-free (slightly elevated - often used for robocalls)
  if (phoneData.lineType === 'TOLL_FREE') {
    score += 10;
    factors.push({ label: 'Toll-free number (can be used for spam)', delta: +10, severity: 'low' });
  }

  // Flagged area code / prefix
  if (flaggedData?.flagged) {
    score += 20;
    factors.push({ label: flaggedData.reason, delta: +20, severity: 'high' });
  }

  // Unknown carrier (harder to trace)
  if (carrierData?.confidence === 'none' || carrierData?.carrier?.includes('Unknown')) {
    score += 8;
    factors.push({ label: 'Carrier not identified in database', delta: +8, severity: 'low' });
  }

  // Personal number type
  if (phoneData.lineType === 'PERSONAL_NUMBER') {
    score += 5;
    factors.push({ label: 'Personal/forwarding number', delta: +5, severity: 'low' });
  }

  // Positive signals (reduce score)
  if (phoneData.valid && phoneData.lineType === 'FIXED_LINE') {
    score -= 5;
    factors.push({ label: 'Verified fixed landline', delta: -5, severity: 'positive' });
  }

  if (carrierData?.confidence === 'high') {
    score -= 5;
    factors.push({ label: 'Carrier positively identified', delta: -5, severity: 'positive' });
  }

  if (phoneData.valid && phoneData.lineType === 'MOBILE') {
    score -= 3;
    factors.push({ label: 'Valid mobile number', delta: -3, severity: 'positive' });
  }

  // Clamp 0–100
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    level: getRiskLevel(score),
    color: getRiskColor(score),
    bar: buildBar(score),
    factors,
  };
}

function getRiskLevel(score) {
  if (score <= 15) return 'Very Low';
  if (score <= 30) return 'Low';
  if (score <= 50) return 'Moderate';
  if (score <= 70) return 'High';
  return 'Critical';
}

function getRiskColor(score) {
  if (score <= 15) return 'green';
  if (score <= 30) return 'cyan';
  if (score <= 50) return 'yellow';
  if (score <= 70) return 'redBright';
  return 'red';
}

function buildBar(score, width = 20) {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}
