import {
  EmployeeProfile,
  User,
  Availability,
  Organization,
  Shift,
} from '../models/index.js';
import { ROLES } from '../config/constants.js';
import { AppError } from '../middleware/errorHandler.js';
import { paginate, getWeekBounds } from '../utils/helpers.js';

const employeeName = (emp) => {
  if (emp.firstName) return `${emp.firstName} ${emp.lastName || ''}`.trim();
  if (emp.userId) return `${emp.userId.firstName} ${emp.userId.lastName}`.trim();
  return 'Unknown';
};

export const getEmployees = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, locationId, search } = req.query;
    const query = { organizationId: req.user.organizationId };

    if (status) query.employmentStatus = status;
    if (locationId) query.availableLocationIds = locationId;

    let employees = EmployeeProfile.find(query)
      .populate('userId', 'firstName lastName email phone avatar role isActive')
      .populate('availableLocationIds', 'name')
      .populate('preferredLocationIds', 'name')
      .sort({ createdAt: -1 });

    employees = await paginate(employees, parseInt(page), parseInt(limit));

    let results = employees;
    if (search) {
      const s = search.toLowerCase();
      results = employees.filter((e) =>
        employeeName(e).toLowerCase().includes(s) ||
        (e.email || e.userId?.email || '').toLowerCase().includes(s)
      );
    }

    const total = await EmployeeProfile.countDocuments(query);

    const org = await Organization.findById(req.user.organizationId);
    const { weekStart, weekEnd } = getWeekBounds(new Date(), org?.scheduleStartDay || 'monday');

    const hoursByEmployee = await Shift.aggregate([
      {
        $match: {
          organizationId: req.user.organizationId,
          employeeId: { $ne: null },
          date: { $gte: weekStart, $lte: weekEnd },
          status: { $ne: 'cancelled' },
        },
      },
      { $group: { _id: '$employeeId', hoursThisWeek: { $sum: { $ifNull: ['$totalHours', 0] } } } },
    ]);

    const hoursMap = Object.fromEntries(
      hoursByEmployee.map((h) => [h._id.toString(), Math.round(h.hoursThisWeek * 10) / 10])
    );

    const enriched = results.map((e) => {
      const obj = typeof e.toObject === 'function' ? e.toObject() : e;
      return {
        ...obj,
        hoursThisWeek: hoursMap[obj._id.toString()] ?? 0,
      };
    });

    res.json({
      success: true,
      data: enriched,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployee = async (req, res, next) => {
  try {
    const employee = await EmployeeProfile.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    })
      .populate('userId', 'firstName lastName email phone avatar role')
      .populate('availableLocationIds', 'name')
      .populate('preferredLocationIds', 'name');

    if (!employee) throw new AppError('Employee not found', 404);

    const availability = await Availability.findOne({ employeeId: employee._id });

    res.json({ success: true, data: { employee, availability } });
  } catch (error) {
    next(error);
  }
};

/** Staff record only — no app login access */
export const createEmployee = async (req, res, next) => {
  try {
    let {
      name, firstName, lastName, email, phone, position,
      hourlyWage, availableLocationIds, preferredLocationIds,
      emergencyContact,
    } = req.body;

    if (name && !firstName) {
      const parts = String(name).trim().split(/\s+/);
      firstName = parts[0];
      lastName = parts.slice(1).join(' ') || '';
    }

    if (!firstName?.trim()) {
      throw new AppError('Employee name is required', 400);
    }

    if (!availableLocationIds?.length) {
      throw new AppError('At least one location is required', 400);
    }

    const org = await Organization.findById(req.user.organizationId);
    const wageEnabled = org?.laborCostSettings?.hourlyWageEnabled === true;

    const profileData = {
      organizationId: req.user.organizationId,
      firstName,
      lastName,
      email,
      phone,
      position,
      availableLocationIds,
      preferredLocationIds,
      emergencyContact,
      hireDate: new Date(),
    };

    if (wageEnabled && hourlyWage != null) {
      profileData.hourlyWage = hourlyWage;
    }

    const employee = await EmployeeProfile.create(profileData);

    await Availability.create({
      employeeId: employee._id,
      organizationId: req.user.organizationId,
    });

    const populated = await EmployeeProfile.findById(employee._id)
      .populate('availableLocationIds', 'name');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

/** Manager account with app login — owner only */
export const createManager = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone, locationIds } = req.body;

    if (!email || !password || !firstName || !lastName) {
      throw new AppError('Email, password, first name, and last name are required', 400);
    }

    const existing = await User.findOne({ email });
    if (existing) throw new AppError('Email already exists', 409);

    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone,
      role: ROLES.MANAGER,
      organizationId: req.user.organizationId,
      isEmailVerified: true,
    });

    const profile = await EmployeeProfile.create({
      userId: user._id,
      organizationId: req.user.organizationId,
      firstName,
      lastName,
      email,
      phone,
      position: 'Manager',
      availableLocationIds: locationIds || [],
      hireDate: new Date(),
    });

    res.status(201).json({
      success: true,
      data: { user, profile },
      message: 'Manager account created with app access',
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    const employee = await EmployeeProfile.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });

    if (!employee) throw new AppError('Employee not found', 404);

    const org = await Organization.findById(req.user.organizationId);
    const wageEnabled = org?.laborCostSettings?.hourlyWageEnabled === true;

    const { firstName, lastName, phone, email, hourlyWage, name, ...profileData } = req.body;

    if (name !== undefined) {
      const parts = String(name).trim().split(/\s+/);
      employee.firstName = parts[0];
      employee.lastName = parts.slice(1).join(' ') || '';
    } else {
      if (firstName !== undefined) employee.firstName = firstName;
      if (lastName !== undefined) employee.lastName = lastName;
    }
    if (phone !== undefined) employee.phone = phone;
    if (email !== undefined) employee.email = email;

    if (wageEnabled && hourlyWage !== undefined) {
      employee.hourlyWage = hourlyWage;
    } else if (!wageEnabled && hourlyWage !== undefined) {
      employee.hourlyWage = undefined;
    }

    if (employee.userId && (name !== undefined || firstName !== undefined || lastName !== undefined || phone !== undefined)) {
      await User.findByIdAndUpdate(employee.userId, {
        ...(employee.firstName && { firstName: employee.firstName }),
        ...(employee.lastName !== undefined && { lastName: employee.lastName }),
        ...(phone !== undefined && { phone }),
      });
    }

    Object.assign(employee, profileData);
    await employee.save();

    const populated = await employee.populate([
      { path: 'userId', select: 'firstName lastName email phone' },
      { path: 'availableLocationIds', select: 'name' },
    ]);
    res.json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

export const bulkImportEmployees = async (req, res, next) => {
  try {
    const { employees } = req.body;
    const results = { created: [], errors: [] };

    for (const emp of employees) {
      try {
        if (!emp.firstName || !emp.lastName) {
          results.errors.push({ row: emp, error: 'First and last name required' });
          continue;
        }

        const profile = await EmployeeProfile.create({
          organizationId: req.user.organizationId,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          phone: emp.phone,
          position: emp.position,
          hourlyWage: emp.hourlyWage,
          availableLocationIds: emp.availableLocationIds || [],
        });

        await Availability.create({
          employeeId: profile._id,
          organizationId: req.user.organizationId,
        });

        results.created.push({ name: `${emp.firstName} ${emp.lastName}`, id: profile._id });
      } catch (err) {
        results.errors.push({ row: emp, error: err.message });
      }
    }

    res.status(201).json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

export const transferEmployee = async (req, res, next) => {
  try {
    const { locationIds, action = 'add' } = req.body;
    const employee = await EmployeeProfile.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });

    if (!employee) throw new AppError('Employee not found', 404);

    if (action === 'add') {
      const combined = [...new Set([...employee.availableLocationIds.map(String), ...locationIds])];
      employee.availableLocationIds = combined;
    } else if (action === 'remove') {
      employee.availableLocationIds = employee.availableLocationIds.filter(
        (id) => !locationIds.includes(id.toString())
      );
    } else if (action === 'set') {
      employee.availableLocationIds = locationIds;
    }

    await employee.save();
    res.json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

export const addCertification = async (req, res, next) => {
  try {
    const employee = await EmployeeProfile.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });
    if (!employee) throw new AppError('Employee not found', 404);

    employee.certifications.push(req.body);
    await employee.save();
    res.status(201).json({ success: true, data: employee.certifications });
  } catch (error) {
    next(error);
  }
};

export const addPerformanceNote = async (req, res, next) => {
  try {
    const employee = await EmployeeProfile.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });
    if (!employee) throw new AppError('Employee not found', 404);

    employee.performanceNotes.push({
      note: req.body.note,
      createdBy: req.user._id,
    });
    await employee.save();
    res.status(201).json({ success: true, data: employee.performanceNotes });
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (req, res, next) => {
  try {
    const employee = await EmployeeProfile.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });

    if (!employee) throw new AppError('Employee not found', 404);

    if (employee.userId) {
      const user = await User.findById(employee.userId);
      if (user?.role === ROLES.OWNER) {
        throw new AppError('Cannot delete the organization owner', 400);
      }
    }

    employee.employmentStatus = 'inactive';
    await employee.save();

    res.json({ success: true, message: 'Employee removed' });
  } catch (error) {
    next(error);
  }
};
