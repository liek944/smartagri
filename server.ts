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
  // IMPORTANT: Do NOT destructure `repo` — it's a getter that resolves to the
  // active adapter.  Destructuring would capture the initial value (jsonRepo)
  // and never pick up the switch to MongoRepository after connectMongo().
  const container = createRepository(process.env.MONGODB_URI, DB_FILE);
  const { status } = container;
  console.log(`[BOOT] MONGODB_URI provided: ${status.mongoUri}`);
  console.log(`[BOOT] PORT: ${PORT}`);
  await container.connectMongo();
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
      res.json(await container.repo.listProducts());
    } catch {
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  app.post('/api/products', async (req, res) => {
    try {
      res.json(await container.repo.createProduct(req.body));
    } catch {
      res.status(500).json({ error: 'Failed to create product' });
    }
  });

  app.put('/api/products/:id', async (req, res) => {
    try {
      res.json(await container.repo.updateProduct(req.params.id, req.body));
    } catch {
      res.status(500).json({ error: 'Failed to update product' });
    }
  });

  app.delete('/api/products/:id', async (req, res) => {
    try {
      await container.repo.deleteProduct(req.params.id);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Failed to delete product' });
    }
  });

  // --- Auth routes ---
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, username, password, fullName, role } = req.body;

      if (await container.repo.findUserByEmailOrUsername(email)) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      if (username && await container.repo.findUserByEmailOrUsername(username)) {
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

      const saved = await container.repo.createUser(userData);
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

      const user = await container.repo.findUserByEmailOrUsername(email);
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
      const saved = await container.repo.upsertUser(req.body.id, req.body);
      const userResponse = { ...saved };
      delete userResponse.password;
      res.json(userResponse);
    } catch {
      res.status(500).json({ error: 'Failed to save user' });
    }
  });

  app.get('/api/users/:id', async (req, res) => {
    try {
      const user = await container.repo.findUserById(req.params.id);
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
      res.json(await container.repo.listOrdersByUser(req.params.userId));
    } catch {
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  app.post('/api/orders', async (req, res) => {
    try {
      const order = await container.repo.createOrder(req.body);
      for (const item of req.body.items) {
        await container.repo.updateProductStock(item.id, item.quantity);
        if (item.producerId && onlineUsers.has(item.producerId)) {
          const sockets = onlineUsers.get(item.producerId)!;
          for (const socketId of sockets) {
            io.to(socketId).emit('new_order', { orderId: order._id || order.id, productName: item.name });
          }
        }
      }
      res.json(order);
    } catch {
      res.status(500).json({ error: 'Failed to create order' });
    }
  });

  const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    pending: ['processing', 'cancelled'],
    processing: ['completed'],
  };

  app.patch('/api/orders/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body as { status: string };
      const order = await container.repo.findOrderById(id);
      if (!order) return res.status(404).json({ error: 'Order not found' });

      const allowed = ALLOWED_TRANSITIONS[order.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: `Cannot transition from '${order.status}' to '${status}'` });
      }

      // Restore stock when cancelling
      if (status === 'cancelled') {
        for (const item of order.items) {
          await container.repo.updateProductStock(item.id, -item.quantity);
        }
      }

      const updated = await container.repo.updateOrderStatus(id, status);
      res.json(updated);
    } catch {
      res.status(500).json({ error: 'Failed to update order status' });
    }
  });

  // --- Conversation routes ---
  app.get('/api/conversations/:userId', async (req, res) => {
    try {
      res.json(await container.repo.listConversationsByUser(req.params.userId));
    } catch {
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  });

  app.post('/api/conversations', async (req, res) => {
    try {
      const { participants, participantNames, productId, productName } = req.body;

      let conversation = await container.repo.findConversation(participants, productId);
      if (!conversation) {
        conversation = await container.repo.createConversation({
          participants, participantNames, productId, productName,
          lastMessage: 'Chat started',
          lastMessageTimestamp: new Date(),
        });

        // Add a welcome message
        await container.repo.createMessage({
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
      res.json(await container.repo.listMessagesByConversation(req.params.conversationId));
    } catch {
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  // Global map to track online users: userId -> Set of socketIds
  const onlineUsers = new Map<string, Set<string>>();

  // --- Socket.io for real-time chat ---
  io.on('connection', (socket) => {
    let currentUserId: string | null = null;

    // Client tells server they are online
    socket.on('user_connected', (userId: string) => {
      currentUserId = userId;
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId)!.add(socket.id);
      
      // Broadcast to everyone that this user is online
      io.emit('user_status', { userId, status: 'online' });
    });

    socket.on('check_status', (userId: string) => {
      // Send the status of a specific user back to the requester
      const isOnline = onlineUsers.has(userId) && onlineUsers.get(userId)!.size > 0;
      socket.emit('user_status', { userId, status: isOnline ? 'online' : 'offline' });
    });

    socket.on('join_conversation', (conversationId) => {
      socket.join(conversationId);
    });

    socket.on('send_message', async (data) => {
      const { conversationId, senderId, senderName, text, audio, otherUserId } = data;
      const message = await container.repo.createMessage({
        conversationId, senderId, senderName, text, audio,
        timestamp: new Date(),
      });
      await container.repo.updateConversationLastMessage(conversationId, text);
      io.to(conversationId).emit('new_message', message);
      
      if (otherUserId && onlineUsers.has(otherUserId)) {
        const sockets = onlineUsers.get(otherUserId)!;
        for (const socketId of sockets) {
          io.to(socketId).emit('new_message_notification', {
            conversationId, senderName, text
          });
        }
      }
    });

    socket.on('disconnect', () => {
      if (currentUserId && onlineUsers.has(currentUserId)) {
        const userSockets = onlineUsers.get(currentUserId)!;
        userSockets.delete(socket.id);
        
        if (userSockets.size === 0) {
          onlineUsers.delete(currentUserId);
          // Broadcast to everyone that this user is offline
          io.emit('user_status', { userId: currentUserId, status: 'offline' });
        }
      }
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
