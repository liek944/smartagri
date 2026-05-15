var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_http = require("http");
var import_socket = require("socket.io");
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_bcryptjs2 = __toESM(require("bcryptjs"), 1);
var import_mongoose3 = __toESM(require("mongoose"), 1);

// server/repository.ts
var import_mongoose2 = __toESM(require("mongoose"), 1);
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_promises = __toESM(require("fs/promises"), 1);

// server/models.ts
var import_mongoose = __toESM(require("mongoose"), 1);
var UserSchema = new import_mongoose.default.Schema({
  id: { type: String, required: true, unique: true },
  username: String,
  fullName: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: String,
  location: String,
  joinedDate: String
});
var ProductSchema = new import_mongoose.default.Schema({
  name: String,
  price: Number,
  stock: Number,
  sold: { type: Number, default: 0 },
  category: String,
  producer: String,
  producerId: String,
  image: String,
  description: String
});
var OrderSchema = new import_mongoose.default.Schema({
  userId: String,
  userName: String,
  items: Array,
  subtotal: Number,
  deliveryFee: Number,
  total: Number,
  paymentMethod: String,
  status: String,
  orderDate: String
});
var MessageSchema = new import_mongoose.default.Schema({
  conversationId: String,
  senderId: String,
  senderName: String,
  text: String,
  audio: String,
  timestamp: { type: Date, default: Date.now }
});
var ConversationSchema = new import_mongoose.default.Schema({
  participants: [String],
  participantNames: Map,
  lastMessage: String,
  lastMessageTimestamp: Date,
  productId: String,
  productName: String
});
var User = import_mongoose.default.model("User", UserSchema);
var Product = import_mongoose.default.model("Product", ProductSchema);
var Order = import_mongoose.default.model("Order", OrderSchema);
var Message = import_mongoose.default.model("Message", MessageSchema);
var Conversation = import_mongoose.default.model("Conversation", ConversationSchema);

// server/seed-data.ts
var SEED_PRODUCTS = [
  {
    name: "Organic Rice (5kg)",
    price: 250,
    stock: 50,
    sold: 0,
    category: "agriculture",
    producer: "Juan Dela Cruz",
    producerId: "mock-1",
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400",
    description: "Fresh organic rice from local farms"
  },
  {
    name: "Artisan Basket",
    price: 450,
    stock: 30,
    sold: 0,
    category: "craft",
    producer: "Lola Artisans",
    producerId: "mock-2",
    image: "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400",
    description: "Handcrafted traditional basket"
  },
  {
    name: "Fresh Coconut",
    price: 50,
    stock: 100,
    sold: 0,
    category: "agriculture",
    producer: "Juan Dela Cruz",
    producerId: "mock-1",
    image: "https://images.unsplash.com/photo-1550581190-81f0d366d45a?w=400",
    description: "Sweet and refreshing young coconut"
  },
  {
    name: "Wooden Sculpture",
    price: 1200,
    stock: 15,
    sold: 0,
    category: "craft",
    producer: "Mindoro Crafts",
    producerId: "mock-3",
    image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=400",
    description: "Intricate wooden carving"
  },
  {
    name: "Organic Lettuce",
    price: 80,
    stock: 75,
    sold: 0,
    category: "agriculture",
    producer: "Green Farms",
    producerId: "mock-4",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400",
    description: "Crispy and fresh pesticide-free lettuce"
  },
  {
    name: "Fresh Honey",
    price: 350,
    stock: 40,
    sold: 0,
    category: "agriculture",
    producer: "Beekeeper Co",
    producerId: "mock-5",
    image: "https://images.unsplash.com/photo-1587049352846-4a222e773a08?w=400",
    description: "Pure wild honey from the mountains"
  },
  {
    name: "Calamansi",
    price: 50,
    stock: 105,
    sold: 0,
    category: "agriculture",
    producer: "Dexcem Gutierrez",
    producerId: "mock-6",
    image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400",
    description: "Tangy local citrus"
  },
  {
    name: "Lansones",
    price: 150,
    stock: 60,
    sold: 0,
    category: "agriculture",
    producer: "Roxas Orchard",
    producerId: "mock-7",
    image: "https://images.unsplash.com/photo-1621501438991-da55928f629c?w=400",
    description: "Sweet and juicy local lansones"
  }
];

// server/repository.ts
var MongoRepository = class {
  async initialize() {
    const count = await Product.countDocuments();
    if (count === 0) {
      await Product.insertMany(SEED_PRODUCTS);
      console.log("Seeded initial products");
    }
  }
  async findUserByEmailOrUsername(identifier) {
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });
    return user ? user.toObject() : null;
  }
  async findUserById(id) {
    const user = await User.findOne({ id });
    return user ? user.toObject() : null;
  }
  async createUser(data) {
    const user = new User(data);
    await user.save();
    return user.toObject();
  }
  async upsertUser(id, data) {
    const user = await User.findOneAndUpdate({ id }, data, {
      upsert: true,
      new: true
    });
    return user.toObject();
  }
  async listProducts() {
    return Product.find();
  }
  async createProduct(data) {
    const product = new Product(data);
    await product.save();
    return product;
  }
  async updateProductStock(id, soldQty) {
    await Product.findByIdAndUpdate(id, {
      $inc: { stock: -soldQty, sold: soldQty }
    });
  }
  async updateProduct(id, data) {
    const product = await Product.findByIdAndUpdate(id, data, { new: true });
    return product;
  }
  async deleteProduct(id) {
    await Product.findByIdAndDelete(id);
  }
  async listOrdersByUser(userId) {
    return Order.find({
      $or: [
        { userId },
        { "items.producerId": userId }
      ]
    }).sort({ orderDate: -1 });
  }
  async createOrder(data) {
    const order = new Order(data);
    await order.save();
    return order;
  }
  async listConversationsByUser(userId) {
    return Conversation.find({ participants: userId });
  }
  async findConversation(participants, productId) {
    return Conversation.findOne({
      participants: { $all: participants },
      productId
    });
  }
  async createConversation(data) {
    const conv = new Conversation(data);
    await conv.save();
    return conv;
  }
  async updateConversationLastMessage(id, message) {
    await Conversation.findByIdAndUpdate(id, {
      lastMessage: message,
      lastMessageTimestamp: /* @__PURE__ */ new Date()
    });
  }
  async listMessagesByConversation(conversationId) {
    return Message.find({ conversationId }).sort({ timestamp: 1 });
  }
  async createMessage(data) {
    const message = new Message(data);
    await message.save();
    return message;
  }
};
var JsonFileRepository = class {
  constructor(filePath) {
    this.filePath = filePath;
    this.db = {
      users: [],
      products: [],
      orders: [],
      conversations: [],
      messages: []
    };
  }
  async initialize() {
    try {
      const data = await import_promises.default.readFile(this.filePath, "utf-8");
      const parsed = JSON.parse(data);
      this.db = { ...this.db, ...parsed };
      console.log("JSON DB loaded successfully");
    } catch {
      console.log("No JSON DB found, starting fresh");
    }
    if (this.db.products.length === 0) {
      this.db.products = SEED_PRODUCTS.map((p, i) => ({
        ...p,
        _id: `m-${i + 1}`
      }));
    }
    if (this.db.users.length === 0) {
      const hashedPassword = await import_bcryptjs.default.hash("password", 10);
      this.db.users.push({
        id: "USR-test",
        email: "test@test.com",
        password: hashedPassword,
        fullName: "Test User",
        username: "test",
        role: "buyer",
        location: "Roxas",
        joinedDate: (/* @__PURE__ */ new Date()).toLocaleDateString()
      });
    }
    await this.save();
  }
  async save() {
    try {
      await import_promises.default.writeFile(this.filePath, JSON.stringify(this.db, null, 2));
    } catch (err) {
      console.error("Failed to save JSON DB:", err);
    }
  }
  async findUserByEmailOrUsername(identifier) {
    const lower = identifier.toLowerCase();
    return this.db.users.find(
      (u) => u.email.toLowerCase() === lower || u.username && u.username.toLowerCase() === lower
    ) || null;
  }
  async findUserById(id) {
    return this.db.users.find((u) => u.id === id) || null;
  }
  async createUser(data) {
    this.db.users.push(data);
    await this.save();
    return { ...data };
  }
  async upsertUser(id, data) {
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
  async listProducts() {
    return this.db.products;
  }
  async createProduct(data) {
    const newProduct = { ...data, _id: `mem-p-${Date.now()}` };
    this.db.products.push(newProduct);
    await this.save();
    return newProduct;
  }
  async updateProductStock(id, soldQty) {
    const product = this.db.products.find((p) => p._id === id);
    if (product) {
      product.stock -= soldQty;
      product.sold += soldQty;
      await this.save();
    }
  }
  async updateProduct(id, data) {
    const index = this.db.products.findIndex((p) => p._id === id || p.id === id);
    if (index !== -1) {
      this.db.products[index] = { ...this.db.products[index], ...data };
      await this.save();
      return this.db.products[index];
    }
    return null;
  }
  async deleteProduct(id) {
    this.db.products = this.db.products.filter((p) => p._id !== id && p.id !== id);
    await this.save();
  }
  async listOrdersByUser(userId) {
    return this.db.orders.filter(
      (o) => o.userId === userId || o.items.some((i) => i.producerId === userId)
    );
  }
  async createOrder(data) {
    const newOrder = { ...data, _id: `ord-${Date.now()}` };
    this.db.orders.push(newOrder);
    await this.save();
    return newOrder;
  }
  async listConversationsByUser(userId) {
    return this.db.conversations.filter(
      (c) => c.participants.includes(userId)
    );
  }
  async findConversation(participants, productId) {
    return this.db.conversations.find(
      (c) => c.participants.every((p) => participants.includes(p)) && c.productId === productId
    ) || null;
  }
  async createConversation(data) {
    const conv = { ...data, _id: `conv-${Date.now()}` };
    this.db.conversations.push(conv);
    await this.save();
    return conv;
  }
  async updateConversationLastMessage(id, message) {
    const conv = this.db.conversations.find((c) => c._id === id);
    if (conv) {
      conv.lastMessage = message;
      conv.lastMessageTimestamp = /* @__PURE__ */ new Date();
      await this.save();
    }
  }
  async listMessagesByConversation(conversationId) {
    return this.db.messages.filter(
      (m) => m.conversationId === conversationId
    );
  }
  async createMessage(data) {
    const message = { ...data, _id: `msg-${Date.now()}` };
    this.db.messages.push(message);
    await this.save();
    return message;
  }
};
function createRepository(mongoUri, dbFilePath) {
  const mongoRepo = new MongoRepository();
  const jsonRepo = new JsonFileRepository(dbFilePath);
  let activeRepo = jsonRepo;
  const status = {
    adapter: "json",
    bootTime: (/* @__PURE__ */ new Date()).toISOString(),
    mongoUri: !!mongoUri,
    connectionAttempts: 0
  };
  return {
    get repo() {
      return activeRepo;
    },
    status,
    connectMongo: async () => {
      if (!mongoUri) {
        console.warn("[REPO] MONGODB_URI not set. Using JSON file storage (development mode).");
        activeRepo = jsonRepo;
        status.adapter = "json";
        await jsonRepo.initialize();
        return false;
      }
      const attempts = [1e4, 2e4, 3e4];
      for (let i = 0; i < attempts.length; i++) {
        status.connectionAttempts = i + 1;
        const timeout = attempts[i];
        console.log(`[REPO] MongoDB connection attempt ${i + 1}/${attempts.length} (timeout: ${timeout / 1e3}s)...`);
        try {
          await import_mongoose2.default.connect(mongoUri, { serverSelectionTimeoutMS: timeout });
          console.log(`[REPO] \u2705 Connected to MongoDB on attempt ${i + 1}`);
          activeRepo = mongoRepo;
          status.adapter = "mongo";
          await mongoRepo.initialize();
          return true;
        } catch (err) {
          console.error(`[REPO] \u274C MongoDB attempt ${i + 1} failed:`, err instanceof Error ? err.message : err);
          try {
            await import_mongoose2.default.disconnect();
          } catch {
          }
        }
      }
      console.error("[REPO] ===================================================");
      console.error("[REPO] FATAL: MongoDB connection failed after all retries.");
      console.error("[REPO] MONGODB_URI is set \u2014 refusing to fall back to JSON.");
      console.error("[REPO] Fix your MongoDB connection and redeploy.");
      console.error("[REPO] ===================================================");
      process.exit(1);
    }
  };
}

// server.ts
import_dotenv.default.config();
var PORT = parseInt(process.env.PORT || "3000", 10);
var DB_FILE = import_path.default.join(process.cwd(), "db.json");
async function startServer() {
  const app = (0, import_express.default)();
  const httpServer = (0, import_http.createServer)(app);
  const io = new import_socket.Server(httpServer, { cors: { origin: "*" } });
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
  const { repo, connectMongo, status } = createRepository(process.env.MONGODB_URI, DB_FILE);
  console.log(`[BOOT] MONGODB_URI provided: ${status.mongoUri}`);
  console.log(`[BOOT] PORT: ${PORT}`);
  await connectMongo();
  console.log(`[BOOT] Active adapter: ${status.adapter}`);
  console.log(`[BOOT] Connection attempts: ${status.connectionAttempts}`);
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", adapter: status.adapter });
  });
  app.get("/api/debug/status", (_req, res) => {
    res.json({
      adapter: status.adapter,
      bootTime: status.bootTime,
      mongoUriProvided: status.mongoUri,
      connectionAttempts: status.connectionAttempts,
      mongooseState: import_mongoose3.default.connection.readyState,
      uptime: process.uptime()
    });
  });
  app.get("/api/products", async (_req, res) => {
    try {
      res.json(await repo.listProducts());
    } catch {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });
  app.post("/api/products", async (req, res) => {
    try {
      res.json(await repo.createProduct(req.body));
    } catch {
      res.status(500).json({ error: "Failed to create product" });
    }
  });
  app.put("/api/products/:id", async (req, res) => {
    try {
      res.json(await repo.updateProduct(req.params.id, req.body));
    } catch {
      res.status(500).json({ error: "Failed to update product" });
    }
  });
  app.delete("/api/products/:id", async (req, res) => {
    try {
      await repo.deleteProduct(req.params.id);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, username, password, fullName, role } = req.body;
      if (await repo.findUserByEmailOrUsername(email)) {
        return res.status(400).json({ error: "Email already registered" });
      }
      if (username && await repo.findUserByEmailOrUsername(username)) {
        return res.status(400).json({ error: "Username already taken" });
      }
      const hashedPassword = await import_bcryptjs2.default.hash(password, 10);
      const userData = {
        id: `USR-${Date.now()}`,
        email,
        username: username || email.split("@")[0],
        password: hashedPassword,
        fullName,
        role: role || "buyer",
        location: "Roxas",
        joinedDate: (/* @__PURE__ */ new Date()).toLocaleDateString()
      };
      const saved = await repo.createUser(userData);
      const userResponse = { ...saved };
      delete userResponse.password;
      res.json(userResponse);
    } catch {
      res.status(500).json({ error: "Registration failed" });
    }
  });
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log("Login attempt:", email);
      const user = await repo.findUserByEmailOrUsername(email);
      if (!user) {
        console.log("Account not found:", email);
        return res.status(400).json({ error: "Invalid identifier or password" });
      }
      const isMatch = await import_bcryptjs2.default.compare(password, user.password);
      if (!isMatch) {
        console.log("Password mismatch for:", email);
        return res.status(400).json({ error: "Invalid email or password" });
      }
      console.log("Login successful:", email);
      const userResponse = { ...user };
      delete userResponse.password;
      res.json(userResponse);
    } catch {
      res.status(500).json({ error: "Login failed" });
    }
  });
  app.post("/api/users", async (req, res) => {
    try {
      const saved = await repo.upsertUser(req.body.id, req.body);
      const userResponse = { ...saved };
      delete userResponse.password;
      res.json(userResponse);
    } catch {
      res.status(500).json({ error: "Failed to save user" });
    }
  });
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await repo.findUserById(req.params.id);
      if (user) {
        const userResponse = { ...user };
        delete userResponse.password;
        res.json(userResponse);
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });
  app.get("/api/orders/:userId", async (req, res) => {
    try {
      res.json(await repo.listOrdersByUser(req.params.userId));
    } catch {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });
  app.post("/api/orders", async (req, res) => {
    try {
      const order = await repo.createOrder(req.body);
      for (const item of req.body.items) {
        await repo.updateProductStock(item.id, item.quantity);
      }
      res.json(order);
    } catch {
      res.status(500).json({ error: "Failed to create order" });
    }
  });
  app.get("/api/conversations/:userId", async (req, res) => {
    try {
      res.json(await repo.listConversationsByUser(req.params.userId));
    } catch {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });
  app.post("/api/conversations", async (req, res) => {
    try {
      const { participants, participantNames, productId, productName } = req.body;
      let conversation = await repo.findConversation(participants, productId);
      if (!conversation) {
        conversation = await repo.createConversation({
          participants,
          participantNames,
          productId,
          productName,
          lastMessage: "Chat started",
          lastMessageTimestamp: /* @__PURE__ */ new Date()
        });
        await repo.createMessage({
          conversationId: conversation._id,
          senderId: participants[1],
          senderName: participantNames[participants[1]] || "Seller",
          text: `Hi! Thanks for checking out my ${productName}. Do you have any questions?`,
          timestamp: /* @__PURE__ */ new Date()
        });
      }
      res.json(conversation);
    } catch {
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });
  app.get("/api/messages/:conversationId", async (req, res) => {
    try {
      res.json(await repo.listMessagesByConversation(req.params.conversationId));
    } catch {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });
  io.on("connection", (socket) => {
    socket.on("join_conversation", (conversationId) => {
      socket.join(conversationId);
    });
    socket.on("send_message", async (data) => {
      const { conversationId, senderId, senderName, text, audio } = data;
      const message = await repo.createMessage({
        conversationId,
        senderId,
        senderName,
        text,
        audio,
        timestamp: /* @__PURE__ */ new Date()
      });
      await repo.updateConversationLastMessage(conversationId, text);
      io.to(conversationId).emit("new_message", message);
    });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
