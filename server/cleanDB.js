import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config({ path: path.join(__dirname, '.env') });

const cleanDatabase = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not set in environment.');
    process.exit(1);
  }

  console.log('🔄 Connecting to MongoDB to perform database cleanup...');
  try {
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB.');

    console.log('🔄 Dropping database streamvibe...');
    await mongoose.connection.db.dropDatabase();
    console.log('✅ Database streamvibe dropped successfully! All previous data cleared.');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
    process.exit(1);
  }
};

cleanDatabase();
