import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import fs from 'fs/promises';

dotenv.config();

const PORT = 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_FILE = path.join(process.cwd(), 'db.json');

// --- Mongoose Schemas ---
const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: String,
  fullName: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: String,
  location: String,
  joinedDate: String,
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

const User = mongoose.model('User', UserSchema);
const Product = mongoose.model('Product', ProductSchema);
const Order = mongoose.model('Order', OrderSchema);
const Message = mongoose.model('Message', MessageSchema);
const Conversation = mongoose.model('Conversation', ConversationSchema);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  // --- Middleware ---
  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' 
    });
  });

  // --- MongoDB Connection ---
  if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Fail faster if can't connect
    })
      .then(async () => {
        console.log('Connected to MongoDB');
        // Seed initial products if empty
        const count = await Product.countDocuments();
        if (count === 0) {
          const initialProducts = [
            { name: "Organic Rice (5kg)", price: 250, stock: 50, sold: 0, category: "agriculture", producer: "Juan Dela Cruz", producerId: "mock-1", image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400", description: "Fresh organic rice from local farms" },
            { name: "Base", price: 450, stock: 30, sold: 0, category: "craft", producer: "Lola Artisans", producerId: "mock-2", image: "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400", description: "Handcrafted traditional base" },
            { name: "Fresh Coconut", price: 50, stock: 100, sold: 0, category: "agriculture", producer: "Juan Dela Cruz", producerId: "mock-1", image: "https://images.unsplash.com/photo-1550581190-81f0d366d45a?w=400", description: "Sweet and refreshing young coconut" },
            { name: "Wooden Sculpture", price: 1200, stock: 15, sold: 0, category: "craft", producer: "Mindoro Crafts", producerId: "mock-3", image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=400", description: "Intricate wooden carving" },
            { name: "Organic Lettuce", price: 80, stock: 75, sold: 0, category: "agriculture", producer: "Green Farms", producerId: "mock-4", image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400", description: "Crispy and fresh pesticide-free lettuce" },
            { name: "Fresh Honey", price: 350, stock: 40, sold: 0, category: "agriculture", producer: "Beekeeper Co", producerId: "mock-5", image: "https://images.unsplash.com/photo-1587049352846-4a222e773a08?w=400", description: "Pure wild honey from the mountains" },
            { name: "Calamansi", price: 50, stock: 105, sold: 0, category: "agriculture", producer: "Dexcem Gutierrez", producerId: "mock-6", image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400", description: "Tangy local citrus" },
            { name: "Lansones", price: 150, stock: 60, sold: 0, category: "agriculture", producer: "Roxas Orchard", producerId: "mock-7", image: "https://images.unsplash.com/photo-1621501438991-da55928f629c?w=400", description: "Sweet and juicy local lansones" }
          ];
          await Product.insertMany(initialProducts);
          console.log('Seeded initial products');
        }
      })
      .catch(err => console.error('MongoDB connection error:', err));
  } else {
    console.warn('MONGODB_URI not found. Please add it to your secrets.');
  }

  // --- JSON DB Fallback Storage ---
  let memoryDB = {
    users: [] as any[],
    products: [
      { _id: "m-1", name: "Organic Rice (5kg)", price: 250, stock: 50, sold: 0, category: "agriculture", producer: "Juan Dela Cruz", producerId: "mock-1", image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400", description: "Fresh organic rice" },
      { _id: "m-2", name: "Artisan Basket", price: 450, stock: 30, sold: 0, category: "craft", producer: "Lola Artisans", producerId: "mock-2", image: "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400", description: "Handcrafted traditional basket" },
      { _id: "m-3", name: "Calamansi", price: 50, stock: 105, sold: 0, category: "agriculture", producer: "Dexcem Gutierrez", producerId: "mock-6", image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400", description: "Tangy local citrus" },
      { _id: "m-4", name: "Lansones", price: 150, stock: 60, sold: 0, category: "agriculture", producer: "Roxas Orchard", producerId: "mock-7", image: "https://images.unsplash.com/photo-1621501438991-da55928f629c?w=400", description: "Sweet and juicy local lansones" }
    ] as any[],
    orders: [] as any[],
    conversations: [] as any[],
    messages: [] as any[]
  };

  async function loadDB() {
    try {
      const data = await fs.readFile(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      memoryDB = { ...memoryDB, ...parsed };
      console.log('JSON DB loaded successfully');
    } catch (err) {
      console.log('No JSON DB found, starting fresh');
    }
    
    // Seed a test user if empty
    if (memoryDB.users.length === 0) {
      const hashedPassword = await bcrypt.hash('password', 10);
      memoryDB.users.push({
        id: 'USR-test',
        email: 'test@test.com',
        password: hashedPassword,
        fullName: 'Test User',
        username: 'test',
        role: 'buyer',
        location: 'Roxas',
        joinedDate: new Date().toLocaleDateString()
      });
    }
    await saveDB();
  }

  async function saveDB() {
    try {
      await fs.writeFile(DB_FILE, JSON.stringify(memoryDB, null, 2));
    } catch (err) {
      console.error('Failed to save JSON DB:', err);
    }
  }

  await loadDB();

  // --- API Routes ---
  app.get('/api/products', async (req, res) => {
    try {
      if (mongoose.connection.readyState === 1) {
        const products = await Product.find();
        return res.json(products);
      }
      res.json(memoryDB.products);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  app.post('/api/products', async (req, res) => {
    try {
      if (mongoose.connection.readyState === 1) {
        const product = new Product(req.body);
        await product.save();
        return res.json(product);
      }
      const newProduct = { ...req.body, _id: `mem-p-${Date.now()}` };
      memoryDB.products.push(newProduct);
      await saveDB();
      res.json(newProduct);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create product' });
    }
  });

  // Auth Routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, username, password, fullName, role } = req.body;
      
      const findUser = async (eOrU: string) => {
        if (mongoose.connection.readyState === 1) return await User.findOne({ $or: [{ email: eOrU }, { username: eOrU }] });
        return memoryDB.users.find(u => u.email.toLowerCase() === eOrU.toLowerCase() || (u.username && u.username.toLowerCase() === eOrU.toLowerCase()));
      };

      if (await findUser(email)) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      if (username && await findUser(username)) {
        return res.status(400).json({ error: 'Username already taken' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const id = `USR-${Date.now()}`;
      
      const userData = {
        id,
        email,
        username: username || email.split('@')[0],
        password: hashedPassword,
        fullName,
        role: role || 'buyer',
        location: 'Roxas',
        joinedDate: new Date().toLocaleDateString()
      };

      if (mongoose.connection.readyState === 1) {
        const user = new User(userData);
        await user.save();
        const userResponse = user.toObject();
        delete userResponse.password;
        return res.json(userResponse);
      }
      
      memoryDB.users.push(userData);
      await saveDB();
      const userResponse = { ...userData };
      delete (userResponse as any).password;
      res.json(userResponse);
    } catch (err) {
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body; // email field now potentially contains username
      console.log('Login attempt:', email);
      
      let user: any;
      if (mongoose.connection.readyState === 1) {
        user = await User.findOne({ $or: [{ email: email }, { username: email }] });
      } else {
        user = memoryDB.users.find(u => 
          u.email.toLowerCase() === email.toLowerCase() || 
          (u.username && u.username.toLowerCase() === email.toLowerCase())
        );
      }
      
      if (!user) {
        console.log('Account not found:', email);
        return res.status(400).json({ error: 'Invalid identifier or password' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        console.log('Password mismatch for:', email);
        return res.status(400).json({ error: 'Invalid email or password' });
      }

      console.log('Login successful:', email);
      const userResponse = mongoose.connection.readyState === 1 ? user.toObject() : { ...user };
      delete userResponse.password;
      res.json(userResponse);
    } catch (err) {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.post('/api/users', async (req, res) => {
    try {
      if (mongoose.connection.readyState === 1) {
        const user = await User.findOneAndUpdate(
          { id: req.body.id },
          req.body,
          { upsert: true, new: true }
        );
        const userResponse = user.toObject();
        delete userResponse.password;
        return res.json(userResponse);
      }
      
      const index = memoryDB.users.findIndex(u => u.id === req.body.id);
      if (index !== -1) {
        memoryDB.users[index] = { ...memoryDB.users[index], ...req.body };
        await saveDB();
        const userResponse = { ...memoryDB.users[index] };
        delete userResponse.password;
        res.json(userResponse);
      } else {
        const newUser = { ...req.body };
        memoryDB.users.push(newUser);
        await saveDB();
        const userResponse = { ...newUser };
        delete userResponse.password;
        res.json(userResponse);
      }
    } catch (err) {
      res.status(500).json({ error: 'Failed to save user' });
    }
  });

  app.get('/api/users/:id', async (req, res) => {
    try {
      let user: any;
      if (mongoose.connection.readyState === 1) {
        user = await User.findOne({ id: req.params.id });
      } else {
        user = memoryDB.users.find(u => u.id === req.params.id);
      }

      if (user) {
        const userResponse = mongoose.connection.readyState === 1 ? user.toObject() : { ...user };
        delete userResponse.password;
        res.json(userResponse);
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  app.get('/api/orders/:userId', async (req, res) => {
    try {
      if (mongoose.connection.readyState === 1) {
        const orders = await Order.find({ 
          $or: [
            { userId: req.params.userId },
            { 'items.producerId': req.params.userId }
          ]
        }).sort({ orderDate: -1 });
        return res.json(orders);
      }
      const orders = memoryDB.orders.filter(o => 
        o.userId === req.params.userId || o.items.some((i: any) => i.producerId === req.params.userId)
      );
      res.json(orders);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  app.post('/api/orders', async (req, res) => {
    try {
      if (mongoose.connection.readyState === 1) {
        const order = new Order(req.body);
        await order.save();
        for (const item of req.body.items) {
          await Product.findByIdAndUpdate(item.id, { $inc: { stock: -item.quantity, sold: item.quantity } });
        }
        return res.json(order);
      }
      const newOrder = { ...req.body, _id: `ord-${Date.now()}` };
      memoryDB.orders.push(newOrder);
      // Update stocks
      for (const item of req.body.items) {
        const p = memoryDB.products.find(p => p._id === item.id);
        if (p) {
          p.stock -= item.quantity;
          p.sold += item.quantity;
        }
      }
      await saveDB();
      res.json(newOrder);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create order' });
    }
  });

  app.get('/api/conversations/:userId', async (req, res) => {
    try {
      if (mongoose.connection.readyState === 1) {
        const convs = await Conversation.find({ participants: req.params.userId });
        return res.json(convs);
      }
      const convs = memoryDB.conversations.filter(c => c.participants.includes(req.params.userId));
      res.json(convs);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  });

  app.post('/api/conversations', async (req, res) => {
    try {
      const { participants, participantNames, productId, productName } = req.body;
      
      if (mongoose.connection.readyState === 1) {
        let conversation = await Conversation.findOne({ participants: { $all: participants }, productId });
        if (!conversation) {
          conversation = new Conversation({ 
            participants, 
            participantNames, 
            productId, 
            productName, 
            lastMessage: 'Chat started', 
            lastMessageTimestamp: new Date() 
          });
          await conversation.save();
          
          // Add a welcome message
          const welcomeMsg = new Message({
            conversationId: conversation._id,
            senderId: participants[1], // Assuming index 1 is the seller
            senderName: participantNames[participants[1]] || 'Seller',
            text: `Hi! Thanks for checking out my ${productName}. Do you have any questions?`,
            timestamp: new Date()
          });
          await welcomeMsg.save();
        }
        return res.json(conversation);
      }

      let conversation = memoryDB.conversations.find(c => 
        c.participants.every((p: any) => participants.includes(p)) && c.productId === productId
      );

      if (!conversation) {
        conversation = {
          _id: `conv-${Date.now()}`,
          participants,
          participantNames,
          productId,
          productName,
          lastMessage: 'Welcome! How can I help you with this product?',
          lastMessageTimestamp: new Date()
        };
        memoryDB.conversations.push(conversation);
        
        // Add a bot message
        const botMsg = {
          _id: `msg-bot-${Date.now()}`,
          conversationId: conversation._id,
          senderId: participants.find(p => p !== participants[0]) || 'bot',
          senderName: participantNames[participants.find(p => p !== participants[0]) || ''] || 'Seller Bot',
          text: `Hello! I am ${participantNames[participants.find(p => p !== participants[0]) || ''] || 'the seller'}. How can I help you today?`,
          timestamp: new Date()
        };
        memoryDB.messages.push(botMsg);
        await saveDB();
      }
      res.json(conversation);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  });

  app.get('/api/messages/:conversationId', async (req, res) => {
    try {
      if (mongoose.connection.readyState === 1) {
        const messages = await Message.find({ conversationId: req.params.conversationId }).sort({ timestamp: 1 });
        return res.json(messages);
      }
      const messages = memoryDB.messages.filter(m => m.conversationId === req.params.conversationId);
      res.json(messages);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  // --- Socket.io for Real-time Chat ---
  io.on('connection', (socket) => {
    socket.on('join_conversation', (conversationId) => {
      socket.join(conversationId);
    });

    socket.on('send_message', async (data) => {
      const { conversationId, senderId, senderName, text, audio } = data;
      const messageData = {
        conversationId,
        senderId,
        senderName,
        text,
        audio,
        timestamp: new Date()
      };

      if (mongoose.connection.readyState === 1) {
        const message = new Message(messageData);
        await message.save();
        await Conversation.findByIdAndUpdate(conversationId, { lastMessage: text, lastMessageTimestamp: new Date() });
        io.to(conversationId).emit('new_message', message);
      } else {
        const message = { ...messageData, _id: `msg-${Date.now()}` };
        memoryDB.messages.push(message);
        const conv = memoryDB.conversations.find(c => c._id === conversationId);
        if (conv) {
          conv.lastMessage = text;
          conv.lastMessageTimestamp = new Date();
        }
        await saveDB();
        io.to(conversationId).emit('new_message', message);
      }
    });
  });

  // --- Vite Dev Server Integration ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
