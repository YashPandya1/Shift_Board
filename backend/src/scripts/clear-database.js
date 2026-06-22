import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const run = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shiftboard';
  await mongoose.connect(uri);

  const dbName = mongoose.connection.db.databaseName;
  console.log(`\nConnected to database: ${dbName}`);
  console.log('Deleting all data...\n');

  await mongoose.connection.dropDatabase();

  console.log(`Database "${dbName}" has been completely cleared.\n`);
  console.log('You can now register a fresh account at http://localhost:4200/auth/register\n');

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
