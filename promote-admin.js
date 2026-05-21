import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const userSchema = new mongoose.Schema({
  email: String,
  role: String,
}, { strict: false });

const User = mongoose.model('User', userSchema);

async function promote() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartagri');
    const res = await User.findOneAndUpdate({ email: 'lieksucin@gmail.com' }, { role: 'admin' }, { new: true });
    console.log("Successfully updated user to admin:", res?.email);
    process.exit(0);
  } catch (err) {
    console.error("Failed:", err);
    process.exit(1);
  }
}

promote();
