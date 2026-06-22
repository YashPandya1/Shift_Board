import { Router } from 'express';
import {
  getSwapRequests, createSwapRequest, reviewSwapRequest,
} from '../controllers/swapController.js';
import { authenticate, isOwnerOrManager, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', getSwapRequests);
router.post('/', createSwapRequest);
router.put('/:id/review', isOwnerOrManager, reviewSwapRequest);

export default router;
