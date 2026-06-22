import { Organization } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { uploadImage } from '../services/storageService.js';

export const getOrganization = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.user.organizationId);
    if (!org) throw new AppError('Organization not found', 404);
    res.json({ success: true, data: org });
  } catch (error) {
    next(error);
  }
};

export const updateOrganization = async (req, res, next) => {
  try {
    const allowedFields = ['name', 'timezone', 'scheduleStartDay'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const org = await Organization.findOneAndUpdate(
      { _id: req.user.organizationId },
      updates,
      { new: true, runValidators: true }
    );
    if (!org) throw new AppError('Organization not found', 404);
    res.json({ success: true, data: org });
  } catch (error) {
    next(error);
  }
};

export const uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400);

    const result = await uploadImage(req.file.buffer, 'shiftboard/logos');
    const org = await Organization.findByIdAndUpdate(
      req.user.organizationId,
      { logo: result.url },
      { new: true }
    );

    res.json({ success: true, data: { logo: org.logo } });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const allowedFields = [
      'scheduleStartDay',
      'overtimeThreshold',
      'notificationPreferences',
      'branding',
      'timezone',
      'defaultLanguage',
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (req.body.laborCostSettings !== undefined) {
      const existing = await Organization.findById(req.user.organizationId);
      updates.laborCostSettings = {
        ...(existing?.laborCostSettings?.toObject?.() ?? existing?.laborCostSettings ?? {}),
        ...req.body.laborCostSettings,
      };
    }

    const org = await Organization.findByIdAndUpdate(
      req.user.organizationId,
      updates,
      { new: true, runValidators: true }
    );

    res.json({ success: true, data: org });
  } catch (error) {
    next(error);
  }
};
