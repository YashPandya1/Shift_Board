import { Router } from 'express';
import {
  getLocations, getLocation, createLocation, updateLocation,
  deleteLocation, assignManagers,
} from '../controllers/locationController.js';
import { authenticate, isOwnerOrManager, isOwner, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', getLocations);
router.get('/:id', getLocation);
router.post('/', isOwner, createLocation);
router.put('/:id', isOwnerOrManager, updateLocation);
router.delete('/:id', isOwner, deleteLocation);
router.post('/:id/managers', isOwner, assignManagers);

export default router;
