const mongoose = require("mongoose");

const Connection = require("../models/Connection");
const User = require("../models/User");

// ==========================================
// CREATE PAIR KEY
// ==========================================

const createPairKey = (userId1, userId2) => {
  const ids = [
    userId1.toString(),
    userId2.toString(),
  ].sort();

  return `${ids[0]}_${ids[1]}`;
};

// ==========================================
// SEND CONNECTION REQUEST
// ==========================================

const sendConnectionRequest = async (req, res) => {
  try {
    const requesterId = req.user.userId;
    const receiverId = req.params.userId;

    // ==========================================
    // VALIDATE RECEIVER ID
    // ==========================================

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    // ==========================================
    // PREVENT SELF REQUEST
    // ==========================================

    if (requesterId.toString() === receiverId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot send a request to yourself",
      });
    }

    // ==========================================
    // FIND RECEIVER
    // ==========================================

    const receiver = await User.findById(receiverId).select(
      "_id name email avatar isOnline"
    );

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ==========================================
    // CREATE PAIR KEY
    // ==========================================

    const pairKey = createPairKey(
      requesterId,
      receiverId
    );

    // ==========================================
    // CHECK EXISTING CONNECTION
    // ==========================================

    const existingConnection =
      await Connection.findOne({ pairKey });

    if (existingConnection) {
      // Already connected
      if (existingConnection.status === "accepted") {
        return res.status(400).json({
          success: false,
          message: "You are already connected",
        });
      }

      // Pending request already exists
      if (existingConnection.status === "pending") {
        return res.status(400).json({
          success: false,
          message: "Connection request already exists",
        });
      }

      // Rejected request can be sent again
      if (existingConnection.status === "rejected") {
        existingConnection.requester = requesterId;
        existingConnection.receiver = receiverId;
        existingConnection.status = "pending";

        await existingConnection.save();

        const requester = await User.findById(
          requesterId
        ).select("_id name email avatar isOnline");

        // ==========================================
        // REAL-TIME NOTIFICATION
        // ==========================================

        const io = req.app.get("io");

        if (io) {
          io.to(`user:${receiverId}`).emit(
            "connection_request_received",
            {
              connection: {
                _id: existingConnection._id,
                status: existingConnection.status,
                requester,
                receiver,
                createdAt: existingConnection.createdAt,
              },
            }
          );
        }

        return res.status(200).json({
          success: true,
          message: "Connection request sent",
          connection: existingConnection,
        });
      }
    }

    // ==========================================
    // CREATE NEW CONNECTION
    // ==========================================

    const connection = await Connection.create({
      requester: requesterId,
      receiver: receiverId,
      status: "pending",
      pairKey,
    });

    // ==========================================
    // GET REQUESTER
    // ==========================================

    const requester = await User.findById(
      requesterId
    ).select("_id name email avatar isOnline");

    // ==========================================
    // REAL-TIME NOTIFICATION
    // ==========================================

    const io = req.app.get("io");

    if (io) {
      io.to(`user:${receiverId}`).emit(
        "connection_request_received",
        {
          connection: {
            _id: connection._id,
            status: connection.status,
            requester,
            receiver,
            createdAt: connection.createdAt,
          },
        }
      );
    }

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(201).json({
      success: true,
      message: "Connection request sent",
      connection,
    });
  } catch (error) {
    console.error(
      "Send connection request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to send connection request",
    });
  }
};

// ==========================================
// GET INCOMING CONNECTION REQUESTS
// ==========================================

const getConnectionRequests = async (req, res) => {
  try {
    const userId = req.user.userId;

    const requests = await Connection.find({
      receiver: userId,
      status: "pending",
    })
      .populate(
        "requester",
        "-password"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error(
      "Get connection requests error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch connection requests",
    });
  }
};

// ==========================================
// GET SENT CONNECTION REQUESTS
// ==========================================

const getSentRequests = async (req, res) => {
  try {
    const userId = req.user.userId;

    const requests = await Connection.find({
      requester: userId,
      status: "pending",
    })
      .populate(
        "receiver",
        "-password"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error(
      "Get sent requests error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sent requests",
    });
  }
};

// ==========================================
// ACCEPT CONNECTION REQUEST
// ==========================================

const acceptConnectionRequest = async (req, res) => {
  try {
    const userId = req.user.userId;
    const connectionId = req.params.id;

    // ==========================================
    // VALIDATE CONNECTION ID
    // ==========================================

    if (!mongoose.Types.ObjectId.isValid(connectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid connection ID",
      });
    }

    // ==========================================
    // FIND REQUEST
    // ==========================================

    const connection = await Connection.findOne({
      _id: connectionId,
      receiver: userId,
      status: "pending",
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Connection request not found",
      });
    }

    // ==========================================
    // ACCEPT
    // ==========================================

    connection.status = "accepted";

    await connection.save();

    // ==========================================
    // POPULATE USERS
    // ==========================================

    const populatedConnection =
      await Connection.findById(connection._id)
        .populate(
          "requester",
          "_id name email avatar isOnline lastSeen"
        )
        .populate(
          "receiver",
          "_id name email avatar isOnline lastSeen"
        );

    // ==========================================
    // REAL-TIME NOTIFICATION
    // SEND TO REQUESTER
    // ==========================================

    const io = req.app.get("io");

    if (io) {
      io.to(
        `user:${connection.requester.toString()}`
      ).emit(
        "connection_request_accepted",
        {
          connection: populatedConnection,
        }
      );
    }

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      message: "Connection request accepted",
      connection: populatedConnection,
    });
  } catch (error) {
    console.error(
      "Accept connection request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to accept connection request",
    });
  }
};

// ==========================================
// REJECT CONNECTION REQUEST
// ==========================================

const rejectConnectionRequest = async (req, res) => {
  try {
    const userId = req.user.userId;
    const connectionId = req.params.id;

    // ==========================================
    // VALIDATE CONNECTION ID
    // ==========================================

    if (!mongoose.Types.ObjectId.isValid(connectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid connection ID",
      });
    }

    // ==========================================
    // FIND REQUEST
    // ==========================================

    const connection = await Connection.findOne({
      _id: connectionId,
      receiver: userId,
      status: "pending",
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Connection request not found",
      });
    }

    // ==========================================
    // REJECT
    // ==========================================

    connection.status = "rejected";

    await connection.save();

    // ==========================================
    // POPULATE USERS
    // ==========================================

    const populatedConnection =
      await Connection.findById(connection._id)
        .populate(
          "requester",
          "_id name email avatar isOnline lastSeen"
        )
        .populate(
          "receiver",
          "_id name email avatar isOnline lastSeen"
        );

    // ==========================================
    // REAL-TIME NOTIFICATION
    // SEND TO REQUESTER
    // ==========================================

    const io = req.app.get("io");

    if (io) {
      io.to(
        `user:${connection.requester.toString()}`
      ).emit(
        "connection_request_rejected",
        {
          connection: populatedConnection,
        }
      );
    }

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      message: "Connection request rejected",
      connection: populatedConnection,
    });
  } catch (error) {
    console.error(
      "Reject connection request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to reject connection request",
    });
  }
};

// ==========================================
// GET ACCEPTED CONNECTIONS
// ==========================================

// ==========================================
// GET ACCEPTED CONNECTIONS
// ==========================================

const getConnections = async (req, res) => {
  try {
    const userId = req.user.userId;
    const currentUserId = userId.toString();

    const connections = await Connection.find({
      $or: [
        { requester: userId },
        { receiver: userId },
      ],
      status: "accepted",
    })
      .populate(
        "requester",
        "_id name email avatar isOnline lastSeen nexChatId"
      )
      .populate(
        "receiver",
        "_id name email avatar isOnline lastSeen nexChatId"
      )
      .sort({ updatedAt: -1 });

    const users = connections
      .filter((connection) => {
        // Remove broken connections where one user no longer exists
        if (!connection.requester || !connection.receiver) {
          console.warn(
            "Skipping connection with missing user:",
            connection._id
          );
          return false;
        }

        return true;
      })
      .map((connection) => {
        const requesterId = connection.requester._id.toString();

        const otherUser =
          requesterId === currentUserId
            ? connection.receiver
            : connection.requester;

        return {
          connectionId: connection._id,
          connectedAt: connection.updatedAt,
          user: otherUser,
        };
      });

    return res.status(200).json({
      success: true,
      connections: users,
    });
  } catch (error) {
    console.error("Get connections error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch connections",
    });
  }
};

module.exports = {
  sendConnectionRequest,
  getConnectionRequests,
  getSentRequests,
  acceptConnectionRequest,
  rejectConnectionRequest,
  getConnections,
};