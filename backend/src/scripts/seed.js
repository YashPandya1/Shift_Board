import dotenv from 'dotenv';
import mongoose from 'mongoose';
import {
  User, Organization, Location, EmployeeProfile, Availability,
} from '../models/index.js';
import { ROLES } from '../config/constants.js';

dotenv.config();

const defaultHours = {
  monday: { open: '09:00', close: '21:00', closed: false },
  tuesday: { open: '09:00', close: '21:00', closed: false },
  wednesday: { open: '09:00', close: '21:00', closed: false },
  thursday: { open: '09:00', close: '21:00', closed: false },
  friday: { open: '09:00', close: '21:00', closed: false },
  saturday: { open: '09:00', close: '21:00', closed: false },
  sunday: { open: '09:00', close: '21:00', closed: true },
};

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shiftboard');
  console.log('Connected to MongoDB for seeding');

  await Promise.all([
    User.deleteMany({}),
    Organization.deleteMany({}),
    Location.deleteMany({}),
    EmployeeProfile.deleteMany({}),
    Availability.deleteMany({}),
  ]);

  const owner = await User.create({
    email: 'owner@shiftboard.demo',
    password: 'Demo1234!',
    firstName: 'Alex',
    lastName: 'Martinez',
    phone: '+14165550100',
    role: ROLES.OWNER,
    isEmailVerified: true,
  });

  const org = await Organization.create({
    name: 'Demo Mart Group',
    slug: 'demo-mart-group',
    ownerId: owner._id,
    scheduleStartDay: 'wednesday',
    timezone: 'America/Toronto',
  });

  owner.organizationId = org._id;
  await owner.save();

  const locations = await Location.insertMany([
    { organizationId: org._id, name: 'Elora Mart', address: { city: 'Elora', province: 'ON' }, operatingHours: defaultHours },
    { organizationId: org._id, name: 'Fergus Mart', address: { city: 'Fergus', province: 'ON' }, operatingHours: defaultHours },
    { organizationId: org._id, name: 'Waterloo Mart', address: { city: 'Waterloo', province: 'ON' }, operatingHours: defaultHours },
  ]);

  const manager = await User.create({
    email: 'manager@shiftboard.demo',
    password: 'Demo1234!',
    firstName: 'Sarah',
    lastName: 'Chen',
    phone: '+14165550101',
    role: ROLES.MANAGER,
    organizationId: org._id,
    isEmailVerified: true,
  });

  locations[0].managerIds = [manager._id];
  await locations[0].save();

  await EmployeeProfile.create({
    userId: manager._id,
    firstName: 'Sarah',
    lastName: 'Chen',
    email: 'manager@shiftboard.demo',
    organizationId: org._id,
    position: 'Store Manager',
    hourlyWage: 22,
    availableLocationIds: [locations[0]._id, locations[1]._id],
  });

  const employees = [
    { firstName: 'John', lastName: 'Smith', email: 'john@demo.com', wage: 16, locs: [0, 1] },
    { firstName: 'Emily', lastName: 'Johnson', email: 'emily@demo.com', wage: 17, locs: [2] },
    { firstName: 'Mike', lastName: 'Williams', email: 'mike@demo.com', wage: 15.5, locs: [0, 1, 2] },
  ];

  for (const emp of employees) {
    const profile = await EmployeeProfile.create({
      organizationId: org._id,
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      position: 'Sales Associate',
      hourlyWage: emp.wage,
      availableLocationIds: emp.locs.map((i) => locations[i]._id),
    });

    await Availability.create({
      employeeId: profile._id,
      organizationId: org._id,
      recurringWeekly: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isAvailable: true },
        { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isAvailable: true },
        { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isAvailable: true },
        { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', isAvailable: true },
        { dayOfWeek: 5, startTime: '09:00', endTime: '17:00', isAvailable: true },
      ],
    });
  }

  console.log('\n✅ Seed data created successfully!\n');
  console.log('Admin accounts (password: Demo1234!):');
  console.log('  Owner:   owner@shiftboard.demo');
  console.log('  Manager: manager@shiftboard.demo');
  console.log('\nStaff (John, Emily, Mike) have no app login — managed by admins only.\n');

  await mongoose.disconnect();
};

seed().catch(console.error);
