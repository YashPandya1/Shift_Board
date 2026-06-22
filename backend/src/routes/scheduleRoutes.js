import { Router } from 'express';
import {
  getSchedules, getWeekSchedule, createSchedule, createShift,
  updateShift, deleteShift, copyPreviousWeek, publishSchedule,
  validateShift, suggestEmployees, exportSchedulePDF,
  claimOpenShift, approveClaimedShift, clearSchedule,
} from '../controllers/scheduleController.js';
import { authenticate, isOwnerOrManager, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', getSchedules);
router.get('/week', getWeekSchedule);
router.post('/', isOwnerOrManager, createSchedule);
router.post('/copy-week', isOwnerOrManager, copyPreviousWeek);
router.post('/validate', isOwnerOrManager, validateShift);
router.get('/suggest-employees', isOwnerOrManager, suggestEmployees);
router.delete('/clear-week', isOwnerOrManager, clearSchedule);
router.post('/:id/publish', isOwnerOrManager, publishSchedule);
router.delete('/:id/clear', isOwnerOrManager, clearSchedule);
router.get('/:id/pdf', exportSchedulePDF);

router.post('/shifts', isOwnerOrManager, createShift);
router.put('/shifts/:id', isOwnerOrManager, updateShift);
router.delete('/shifts/:id', isOwnerOrManager, deleteShift);
router.post('/shifts/:id/approve-claim', isOwnerOrManager, approveClaimedShift);

export default router;
