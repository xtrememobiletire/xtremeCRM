# Mapbox Integration Guide & Technical Blueprint for PERN CRM

## Comprehensive Architecture, Database Schema, Express Backend Geocoding, and React Frontend Integration

# 1\. Executive Overview & Architecture

This blueprint provides the complete technical specifications for integrating **Mapbox** into a **PERN Stack (PostgreSQL, Express, React, Node.js)** CRM system. The integration split into two primary roles:

1. **Backend (Node.js/Express \+ PostgreSQL):** Handles address-to-coordinate translation (Geocoding) via Mapbox API and stores geographic coordinates (latitude and longitude) in the client records.  
2. **Frontend (React \+ Mapbox GL JS):** Fetches client coordinates from the Express API and renders interactive map canvases with markers and info popups.

# 2\. System Requirements & Free Tier Limits

1. **Mapbox Public Access Token:** Required for both frontend map initialization and backend geocoding requests (starts with pk.eyJ...).  
2. **Web Map View Quota:** 50,000 free map loads per month (resets monthly).  
3. **Geocoding API Quota:** 100,000 free address search/translation requests per month (resets monthly).

# 3\. Database Schema (PostgreSQL)

Add latitude and longitude columns to the client dataset to store spatial markers:

```sql
-- Schema Update for PostgreSQL
ALTER TABLE clients 
  ADD COLUMN address VARCHAR(255),
  ADD COLUMN latitude FLOAT,
  ADD COLUMN longitude FLOAT;
```

# 4\. Express Backend Geocoding Service

Implement Node.js controller logic to convert human-readable addresses into latitude and longitude coordinates before saving to PostgreSQL.

```js
// backend/services/geocodingService.js
const axios = require('axios');

async function geocodeAddress(address) {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  const encodedAddress = encodeURIComponent(address);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${token}`;

  const response = await axios.get(url);
  if (response.data.features && response.data.features.length > 0) {
    const [longitude, latitude] = response.data.features[0].center;
    return { latitude, longitude };
  }
  throw new Error('Address not found');
}

module.exports = { geocodeAddress };
```

## API Endpoints

```js
// POST /api/clients - Create new CRM Client with Geocoding
app.post('/api/clients', async (req, res) => {
  try {
    const { name, address } = req.body;
    const { latitude, longitude } = await geocodeAddress(address);
    
    const newClient = await db.query(
      'INSERT INTO clients (name, address, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, address, latitude, longitude]
    );
    res.json(newClient.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/clients - Retrieve all clients for map rendering
app.get('/api/clients', async (req, res) => {
  const clients = await db.query('SELECT * FROM clients');
  res.json(clients.rows);
});
```

# 5\. React Frontend Integration

Install the Mapbox library in your React client project:

```sh
npm install mapbox-gl
```

Create the map canvas component to render spatial data pins:

```js
// frontend/src/components/ClientMap.jsx
import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

export default function ClientMap({ clients }) {
  const mapContainer = useRef(null);

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-74.5, 40],
      zoom: 9,
    });

    clients.forEach((client) => {
      if (client.longitude && client.latitude) {
        new mapboxgl.Marker()
          .setLngLat([client.longitude, client.latitude])
          .setPopup(new mapboxgl.Popup().setHTML(`<h4>${client.name}</h4><p>${client.address}</p>`))
          .addTo(map);
      }
    });

    return () => map.remove();
  }, [clients]);

  return <div ref={mapContainer} style={{ width: '100%', height: '500px', borderRadius: '8px' }} />;
}
```

