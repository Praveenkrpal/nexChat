require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const { initializeGridFS } = require("./config/gridfs");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const connectionRoutes = require("./routes/connectionRoutes");
const blockRoutes = require("./routes/blockRoutes");

const socketHandler = require("./socket/socketHandler");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

app.set("io", io);

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/blocks", blockRoutes);

// Socket.IO
socketHandler(io);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    initializeGridFS();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup error:", error);
  }
};

startServer();