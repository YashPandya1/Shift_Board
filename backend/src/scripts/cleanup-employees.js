import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/index.js';
import { ROLES } from '../config/constants.js';

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shiftboard');

  const employees = await User.find({ role: ROLES.EMPLOYEE });
  if (!employees.length) {
    console.log('\nNo employee login accounts found.\n');
  } else {
    console.log(`\nRemoving ${employees.length} employee login account(s) (staff should not log in):\n`);
    for (const u of employees) {
      console.log(`  - ${u.email}`);
    }
    await User.deleteMany({ role: ROLES.EMPLOYEE });
    console.log('\nDone.\n');
  }

  const admins = await User.find({ role: { $in: [ROLES.OWNER, ROLES.MANAGER] } })
    .select('email role firstName lastName');
  console.log('Admin accounts you can log in with:\n');
  admins.forEach((u) => console.log(`  ${u.email}  [${u.role}]  ${u.firstName} ${u.lastName}`));
  console.log('');

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
