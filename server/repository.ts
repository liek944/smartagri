/**
 * Repository interface + two adapters (Mongo, JSON file).
 *
 * This is the seam that eliminates the dual-storage branching from every route handler.
 * Route handlers call repo.xxx() — the active adapter handles persistence.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';
import { User, Product, Order, Message, Conversation } from './models';
import { SEED_PRODUCTS } from './seed-data';

// --- Repository interface ---

export interface Repository {
  // Users
  findUserByEmailOrUsername(identifier: string): Promise<any | null>;
  findUserById(id: string): Promise<any | null>;
  createUser(data: any): Promise<any>;
  upsertUser(id: string, data: any): Promise<any>;

  // Products
  listProducts(): Promise<any[]>;
  createProduct(data: any): Promise<any>;
  updateProduct(id: string, data: any): Promise<any>;
  deleteProduct(id: string): Promise<void>;
  updateProductStock(id: string, soldQty: number): Promise<void>;

  // Orders
  listOrdersByUser(userId: string): Promise<any[]>;
  createOrder(data: any): Promise<any>;
  updateOrderStatus(id: string, status: string): Promise<any>;
  findOrderById(id: string): Promise<any | null>;

  // Conversations
  listConversationsByUser(userId: string): Promise<any[]>;
  findConversation(participants: string[], productId: string): Promise<any | null>;
  createConversation(data: any): Promise<any>;
  updateConversationLastMessage(id: string, message: string): Promise<void>;

  // Messages
  listMessagesByConversation(conversationId: string): Promise<any[]>;
  createMessage(data: any): Promise<any>;

  // Lifecycle
  initialize(): Promise<void>;
}

// --- Mongo adapter ---

export class MongoRepository implements Repository {
  async initialize(): Promise<void> {
    const count = await Product.countDocuments();
    if (count === 0) {
      await Product.insertMany(SEED_PRODUCTS);
      console.log('Seeded initial products');
    }
  }

  async findUserByEmailOrUsername(identifier: string): Promise<any | null> {
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });
    return user ? user.toObject() : null;
  }

  async findUserById(id: string): Promise<any | null> {
    const user = await User.findOne({ id });
    return user ? user.toObject() : null;
  }

  async createUser(data: any): Promise<any> {
    const user = new User(data);
    await user.save();
    return user.toObject();
  }

  async upsertUser(id: string, data: any): Promise<any> {
    const user = await User.findOneAndUpdate({ id }, data, {
      upsert: true,
      new: true,
    });
    return user!.toObject();
  }

  async listProducts(): Promise<any[]> {
    return Product.find();
  }

  async createProduct(data: any): Promise<any> {
    const product = new Product(data);
    await product.save();
    return product;
  }

  async updateProductStock(id: string, soldQty: number): Promise<void> {
    await Product.findByIdAndUpdate(id, {
      $inc: { stock: -soldQty, sold: soldQty },
    });
  }

  async updateProduct(id: string, data: any): Promise<any> {
    const product = await Product.findByIdAndUpdate(id, data, { new: true });
    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    await Product.findByIdAndDelete(id);
  }

  async listOrdersByUser(userId: string): Promise<any[]> {
    return Order.find({
      $or: [
        { userId },
        { 'items.producerId': userId },
      ],
    }).sort({ orderDate: -1 });
  }

  async createOrder(data: any): Promise<any> {
    const order = new Order(data);
    await order.save();
    return order;
  }

  async findOrderById(id: string): Promise<any | null> {
    return Order.findById(id);
  }

  async updateOrderStatus(id: string, status: string): Promise<any> {
    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });
    return order;
  }

  async listConversationsByUser(userId: string): Promise<any[]> {
    return Conversation.find({ participants: userId });
  }

  async findConversation(participants: string[], productId: string): Promise<any | null> {
    return Conversation.findOne({
      participants: { $all: participants },
      productId,
    });
  }

  async createConversation(data: any): Promise<any> {
    const conv = new Conversation(data);
    await conv.save();
    return conv;
  }

  async updateConversationLastMessage(id: string, message: string): Promise<void> {
    await Conversation.findByIdAndUpdate(id, {
      lastMessage: message,
      lastMessageTimestamp: new Date(),
    });
  }

  async listMessagesByConversation(conversationId: string): Promise<any[]> {
    return Message.find({ conversationId }).sort({ timestamp: 1 });
  }

  async createMessage(data: any): Promise<any> {
    const message = new Message(data);
    await message.save();
    return message;
  }
}

// --- JSON file adapter ---

interface MemoryDB {
  users: any[];
  products: any[];
  orders: any[];
  conversations: any[];
  messages: any[];
}

export class JsonFileRepository implements Repository {
  private db: MemoryDB = {
    users: [],
    products: [],
    orders: [],
    conversations: [],
    messages: [],
  };

  constructor(private filePath: string) {}

  async initialize(): Promise<void> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(data);
      this.db = { ...this.db, ...parsed };
      console.log('JSON DB loaded successfully');
    } catch {
      console.log('No JSON DB found, starting fresh');
    }

    // Seed products if empty
    if (this.db.products.length === 0) {
      this.db.products = SEED_PRODUCTS.map((p, i) => ({
        ...p,
        _id: `m-${i + 1}`,
      }));
    }

    // Seed a test user if empty
    if (this.db.users.length === 0) {
      const hashedPassword = await bcrypt.hash('password', 10);
      this.db.users.push({
        id: 'USR-test',
        email: 'test@test.com',
        password: hashedPassword,
        fullName: 'Test User',
        username: 'test',
        role: 'buyer',
        location: 'Roxas',
        joinedDate: new Date().toLocaleDateString(),
      });
    }

    await this.save();
  }

  private async save(): Promise<void> {
    try {
      await fs.writeFile(this.filePath, JSON.stringify(this.db, null, 2));
    } catch (err) {
      console.error('Failed to save JSON DB:', err);
    }
  }

  async findUserByEmailOrUsername(identifier: string): Promise<any | null> {
    const lower = identifier.toLowerCase();
    return (
      this.db.users.find(
        (u) =>
          u.email.toLowerCase() === lower ||
          (u.username && u.username.toLowerCase() === lower)
      ) || null
    );
  }

  async findUserById(id: string): Promise<any | null> {
    return this.db.users.find((u) => u.id === id) || null;
  }

  async createUser(data: any): Promise<any> {
    this.db.users.push(data);
    await this.save();
    return { ...data };
  }

  async upsertUser(id: string, data: any): Promise<any> {
    const index = this.db.users.findIndex((u) => u.id === id);
    if (index !== -1) {
      this.db.users[index] = { ...this.db.users[index], ...data };
      await this.save();
      return { ...this.db.users[index] };
    }
    this.db.users.push(data);
    await this.save();
    return { ...data };
  }

  async listProducts(): Promise<any[]> {
    return this.db.products;
  }

  async createProduct(data: any): Promise<any> {
    const newProduct = { ...data, _id: `mem-p-${Date.now()}` };
    this.db.products.push(newProduct);
    await this.save();
    return newProduct;
  }

  async updateProductStock(id: string, soldQty: number): Promise<void> {
    const product = this.db.products.find((p) => p._id === id);
    if (product) {
      product.stock -= soldQty;
      product.sold += soldQty;
      await this.save();
    }
  }

  async updateProduct(id: string, data: any): Promise<any> {
    const index = this.db.products.findIndex((p) => p._id === id || p.id === id);
    if (index !== -1) {
      this.db.products[index] = { ...this.db.products[index], ...data };
      await this.save();
      return this.db.products[index];
    }
    return null;
  }

  async deleteProduct(id: string): Promise<void> {
    this.db.products = this.db.products.filter((p) => p._id !== id && p.id !== id);
    await this.save();
  }

  async listOrdersByUser(userId: string): Promise<any[]> {
    return this.db.orders.filter(
      (o) =>
        o.userId === userId ||
        o.items.some((i: any) => i.producerId === userId)
    );
  }

  async createOrder(data: any): Promise<any> {
    const newOrder = { ...data, _id: `ord-${Date.now()}` };
    this.db.orders.push(newOrder);
    await this.save();
    return newOrder;
  }

  async findOrderById(id: string): Promise<any | null> {
    return this.db.orders.find((o) => o._id === id || o.id === id) || null;
  }

  async updateOrderStatus(id: string, status: string): Promise<any> {
    const order = this.db.orders.find((o) => o._id === id || o.id === id);
    if (order) {
      order.status = status;
      await this.save();
      return { ...order };
    }
    return null;
  }

  async listConversationsByUser(userId: string): Promise<any[]> {
    return this.db.conversations.filter((c) =>
      c.participants.includes(userId)
    );
  }

  async findConversation(
    participants: string[],
    productId: string
  ): Promise<any | null> {
    return (
      this.db.conversations.find(
        (c) =>
          c.participants.every((p: string) => participants.includes(p)) &&
          c.productId === productId
      ) || null
    );
  }

  async createConversation(data: any): Promise<any> {
    const conv = { ...data, _id: `conv-${Date.now()}` };
    this.db.conversations.push(conv);
    await this.save();
    return conv;
  }

  async updateConversationLastMessage(
    id: string,
    message: string
  ): Promise<void> {
    const conv = this.db.conversations.find((c) => c._id === id);
    if (conv) {
      conv.lastMessage = message;
      conv.lastMessageTimestamp = new Date();
      await this.save();
    }
  }

  async listMessagesByConversation(conversationId: string): Promise<any[]> {
    return this.db.messages.filter(
      (m) => m.conversationId === conversationId
    );
  }

  async createMessage(data: any): Promise<any> {
    const message = { ...data, _id: `msg-${Date.now()}` };
    this.db.messages.push(message);
    await this.save();
    return message;
  }
}

// --- Factory ---

export type RepoStatus = {
  adapter: 'mongo' | 'json';
  bootTime: string;
  mongoUri: boolean; // whether MONGODB_URI was provided (not the value)
  connectionAttempts: number;
};

export function createRepository(mongoUri: string | undefined, dbFilePath: string): {
  repo: Repository;
  connectMongo: () => Promise<boolean>;
  status: RepoStatus;
} {
  const mongoRepo = new MongoRepository();
  const jsonRepo = new JsonFileRepository(dbFilePath);

  let activeRepo: Repository = jsonRepo;
  const status: RepoStatus = {
    adapter: 'json',
    bootTime: new Date().toISOString(),
    mongoUri: !!mongoUri,
    connectionAttempts: 0,
  };

  return {
    get repo() {
      return activeRepo;
    },
    status,
    connectMongo: async () => {
      if (!mongoUri) {
        console.warn('[REPO] MONGODB_URI not set. Using JSON file storage (development mode).');
        activeRepo = jsonRepo;
        status.adapter = 'json';
        await jsonRepo.initialize();
        return false;
      }

      // Retry with increasing timeouts: 10s, 20s, 30s
      const attempts = [10_000, 20_000, 30_000];
      for (let i = 0; i < attempts.length; i++) {
        status.connectionAttempts = i + 1;
        const timeout = attempts[i];
        console.log(`[REPO] MongoDB connection attempt ${i + 1}/${attempts.length} (timeout: ${timeout / 1000}s)...`);
        try {
          await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: timeout });
          console.log(`[REPO] ✅ Connected to MongoDB on attempt ${i + 1}`);
          activeRepo = mongoRepo;
          status.adapter = 'mongo';
          await mongoRepo.initialize();
          return true;
        } catch (err) {
          console.error(`[REPO] ❌ MongoDB attempt ${i + 1} failed:`, err instanceof Error ? err.message : err);
          // Disconnect any partial connection before retrying
          try { await mongoose.disconnect(); } catch { /* ignore */ }
        }
      }

      // All retries exhausted. MONGODB_URI was set — user WANTS MongoDB.
      // Falling back to JSON on an ephemeral filesystem is worse than crashing.
      console.error('[REPO] ===================================================');
      console.error('[REPO] FATAL: MongoDB connection failed after all retries.');
      console.error('[REPO] MONGODB_URI is set — refusing to fall back to JSON.');
      console.error('[REPO] Fix your MongoDB connection and redeploy.');
      console.error('[REPO] ===================================================');
      process.exit(1);
    },
  };
}
