/**
 * Cleanup script — removes all test data inserted by test-mongo.mjs.
 * Identifies test docs by the __TEST_DEBUG__ marker.
 */
import mongoose from 'mongoose';

import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables. Please set it or create a .env file.');
  process.exit(1);
}

const TEST_MARKER = '__TEST_DEBUG__';

const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
const Message = mongoose.model('Message', new mongoose.Schema({}, { strict: false }));
const Conversation = mongoose.model('Conversation', new mongoose.Schema({}, { strict: false }));

async function main() {
  console.log('⏳ Connecting...');
  await mongoose.connect(MONGODB_URI);
  console.log(`✅ Connected to "${mongoose.connection.db.databaseName}"\n`);

  const results = {
    users:         await User.deleteMany({ id: { $regex: TEST_MARKER } }),
    products:      await Product.deleteMany({ producerId: { $regex: TEST_MARKER } }),
    orders:        await Order.deleteMany({ userId: { $regex: TEST_MARKER } }),
    messages:      await Message.deleteMany({ senderId: { $regex: TEST_MARKER } }),
    conversations: await Conversation.deleteMany({ participants: { $regex: TEST_MARKER } }),
  };

  console.log('🗑️  Cleanup results:');
  for (const [name, result] of Object.entries(results)) {
    console.log(`   ${name.padEnd(18)} ${result.deletedCount} deleted`);
  }

  await mongoose.disconnect();
  console.log('\n🔌 Done.');
}

main().catch((err) => {
  console.error('❌', err.message);
  mongoose.disconnect();
  process.exit(1);
});
