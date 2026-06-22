import { Router } from 'express';
import {
  getEmployees, getEmployee, createEmployee, createManager, updateEmployee,
  bulkImportEmployees, transferEmployee, addCertification, addPerformanceNote,
  deleteEmployee,
} from '../controllers/employeeController.js';
import { authenticate, isOwnerOrManager, isOwner, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', getEmployees);
router.get('/:id', getEmployee);
router.post('/', isOwnerOrManager, createEmployee);
router.post('/managers', isOwner, createManager);
router.put('/:id', isOwnerOrManager, updateEmployee);
router.delete('/:id', isOwnerOrManager, deleteEmployee);
router.post('/bulk-import', isOwnerOrManager, bulkImportEmployees);
router.post('/:id/transfer', isOwnerOrManager, transferEmployee);
router.post('/:id/certifications', isOwnerOrManager, addCertification);
router.post('/:id/performance-notes', isOwnerOrManager, addPerformanceNote);

export default router;
