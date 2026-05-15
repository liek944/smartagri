/**
 * MongoDB Atlas full connectivity test.
 * Inserts test data into ALL collections in the "smartagri" database,
 * reads them back, and reports what's in each collection.
 *
 * NOTE: Does NOT delete the test data — so you can verify in Atlas UI.
 * Run the cleanup script (test-mongo-cleanup.mjs) when done.
 */
import mongoose from 'mongoose';

import 'dotenv/config';

// ── Connection string targets the "smartagri" database ──────────────
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables. Please set it or create a .env file.');
  process.exit(1);
}

// ── Schemas (mirroring server/models.ts) ────────────────────────────
const User = mongoose.model('User', new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: String,
  fullName: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: String,
  location: String,
  joinedDate: String,
}));

const Product = mongoose.model('Product', new mongoose.Schema({
  name: String,
  price: Number,
  stock: Number,
  sold: { type: Number, default: 0 },
  category: String,
  producer: String,
  producerId: String,
  image: String,
  description: String,
}));

const Order = mongoose.model('Order', new mongoose.Schema({
  userId: String,
  userName: String,
  items: Array,
  subtotal: Number,
  deliveryFee: Number,
  total: Number,
  paymentMethod: String,
  status: String,
  orderDate: String,
}));

const Message = mongoose.model('Message', new mongoose.Schema({
  conversationId: String,
  senderId: String,
  senderName: String,
  text: String,
  audio: String,
  timestamp: { type: Date, default: Date.now },
}));

const Conversation = mongoose.model('Conversation', new mongoose.Schema({
  participants: [String],
  participantNames: Map,
  lastMessage: String,
  lastMessageTimestamp: Date,
  productId: String,
  productName: String,
}));

// ── Test data ───────────────────────────────────────────────────────
const TEST_MARKER = '__TEST_DEBUG__';
const now = new Date().toISOString();

const testUser = {
  id: `${TEST_MARKER}_user_001`,
  username: 'test_farmer',
  fullName: 'Juan Dela Cruz (TEST)',
  email: `test_${Date.now()}@example.com`,
  password: 'hashed_test_password',
  role: 'Farmer',
  location: 'Barangay Test',
  joinedDate: now,
};

const testProduct = {
  name: '🧪 Test Organic Tomatoes',
  price: 45.00,
  stock: 100,
  sold: 5,
  category: 'Vegetables',
  producer: 'Juan Dela Cruz (TEST)',
  producerId: `${TEST_MARKER}_user_001`,
  image: '',
  description: `${TEST_MARKER} — Fresh organic tomatoes for debugging`,
};

const testOrder = {
  userId: `${TEST_MARKER}_user_001`,
  userName: 'Juan Dela Cruz (TEST)',
  items: [
    { productName: '🧪 Test Organic Tomatoes', quantity: 3, price: 45.00 },
  ],
  subtotal: 135.00,
  deliveryFee: 20.00,
  total: 155.00,
  paymentMethod: 'Cash on Delivery',
  status: 'Pending',
  orderDate: now,
};

const testConversation = {
  participants: [`${TEST_MARKER}_user_001`, `${TEST_MARKER}_user_002`],
  participantNames: new Map([
    [`${TEST_MARKER}_user_001`, 'Juan (TEST)'],
    [`${TEST_MARKER}_user_002`, 'Maria (TEST)'],
  ]),
  lastMessage: 'Hello, is this still available?',
  lastMessageTimestamp: new Date(),
  productId: 'test_product_001',
  productName: '🧪 Test Organic Tomatoes',
};

const testMessage = {
  conversationId: null, // will be set after conversation is created
  senderId: `${TEST_MARKER}_user_001`,
  senderName: 'Juan (TEST)',
  text: 'Hello, is this still available?',
  audio: '',
  timestamp: new Date(),
};

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log('⏳ Connecting to MongoDB Atlas (smartagri database)...');
  await mongoose.connect(MONGODB_URI);
  
  // Confirm which database we're on
  const dbName = mongoose.connection.db.databaseName;
  console.log(`✅ Connected to database: "${dbName}"\n`);

  // ── 1. Insert User ────────────────────────────────────────────
  console.log('━━━ 1/5: USERS ━━━');
  const user = await User.create(testUser);
  console.log(`   ✅ Inserted user: ${user.fullName} (role: ${user.role})`);
  console.log(`   _id: ${user._id}`);

  // ── 2. Insert Product ─────────────────────────────────────────
  console.log('\n━━━ 2/5: PRODUCTS ━━━');
  const product = await Product.create(testProduct);
  console.log(`   ✅ Inserted product: ${product.name} — ₱${product.price}`);
  console.log(`   _id: ${product._id}`);

  // ── 3. Insert Order ───────────────────────────────────────────
  console.log('\n━━━ 3/5: ORDERS ━━━');
  const order = await Order.create(testOrder);
  console.log(`   ✅ Inserted order: ₱${order.total} (${order.status})`);
  console.log(`   _id: ${order._id}`);

  // ── 4. Insert Conversation ────────────────────────────────────
  console.log('\n━━━ 4/5: CONVERSATIONS ━━━');
  const conversation = await Conversation.create(testConversation);
  console.log(`   ✅ Inserted conversation between ${conversation.participants.join(' & ')}`);
  console.log(`   _id: ${conversation._id}`);

  // ── 5. Insert Message (linked to conversation) ────────────────
  console.log('\n━━━ 5/5: MESSAGES ━━━');
  testMessage.conversationId = conversation._id.toString();
  const message = await Message.create(testMessage);
  console.log(`   ✅ Inserted message: "${message.text}"`);
  console.log(`   _id: ${message._id}`);

  // ── Summary: count all documents in each collection ───────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 COLLECTION DOCUMENT COUNTS (smartagri database):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const counts = {
    users:         await User.countDocuments(),
    products:      await Product.countDocuments(),
    orders:        await Order.countDocuments(),
    conversations: await Conversation.countDocuments(),
    messages:      await Message.countDocuments(),
  };

  for (const [name, count] of Object.entries(counts)) {
    console.log(`   ${name.padEnd(18)} ${count} document(s)`);
  }

  // ── List ALL collections (including any we didn't model) ──────
  const allCollections = await mongoose.connection.db.listCollections().toArray();
  console.log(`\n📂 All collections in "${dbName}":`);
  allCollections.forEach((c) => console.log(`   - ${c.name}`));

  console.log('\n✅ All test data inserted! Go check Atlas UI now.');
  console.log('   Atlas → Cluster0 → Browse Collections → smartagri');
  console.log('   (Click the 🔄 refresh icon if you don\'t see it yet)\n');
  console.log('💡 To clean up test data later, run:');
  console.log('   node scratch/test-mongo-cleanup.mjs\n');

  await mongoose.disconnect();
  console.log('🔌 Disconnected.');
}

main().catch((err) => {
  console.error('❌ ERROR:', err.message);
  console.error(err);
  mongoose.disconnect();
  process.exit(1);
});
