/**
 * Smart GPS Navigation Link Builder
 * Auto-detects device OS:
 * - iPhone / iPad (iOS): Launches native Apple Maps app (`maps://`) with turn-by-turn driving directions
 * - Android & Web: Launches Google Maps (`https://www.google.com/maps/dir/...`)
 * Zero paid Google Cloud API keys needed ($0.00 cost)
 */

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function getNavigationUrl(params: {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
}): string {
  const { latitude, longitude, address } = params;
  const ios = isIOS();

  if (latitude != null && longitude != null && !isNaN(latitude) && !isNaN(longitude)) {
    if (ios) {
      // Native Apple Maps URL scheme on iOS with driving directions
      return `maps://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`;
    }
    // Google Maps universal web navigation intent
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  }

  const cleanAddr = encodeURIComponent((address || '').trim());
  if (ios) {
    return `maps://maps.apple.com/?q=${cleanAddr}&dirflg=d`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${cleanAddr}`;
}

export function getGoogleMapsFallbackUrl(params: {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
}): string {
  const { latitude, longitude, address } = params;
  if (latitude != null && longitude != null && !isNaN(latitude) && !isNaN(longitude)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  }
  const cleanAddr = encodeURIComponent((address || '').trim());
  return `https://www.google.com/maps/search/?api=1&query=${cleanAddr}`;
}
