import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { createRepository } from './server/repository';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const DB_FILE = path.join(process.cwd(), 'db.json');

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: '*' } });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // --- Repository setup ---
  const { repo, connectMongo, status } = createRepository(process.env.MONGODB_URI, DB_FILE);
  console.log(`[BOOT] MONGODB_URI provided: ${status.mongoUri}`);
  console.log(`[BOOT] PORT: ${PORT}`);
  await connectMongo();
  console.log(`[BOOT] Active adapter: ${status.adapter}`);
  console.log(`[BOOT] Connection attempts: ${status.connectionAttempts}`);

  // --- Health check ---
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', adapter: status.adapter });
  });

  // --- Debug/diagnostic endpoint ---
  app.get('/api/debug/status', (_req, res) => {
    res.json({
      adapter: status.adapter,
      bootTime: status.bootTime,
      mongoUriProvided: status.mongoUri,
      connectionAttempts: status.connectionAttempts,
      mongooseState: mongoose.connection.readyState,
      uptime: process.uptime(),
    });
  });

  // --- Product routes ---
  app.get('/api/products', async (_req, res) => {
    try {
      res.json(await repo.listProducts());
    } catch {
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  app.post('/api/products', async (req, res) => {
    try {
      res.json(await repo.createProduct(req.body));
    } catch {
      res.status(500).json({ error: 'Failed to create product' });
    }
  });

  app.put('/api/products/:id', async (req, res) => {
    try {
      res.json(await repo.updateProduct(req.params.id, req.body));
    } catch {
      res.status(500).json({ error: 'Failed to update product' });
    }
  });

  app.delete('/api/products/:id', async (req, res) => {
    try {
      await repo.deleteProduct(req.params.id);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Failed to delete product' });
    }
  });

  // --- Auth routes ---
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, username, password, fullName, role } = req.body;

      if (await repo.findUserByEmailOrUsername(email)) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      if (username && await repo.findUserByEmailOrUsername(username)) {
        return res.status(400).json({ error: 'Username already taken' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userData = {
        id: `USR-${Date.now()}`,
        email,
        username: username || email.split('@')[0],
        password: hashedPassword,
        fullName,
        role: role || 'buyer',
        location: 'Roxas',
        joinedDate: new Date().toLocaleDateString(),
      };

      const saved = await repo.createUser(userData);
      const userResponse = { ...saved };
      delete userResponse.password;
      res.json(userResponse);
    } catch {
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log('Login attempt:', email);

      const user = await repo.findUserByEmailOrUsername(email);
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
      const userResponse = { ...user };
      delete userResponse.password;
      res.json(userResponse);
    } catch {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // --- User routes ---
  app.post('/api/users', async (req, res) => {
    try {
      const saved = await repo.upsertUser(req.body.id, req.body);
      const userResponse = { ...saved };
      delete userResponse.password;
      res.json(userResponse);
    } catch {
      res.status(500).json({ error: 'Failed to save user' });
    }
  });

  app.get('/api/users/:id', async (req, res) => {
    try {
      const user = await repo.findUserById(req.params.id);
      if (user) {
        const userResponse = { ...user };
        delete userResponse.password;
        res.json(userResponse);
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  // --- Order routes ---
  app.get('/api/orders/:userId', async (req, res) => {
    try {
      res.json(await repo.listOrdersByUser(req.params.userId));
    } catch {
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  app.post('/api/orders', async (req, res) => {
    try {
      const order = await repo.createOrder(req.body);
      for (const item of req.body.items) {
        await repo.updateProductStock(item.id, item.quantity);
      }
      res.json(order);
    } catch {
      res.status(500).json({ error: 'Failed to create order' });
    }
  });

  // --- Conversation routes ---
  app.get('/api/conversations/:userId', async (req, res) => {
    try {
      res.json(await repo.listConversationsByUser(req.params.userId));
    } catch {
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  });

  app.post('/api/conversations', async (req, res) => {
    try {
      const { participants, participantNames, productId, productName } = req.body;

      let conversation = await repo.findConversation(participants, productId);
      if (!conversation) {
        conversation = await repo.createConversation({
          participants, participantNames, productId, productName,
          lastMessage: 'Chat started',
          lastMessageTimestamp: new Date(),
        });

        // Add a welcome message
        await repo.createMessage({
          conversationId: conversation._id,
          senderId: participants[1],
          senderName: participantNames[participants[1]] || 'Seller',
          text: `Hi! Thanks for checking out my ${productName}. Do you have any questions?`,
          timestamp: new Date(),
        });
      }
      res.json(conversation);
    } catch {
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  });

  // --- Message routes ---
  app.get('/api/messages/:conversationId', async (req, res) => {
    try {
      res.json(await repo.listMessagesByConversation(req.params.conversationId));
    } catch {
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  // --- Socket.io for real-time chat ---
  io.on('connection', (socket) => {
    socket.on('join_conversation', (conversationId) => {
      socket.join(conversationId);
    });

    socket.on('send_message', async (data) => {
      const { conversationId, senderId, senderName, text, audio } = data;
      const message = await repo.createMessage({
        conversationId, senderId, senderName, text, audio,
        timestamp: new Date(),
      });
      await repo.updateConversationLastMessage(conversationId, text);
      io.to(conversationId).emit('new_message', message);
    });
  });

  // --- Vite dev server integration ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
