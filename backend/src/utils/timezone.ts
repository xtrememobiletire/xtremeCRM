import tzlookup from '@photostructure/tz-lookup';

export const PKT_TIMEZONE = 'Asia/Karachi';

export const REGION_DEFAULT_TZ: Record<string, string> = {
  CA: 'America/Toronto',
  US: 'America/New_York',
  UK: 'Europe/London',
};

export function getDefaultTimezoneForCountry(countryCode?: string | null): string {
  if (!countryCode) return 'America/Toronto';
  return REGION_DEFAULT_TZ[countryCode.toUpperCase()] || 'America/Toronto';
}

export function resolveTimezoneFromCoords(
  latitude?: number | null,
  longitude?: number | null,
  countryCode?: string | null
): string {
  const fallback = getDefaultTimezoneForCountry(countryCode);
  if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
    return fallback;
  }
  if (isNaN(Number(latitude)) || isNaN(Number(longitude))) {
    return fallback;
  }
  try {
    return tzlookup(Number(latitude), Number(longitude)) || fallback;
  } catch {
    return fallback;
  }
}

// US & Canada Area Code -> IANA Timezone mapping for instant lead timezone detection
export const AREA_CODE_TZ: Record<string, string> = {
  // Pacific (US & BC)
  '604': 'America/Vancouver', '778': 'America/Vancouver', '236': 'America/Vancouver', '250': 'America/Vancouver',
  '206': 'America/Los_Angeles', '253': 'America/Los_Angeles', '360': 'America/Los_Angeles', '425': 'America/Los_Angeles',
  '503': 'America/Los_Angeles', '541': 'America/Los_Angeles', '971': 'America/Los_Angeles',
  '209': 'America/Los_Angeles', '213': 'America/Los_Angeles', '310': 'America/Los_Angeles', '323': 'America/Los_Angeles',
  '408': 'America/Los_Angeles', '415': 'America/Los_Angeles', '510': 'America/Los_Angeles', '530': 'America/Los_Angeles',
  '559': 'America/Los_Angeles', '562': 'America/Los_Angeles', '619': 'America/Los_Angeles', '626': 'America/Los_Angeles',
  '650': 'America/Los_Angeles', '661': 'America/Los_Angeles', '707': 'America/Los_Angeles', '714': 'America/Los_Angeles',
  '760': 'America/Los_Angeles', '805': 'America/Los_Angeles', '818': 'America/Los_Angeles', '831': 'America/Los_Angeles',
  '858': 'America/Los_Angeles', '909': 'America/Los_Angeles', '916': 'America/Los_Angeles', '925': 'America/Los_Angeles',
  '949': 'America/Los_Angeles', '951': 'America/Los_Angeles', '702': 'America/Los_Angeles', '725': 'America/Los_Angeles',
  // Mountain (AB, CO, AZ, UT, NM, MT, ID)
  '403': 'America/Edmonton', '587': 'America/Edmonton', '780': 'America/Edmonton', '825': 'America/Edmonton',
  '303': 'America/Denver', '719': 'America/Denver', '720': 'America/Denver', '970': 'America/Denver',
  '385': 'America/Denver', '435': 'America/Denver', '801': 'America/Denver', '505': 'America/Denver',
  '406': 'America/Denver', '208': 'America/Boise', '307': 'America/Denver',
  '480': 'America/Phoenix', '520': 'America/Phoenix', '602': 'America/Phoenix', '623': 'America/Phoenix', '928': 'America/Phoenix',
  // Central (MB, SK, TX, IL, MN, WI, MO, LA, TN, AL, OK, KS, IA, AR, MS)
  '204': 'America/Winnipeg', '431': 'America/Winnipeg', '306': 'America/Regina', '639': 'America/Regina',
  '210': 'America/Chicago', '214': 'America/Chicago', '254': 'America/Chicago', '281': 'America/Chicago',
  '325': 'America/Chicago', '346': 'America/Chicago', '361': 'America/Chicago', '409': 'America/Chicago',
  '430': 'America/Chicago', '432': 'America/Chicago', '469': 'America/Chicago', '512': 'America/Chicago',
  '682': 'America/Chicago', '713': 'America/Chicago', '726': 'America/Chicago', '737': 'America/Chicago',
  '806': 'America/Chicago', '817': 'America/Chicago', '830': 'America/Chicago', '832': 'America/Chicago',
  '903': 'America/Chicago', '936': 'America/Chicago', '940': 'America/Chicago', '956': 'America/Chicago',
  '972': 'America/Chicago', '979': 'America/Chicago',
  '217': 'America/Chicago', '224': 'America/Chicago', '309': 'America/Chicago', '312': 'America/Chicago',
  '331': 'America/Chicago', '618': 'America/Chicago', '630': 'America/Chicago', '708': 'America/Chicago',
  '773': 'America/Chicago', '779': 'America/Chicago', '815': 'America/Chicago', '847': 'America/Chicago',
  '314': 'America/Chicago', '417': 'America/Chicago', '573': 'America/Chicago', '636': 'America/Chicago', '816': 'America/Chicago',
  '414': 'America/Chicago', '608': 'America/Chicago', '715': 'America/Chicago', '920': 'America/Chicago',
  '612': 'America/Chicago', '651': 'America/Chicago', '763': 'America/Chicago', '952': 'America/Chicago',
  '504': 'America/Chicago', '225': 'America/Chicago', '318': 'America/Chicago', '337': 'America/Chicago',
  '615': 'America/Chicago', '901': 'America/Chicago', '405': 'America/Chicago', '918': 'America/Chicago',
};

export function resolveLeadTimezone(lead?: {
  countryCode?: string | null;
  phone?: string | null;
  address?: string | null;
} | null): string {
  if (!lead) return 'America/Toronto';
  const country = (lead.countryCode || 'CA').toUpperCase();
  if (country === 'UK') return 'Europe/London';

  // 1. Check state/province abbreviation in address if present
  if (lead.address) {
    const addr = lead.address.toUpperCase();
    if (/\b(BC|WA|OR|NV)\b/.test(addr)) return 'America/Los_Angeles';
    if (/\b(AB|CO|UT|NM|MT|WY)\b/.test(addr)) return 'America/Denver';
    if (/\b(AZ)\b/.test(addr)) return 'America/Phoenix';
    if (/\b(MB|TX|IL|MN|WI|MO|LA|OK|KS|IA|AR|MS|AL|TN)\b/.test(addr)) return 'America/Chicago';
    if (/\b(NS|NB|PE)\b/.test(addr)) return 'America/Halifax';
  }

  // 2. Check 3-digit North American area code from phone
  if (lead.phone) {
    const digits = lead.phone.replace(/[^0-9]/g, '');
    const area = digits.startsWith('1') && digits.length >= 11 ? digits.slice(1, 4) : digits.slice(0, 3);
    if (AREA_CODE_TZ[area]) return AREA_CODE_TZ[area];
  }

  return country === 'US' ? 'America/New_York' : 'America/Toronto';
}

/**
 * Converts a wall-clock date ("YYYY-MM-DD") and 24h time in a target IANA timezone
 * into an exact UTC Date object (immune to local server timezone).
 */
export function zonedWallTimeToUtc(
  dateStr: string,
  hour24: number,
  minute: number,
  timeZone: string = 'America/Toronto'
): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const utcGuess = Date.UTC(year, month - 1, day, hour24, minute, 0);
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(new Date(utcGuess));
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
    const tzAsUtc = Date.UTC(
      get('year'),
      get('month') - 1,
      get('day'),
      get('hour') % 24,
      get('minute'),
      get('second')
    );
    const offsetMs = tzAsUtc - utcGuess;
    return new Date(utcGuess - offsetMs);
  } catch {
    return new Date(utcGuess);
  }
}

/** Returns "YYYY-MM-DD" in the target IANA timezone */
export function getTodayInTz(timeZone: string = 'America/Toronto'): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {}
  return new Date().toISOString().split('T')[0];
}

function getTodayInTzGivenUtc(date: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const yr = parts.find((p) => p.type === 'year')?.value;
    const mo = parts.find((p) => p.type === 'month')?.value;
    const dy = parts.find((p) => p.type === 'day')?.value;
    if (yr && mo && dy) return `${yr}-${mo}-${dy}`;
  } catch {}
  return date.toISOString().split('T')[0];
}

/**
 * Calculates start (gte) and optional end (lte) dates for accounting timeframes
 * respecting the regional countryCode timezone boundaries.
 */
export function getTimeframeBounds(
  timeframe: string,
  countryCode?: string | null
): { gte: Date; lte?: Date } {
  const tz = getDefaultTimezoneForCountry(countryCode);
  const todayStr = getTodayInTz(tz);
  const [y, m, d] = todayStr.split('-').map(Number);

  if (timeframe === 'yesterday') {
    const yesterdayDate = new Date(Date.UTC(y, m - 1, d - 1, 12, 0, 0));
    const yestStr = getTodayInTzGivenUtc(yesterdayDate, tz);
    const start = zonedWallTimeToUtc(yestStr, 0, 0, tz);
    const end = new Date(zonedWallTimeToUtc(todayStr, 0, 0, tz).getTime() - 1);
    return { gte: start, lte: end };
  }

  if (timeframe === 'last_3_days' || timeframe === '3days') {
    const d3Date = new Date(Date.UTC(y, m - 1, d - 3, 12, 0, 0));
    const d3Str = getTodayInTzGivenUtc(d3Date, tz);
    return { gte: zonedWallTimeToUtc(d3Str, 0, 0, tz) };
  }

  if (timeframe === 'last_7_days' || timeframe === '7days' || timeframe === 'week') {
    const d7Date = new Date(Date.UTC(y, m - 1, d - 7, 12, 0, 0));
    const d7Str = getTodayInTzGivenUtc(d7Date, tz);
    return { gte: zonedWallTimeToUtc(d7Str, 0, 0, tz) };
  }

  if (timeframe === 'monthly' || timeframe === 'month' || timeframe === 'month_to_date') {
    const monthStartStr = `${y}-${String(m).padStart(2, '0')}-01`;
    return { gte: zonedWallTimeToUtc(monthStartStr, 0, 0, tz) };
  }

  return { gte: zonedWallTimeToUtc(todayStr, 0, 0, tz) };
}
