import { Location } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';

export const getLocations = async (req, res, next) => {
  try {
    const query = { organizationId: req.user.organizationId };
    if (req.query.active !== 'false') query.isActive = true;

    const locations = await Location.find(query)
      .populate('managerIds', 'firstName lastName email')
      .sort({ name: 1 });

    res.json({ success: true, data: locations });
  } catch (error) {
    next(error);
  }
};

export const getLocation = async (req, res, next) => {
  try {
    const location = await Location.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    }).populate('managerIds', 'firstName lastName email');

    if (!location) throw new AppError('Location not found', 404);
    res.json({ success: true, data: location });
  } catch (error) {
    next(error);
  }
};

export const createLocation = async (req, res, next) => {
  try {
    const defaultHours = {
      monday: { open: '09:00', close: '21:00', closed: false },
      tuesday: { open: '09:00', close: '21:00', closed: false },
      wednesday: { open: '09:00', close: '21:00', closed: false },
      thursday: { open: '09:00', close: '21:00', closed: false },
      friday: { open: '09:00', close: '21:00', closed: false },
      saturday: { open: '09:00', close: '21:00', closed: false },
      sunday: { open: '09:00', close: '21:00', closed: true },
    };

    const location = await Location.create({
      operatingHours: defaultHours,
      ...req.body,
      organizationId: req.user.organizationId,
    });
    res.status(201).json({ success: true, data: location });
  } catch (error) {
    next(error);
  }
};

export const updateLocation = async (req, res, next) => {
  try {
    const location = await Location.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!location) throw new AppError('Location not found', 404);
    res.json({ success: true, data: location });
  } catch (error) {
    next(error);
  }
};

export const deleteLocation = async (req, res, next) => {
  try {
    const location = await Location.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { isActive: false },
      { new: true }
    );
    if (!location) throw new AppError('Location not found', 404);
    res.json({ success: true, message: 'Location deactivated' });
  } catch (error) {
    next(error);
  }
};

export const assignManagers = async (req, res, next) => {
  try {
    const { managerIds } = req.body;
    const location = await Location.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { managerIds },
      { new: true }
    ).populate('managerIds', 'firstName lastName email');

    if (!location) throw new AppError('Location not found', 404);
    res.json({ success: true, data: location });
  } catch (error) {
    next(error);
  }
};
