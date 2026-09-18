import { Router } from 'express';
import { jobController } from '../controllers/jobController.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createJobSchema, updateJobStatusSchema } from '../schemas/job.schema.js';
import { tenantScope } from '../middleware/tenantScope.js';

const router = Router();

router.use(authenticate);
router.use(tenantScope);

router.get('/', jobController.getJobs);
router.get('/:id', jobController.getJobById);
router.post('/', validateRequest({ body: createJobSchema }), jobController.createJob);
router.patch('/:id/status', validateRequest({ body: updateJobStatusSchema }), jobController.updateJobStatus);

export default router;
