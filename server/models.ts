/**
 * Mongoose schema definitions — extracted from server.ts.
 * Single source of truth for document shapes.
 */

import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: String,
  fullName: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: String,
  location: String,
  joinedDate: String,
  deliveryLocation: String,
  phoneNumber: String,
});

const ProductSchema = new mongoose.Schema({
  name: String,
  price: Number,
  stock: Number,
  sold: { type: Number, default: 0 },
  category: String,
  producer: String,
  producerId: String,
  image: String,
  description: String,
});

const OrderSchema = new mongoose.Schema({
  userId: String,
  userName: String,
  items: Array,
  subtotal: Number,
  deliveryFee: Number,
  total: Number,
  paymentMethod: String,
  status: String,
  orderDate: String,
  deliveryLocation: String,
  phoneNumber: String,
});

const MessageSchema = new mongoose.Schema({
  conversationId: String,
  senderId: String,
  senderName: String,
  text: String,
  audio: String,
  timestamp: { type: Date, default: Date.now },
});

const ConversationSchema = new mongoose.Schema({
  participants: [String],
  participantNames: Map,
  lastMessage: String,
  lastMessageTimestamp: Date,
  productId: String,
  productName: String,
});

export const User = mongoose.model('User', UserSchema);
export const Product = mongoose.model('Product', ProductSchema);
export const Order = mongoose.model('Order', OrderSchema);
export const Message = mongoose.model('Message', MessageSchema);
export const Conversation = mongoose.model('Conversation', ConversationSchema);
