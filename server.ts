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
  app.get('/api/users', async (_req, res) => {
    try {
      const users = await container.repo.listUsers();
      res.json(users.map((u: any) => {
        const ur = { ...u };
        delete ur.password;
        return ur;
      }));
    } catch {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.patch('/api/users/:id/status', async (req, res) => {
    try {
      const { isActive } = req.body;
      const updated = await container.repo.updateUserStatus(req.params.id, isActive);
      if (updated) {
        delete updated.password;
        res.json(updated);
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch {
      res.status(500).json({ error: 'Failed to update user status' });
    }
  });

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
  app.get('/api/orders', async (_req, res) => {
    try {
      res.json(await container.repo.listAllOrders());
    } catch {
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

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
    pending: ['confirmed', 'cancelled'],
    confirmed: ['dispatched'],
    dispatched: ['out_for_delivery'],
    out_for_delivery: ['delivered'],
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

      let conversation = await container.repo.findConversationByParticipants(participants);
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
          text: `Hi! Thanks for checking out my Products. Do you have any questions?`,
          timestamp: new Date(),
        });
      }
      res.json(conversation);
    } catch {
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  });

  // Unified user-to-user conversation (Messages tab)
  app.post('/api/conversations/start', async (req, res) => {
    try {
      const { participants, participantNames } = req.body;

      // Look for ANY existing conversation between these two users
      let conversation = await container.repo.findConversationByParticipants(participants);
      if (!conversation) {
        conversation = await container.repo.createConversation({
          participants, participantNames,
          lastMessage: 'Chat started',
          lastMessageTimestamp: new Date(),
        });
      }
      res.json(conversation);
    } catch {
      res.status(500).json({ error: 'Failed to start conversation' });
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

  // --- Review routes ---
  app.get('/api/reviews/:productId', async (req, res) => {
    try {
      res.json(await container.repo.listReviewsByProduct(req.params.productId));
    } catch {
      res.status(500).json({ error: 'Failed to fetch reviews' });
    }
  });

  app.post('/api/reviews', async (req, res) => {
    try {
      res.json(await container.repo.createReview({
        ...req.body,
        date: new Date().toISOString()
      }));
    } catch {
      res.status(500).json({ error: 'Failed to create review' });
    }
  });

  // --- Sellers directory ---
  app.get('/api/sellers', async (_req, res) => {
    try {
      res.json(await container.repo.listSellers());
    } catch {
      res.status(500).json({ error: 'Failed to fetch sellers' });
    }
  });

  // --- PayMongo GCash Payment routes ---
  const PAYMONGO_API = 'https://api.paymongo.com/v1';
  const PAYMONGO_AUTH = `Basic ${Buffer.from((process.env.PAYMONGO_SECRET_KEY || '') + ':').toString('base64')}`;

  // In-memory store for pending GCash payments (maps our paymentId → order data + sourceId)
  const pendingPayments = new Map<string, any>();

  // Cleanup stale entries older than 1 hour
  setInterval(() => {
    const ONE_HOUR = 60 * 60 * 1000;
    for (const [key, val] of pendingPayments) {
      if (Date.now() - val.createdAt > ONE_HOUR) pendingPayments.delete(key);
    }
  }, 5 * 60 * 1000);

  // Step 1: Create a GCash source — frontend calls this, gets redirected to PayMongo
  app.post('/api/payments/gcash', async (req, res) => {
    try {
      const { userId, userName, items, subtotal, deliveryFee, total, deliveryLocation, phoneNumber } = req.body;
      const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Determine base URL from request (works in dev and production)
      const proto = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const baseUrl = `${proto}://${host}`;

      // Create PayMongo source
      const sourceRes = await fetch(`${PAYMONGO_API}/sources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': PAYMONGO_AUTH,
        },
        body: JSON.stringify({
          data: {
            attributes: {
              amount: Math.round(total * 100), // PayMongo uses centavos
              redirect: {
                success: `${baseUrl}/api/payments/gcash/success?payment_id=${paymentId}`,
                failed: `${baseUrl}/api/payments/gcash/failed?payment_id=${paymentId}`,
              },
              type: 'gcash',
              currency: 'PHP',
            },
          },
        }),
      });

      const sourceData = await sourceRes.json();

      if (!sourceRes.ok) {
        console.error('[PayMongo] Source creation failed:', JSON.stringify(sourceData));
        return res.status(400).json({
          error: sourceData.errors?.[0]?.detail || 'Failed to create GCash payment source',
        });
      }

      const sourceId = sourceData.data.id;
      const checkoutUrl = sourceData.data.attributes.redirect.checkout_url;

      // Store pending order data keyed by our payment ID
      pendingPayments.set(paymentId, {
        sourceId,
        userId, userName, items, subtotal, deliveryFee, total,
        deliveryLocation, phoneNumber,
        paymentMethod: 'gcash',
        orderDate: new Date().toISOString(),
        createdAt: Date.now(),
      });

      console.log(`[PayMongo] GCash source created: ${sourceId} (payment: ${paymentId})`);
      res.json({ checkoutUrl, paymentId, sourceId });
    } catch (error) {
      console.error('[PayMongo] Error creating GCash source:', error);
      res.status(500).json({ error: 'Failed to initiate GCash payment' });
    }
  });

  // Step 2a: Success redirect — PayMongo sends user here after GCash authorization
  app.get('/api/payments/gcash/success', async (req, res) => {
    const paymentId = req.query.payment_id as string;
    const pending = pendingPayments.get(paymentId);

    if (!pending) {
      console.warn(`[PayMongo] Success callback for unknown payment: ${paymentId}`);
      return res.redirect('/?payment=expired');
    }

    try {
      // Check if source is chargeable
      const sourceRes = await fetch(`${PAYMONGO_API}/sources/${pending.sourceId}`, {
        headers: { 'Authorization': PAYMONGO_AUTH },
      });
      const sourceData = await sourceRes.json();
      const sourceStatus = sourceData.data?.attributes?.status;

      console.log(`[PayMongo] Source ${pending.sourceId} status: ${sourceStatus}`);

      if (sourceStatus === 'chargeable') {
        // Create the actual payment
        const payRes = await fetch(`${PAYMONGO_API}/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': PAYMONGO_AUTH,
          },
          body: JSON.stringify({
            data: {
              attributes: {
                amount: Math.round(pending.total * 100),
                source: { id: pending.sourceId, type: 'source' },
                currency: 'PHP',
                description: `SmartAgri order — ${pending.userName}`,
              },
            },
          }),
        });

        const payData = await payRes.json();

        if (!payRes.ok) {
          console.error('[PayMongo] Payment creation failed:', JSON.stringify(payData));
          return res.redirect('/?payment=failed');
        }

        console.log(`[PayMongo] Payment created: ${payData.data.id}`);

        // Create the order in our database
        const order = await container.repo.createOrder({
          userId: pending.userId,
          userName: pending.userName,
          items: pending.items,
          subtotal: pending.subtotal,
          deliveryFee: pending.deliveryFee,
          total: pending.total,
          paymentMethod: 'gcash',
          status: 'pending',
          deliveryLocation: pending.deliveryLocation,
          phoneNumber: pending.phoneNumber,
          orderDate: pending.orderDate,
          paymentDetails: {
            provider: 'paymongo',
            sourceId: pending.sourceId,
            paymentId: payData.data.id,
            paymentStatus: payData.data.attributes.status,
            paidAt: new Date().toISOString(),
          },
        });

        // Update stock for each item
        for (const item of pending.items) {
          await container.repo.updateProductStock(item.id, item.quantity);
          // Notify producer via socket
          if (item.producerId && onlineUsers.has(item.producerId)) {
            const sockets = onlineUsers.get(item.producerId)!;
            for (const socketId of sockets) {
              io.to(socketId).emit('new_order', {
                orderId: order._id || order.id,
                productName: item.name,
              });
            }
          }
        }

        pendingPayments.delete(paymentId);
        const orderId = order._id || order.id;
        return res.redirect(`/?payment=success&order_id=${orderId}`);
      }

      // Source not yet chargeable — edge case in test mode, shouldn't happen normally
      console.warn(`[PayMongo] Source not chargeable yet: ${sourceStatus}`);
      return res.redirect(`/?payment=pending&payment_id=${paymentId}`);
    } catch (error) {
      console.error('[PayMongo] Error in success handler:', error);
      return res.redirect('/?payment=failed');
    }
  });

  // Step 2b: Failed redirect — user cancelled or payment failed on PayMongo's side
  app.get('/api/payments/gcash/failed', async (req, res) => {
    const paymentId = req.query.payment_id as string;
    pendingPayments.delete(paymentId);
    console.log(`[PayMongo] GCash payment failed/cancelled: ${paymentId}`);
    return res.redirect('/?payment=failed');
  });

  // Retrieve a pending order (for frontend status checks)
  app.get('/api/payments/status/:paymentId', async (req, res) => {
    const pending = pendingPayments.get(req.params.paymentId);
    if (!pending) return res.json({ status: 'not_found' });

    try {
      const sourceRes = await fetch(`${PAYMONGO_API}/sources/${pending.sourceId}`, {
        headers: { 'Authorization': PAYMONGO_AUTH },
      });
      const sourceData = await sourceRes.json();
      res.json({ status: sourceData.data?.attributes?.status || 'unknown' });
    } catch {
      res.json({ status: 'error' });
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

      // Emit conversation_updated to both participants for real-time inbox reordering
      const conversationUpdatePayload = {
        conversationId,
        lastMessage: text,
        lastMessageTimestamp: new Date().toISOString(),
      };

      // Notify sender's other tabs/windows
      if (senderId && onlineUsers.has(senderId)) {
        const sockets = onlineUsers.get(senderId)!;
        for (const socketId of sockets) {
          io.to(socketId).emit('conversation_updated', conversationUpdatePayload);
        }
      }

      if (otherUserId && onlineUsers.has(otherUserId)) {
        const sockets = onlineUsers.get(otherUserId)!;
        for (const socketId of sockets) {
          io.to(socketId).emit('new_message_notification', {
            conversationId, senderName, text
          });
          io.to(socketId).emit('conversation_updated', conversationUpdatePayload);
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
