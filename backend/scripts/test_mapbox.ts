import { mapboxClient } from '../src/utils/mapboxClient.js';

async function test() {
  console.log('Testing Mapbox geocode...');
  const res = await mapboxClient.geocode('10100 Richmond Hwy, Lorton, VA 22079');
  console.log('GEOCODE_TEST_RESULT:', JSON.stringify(res, null, 2));
  
  if (res && res.latitude && res.longitude) {
    console.log('SUCCESS! Reverse geocoding...');
    const rev = await mapboxClient.reverseGeocode(res.latitude, res.longitude);
    console.log('REVERSE_GEOCODE_RESULT:', rev);
  } else {
    console.log('FAILED: No coordinates returned');
  }
}

test().catch(console.error);
