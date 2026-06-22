import { Router } from 'express';
import {
  getDashboard, getLaborCostReport, getNotifications,
  markNotificationRead, sendNotification, getAnnouncements, createAnnouncement,
} from '../controllers/dashboardController.js';
import {
  getOrganization, updateOrganization, uploadLogo, updateSettings,
} from '../controllers/organizationController.js';
import { authenticate, isOwnerOrManager, isOwner, requireAdmin } from '../middleware/auth.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'ShiftBoard API is running', version: '1.0.0' });
});

router.use(authenticate, requireAdmin);

router.get('/dashboard', getDashboard);
router.get('/reports/labor-cost', isOwnerOrManager, getLaborCostReport);

router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationRead);
router.post('/notifications/send', isOwnerOrManager, sendNotification);

router.get('/announcements', getAnnouncements);
router.post('/announcements', isOwnerOrManager, createAnnouncement);

router.get('/organization', getOrganization);
router.put('/organization', isOwner, updateOrganization);
router.put('/organization/settings', isOwner, updateSettings);
router.post('/organization/logo', isOwner, upload.single('logo'), uploadLogo);

export default router;
