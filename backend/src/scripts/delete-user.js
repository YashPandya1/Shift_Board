import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User, Organization, EmployeeProfile } from '../models/index.js';

dotenv.config();

const email = process.argv[2]?.toLowerCase();

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shiftboard');

  if (!email) {
    console.log('\nRegistered users:\n');
    const users = await User.find().select('email role firstName lastName createdAt').sort({ createdAt: -1 });
    if (!users.length) {
      console.log('  (none)');
    } else {
      users.forEach((u) => {
        console.log(`  ${u.email}  [${u.role}]  ${u.firstName} ${u.lastName}`);
      });
    }
    console.log('\nTo remove a user so you can re-register:');
    console.log('  npm run user:delete -- your@email.com\n');
    await mongoose.disconnect();
    return;
  }

  const user = await User.findOne({ email });
  if (!user) {
    console.log(`\nNo user found with email: ${email}\n`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const org = user.organizationId
    ? await Organization.findById(user.organizationId)
    : null;

  console.log(`\nDeleting user: ${user.email} (${user.role})`);
  if (org) console.log(`  Organization: ${org.name}`);

  await EmployeeProfile.deleteMany({ userId: user._id });
  await User.deleteOne({ _id: user._id });

  if (org && org.ownerId?.toString() === user._id.toString()) {
    await Organization.deleteOne({ _id: org._id });
    console.log('  (owner organization also removed)');
  }

  console.log('\nDone. You can now register with this email.\n');
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
