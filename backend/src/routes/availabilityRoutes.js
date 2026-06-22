import { Router } from 'express';
import {
  getTimeOffRequests, createTimeOffRequest, reviewTimeOffRequest,
  getAvailability, updateAvailability, overrideAvailability,
} from '../controllers/availabilityController.js';
import { authenticate, isOwnerOrManager, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/timeoff', getTimeOffRequests);
router.post('/timeoff', createTimeOffRequest);
router.put('/timeoff/:id/review', isOwnerOrManager, reviewTimeOffRequest);

router.get('/availability', getAvailability);
router.get('/availability/:employeeId', isOwnerOrManager, getAvailability);
router.put('/availability', updateAvailability);
router.put('/availability/:employeeId', updateAvailability);
router.post('/availability/override', isOwnerOrManager, overrideAvailability);

export default router;
