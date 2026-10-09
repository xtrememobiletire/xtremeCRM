import mapboxgl from 'mapbox-gl';

export type MarkerType = 'job' | 'fleet' | 'customer' | 'driver';

export interface CreateMarkerOptions {
  type: MarkerType;
  color?: string;
  label?: string;
  isPulsing?: boolean;
}

/**
 * Creates custom styled HTML marker elements for Mapbox GL
 */
export function createCustomMarkerElement(options: CreateMarkerOptions): HTMLElement {
  const el = document.createElement('div');
  el.className = 'mapbox-custom-marker';

  const baseColor =
    options.color ||
    (options.type === 'job'
      ? '#ef4444' // Red for Roadside jobs
      : options.type === 'fleet'
      ? '#3b82f6' // Blue for Fleets
      : options.type === 'customer'
      ? '#10b981' // Green for Customers
      : '#8b5cf6'); // Purple for Drivers

  el.style.width = '32px';
  el.style.height = '32px';
  el.style.borderRadius = '50%';
  el.style.backgroundColor = baseColor;
  el.style.border = '2px solid white';
  el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
  el.style.cursor = 'pointer';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.color = 'white';
  el.style.fontSize = '11px';
  el.style.fontWeight = '700';
  el.style.transition = 'transform 0.15s ease';

  el.addEventListener('mouseenter', () => {
    el.style.transform = 'scale(1.2)';
    el.style.zIndex = '100';
  });

  el.addEventListener('mouseleave', () => {
    el.style.transform = 'scale(1)';
    el.style.zIndex = '1';
  });

  if (options.label) {
    el.innerText = options.label.slice(0, 3);
  } else {
    // Icons based on type
    const icon =
      options.type === 'job'
        ? '🛞'
        : options.type === 'fleet'
        ? '🚛'
        : options.type === 'customer'
        ? '👤'
        : '🚗';
    el.innerText = icon;
  }

  if (options.isPulsing) {
    el.style.animation = 'pulse 1.5s infinite';
  }

  return el;
}

/**
 * Helper to add a marker with popup to a Mapbox map
 */
export function addMapMarker(
  map: mapboxgl.Map,
  coords: [number, number],
  htmlContent: string,
  markerOptions: CreateMarkerOptions,
  onClick?: () => void
): mapboxgl.Marker {
  const el = createCustomMarkerElement(markerOptions);
  if (onClick) {
    el.addEventListener('click', onClick);
  }

  const popup = new mapboxgl.Popup({ offset: 25, closeButton: true, maxWidth: '320px' }).setHTML(
    htmlContent
  );

  const marker = new mapboxgl.Marker(el).setLngLat(coords).setPopup(popup).addTo(map);

  return marker;
}
