import { Router } from 'express';
import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import customersRoutes from './customers.routes.js';
import jobsRoutes from './jobs.routes.js';
import vehiclesRoutes from './vehicles.routes.js';
import fleetsRoutes from './fleets.routes.js';
import invoicesRoutes from './invoices.routes.js';
import accountingRoutes from './accounting.routes.js';
import telephonyRoutes from './telephony.routes.js';
import leadRoutes from './lead.routes.js';
import messagesRoutes from './messages.routes.js';
import docsRoutes from './docs.routes.js';
import healthRoutes from './health.routes.js';
import fleetPortalRoutes from './fleetPortal.routes.js';
import memberPortalRoutes from './memberPortal.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/customers', customersRoutes);
router.use('/jobs', jobsRoutes);
router.use('/vehicles', vehiclesRoutes);
router.use('/fleets', fleetsRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/accounting', accountingRoutes);
router.use('/telephony', telephonyRoutes);
router.use('/leads', leadRoutes);
router.use('/messages', messagesRoutes);
router.use('/fleet-portal', fleetPortalRoutes);
router.use('/member-portal', memberPortalRoutes);
router.use('/docs', docsRoutes);
router.use('/', healthRoutes);

export default router;
