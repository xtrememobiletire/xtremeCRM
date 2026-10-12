const FALLBACK_PUBLIC_KEY =
  typeof atob === 'function'
    ? atob('cGsuZXlKMUlqb2llSFJ5WlcxbGJXOWlhV3hsZEdseVpTSXNJbUVpT2lKamJYVjZhbTluYW5nd01EVnpNbmx3YzJkaVoybDBhREkzSW4wLnBnbVp0ODBacHdKVUExelM2TDNOZnc=')
    : '';

export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || FALLBACK_PUBLIC_KEY;

export const DEFAULT_MAP_CENTER: [number, number] = [-79.3832, 43.6532]; // Toronto default
export const DEFAULT_MAP_STYLE = 'mapbox://styles/mapbox/streets-v12';
export const DARK_MAP_STYLE = 'mapbox://styles/mapbox/navigation-night-v1';
