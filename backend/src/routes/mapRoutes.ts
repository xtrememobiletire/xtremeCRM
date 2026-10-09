import { Router } from 'express';
import { mapController } from '../controllers/mapController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Geocoding and map resource endpoints
router.get('/config', authenticate, mapController.getConfig);
router.get('/customers', authenticate, mapController.getCustomers);
router.get('/fleets', authenticate, mapController.getFleets);
router.get('/jobs', authenticate, mapController.getJobs);
router.post('/geocode', authenticate, mapController.geocode);

export default router;
