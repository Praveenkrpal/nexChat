const jwt = require("jsonwebtoken");

const Message = require("../models/Message");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Connection = require("../models/Connection");
const Block = require("../models/Block");

const onlineUsers = new Map();

// ==========================================
// ADD SOCKET FOR USER
// ==========================================

const addOnlineSocket = (userId, socketId) => {
  const normalizedUserId = userId.toString();

  if (!onlineUsers.has(normalizedUserId)) {
    onlineUsers.set(
      normalizedUserId,
      new Set()
    );
  }

  onlineUsers
    .get(normalizedUserId)
    .add(socketId);
};

// ==========================================
// REMOVE SOCKET FOR USER
// ==========================================

const removeOnlineSocket = (
  userId,
  socketId
) => {
  const normalizedUserId =
    userId.toString();

  const sockets =
    onlineUsers.get(normalizedUserId);

  if (!sockets) {
    return false;
  }

  sockets.delete(socketId);

  if (sockets.size === 0) {
    onlineUsers.delete(normalizedUserId);

    return false;
  }

  return true;
};

// ==========================================
// CHECK USER ONLINE
// ==========================================

const isUserOnline = (userId) => {
  return onlineUsers.has(
    userId.toString()
  );
};

// ==========================================
// GET ONLINE USER IDS
// ==========================================

const getOnlineUserIds = () => {
  return Array.from(
    onlineUsers.keys()
  );
};

// ==========================================
// CHECK ACCEPTED CONNECTION
// ==========================================

const areUsersConnected = async (
  userId1,
  userId2
) => {
  const ids = [
    userId1.toString(),
    userId2.toString(),
  ].sort();

  const pairKey =
    `${ids[0]}_${ids[1]}`;

  const connection =
    await Connection.findOne({
      pairKey,
      status: "accepted",
    });

  return !!connection;
};

// ==========================================
// CHECK BLOCK STATUS
// ==========================================

const isBlockedBetweenUsers = async (
  userId,
  otherUserId
) => {
  const block =
    await Block.findOne({
      $or: [
        {
          blocker: userId,
          blocked: otherUserId,
        },
        {
          blocker: otherUserId,
          blocked: userId,
        },
      ],
    }).lean();

  return !!block;
};

// ==========================================
// GET OR CREATE CONVERSATION
// ==========================================

const getOrCreateConversation = async (
  userId,
  otherUserId
) => {
  let conversation =
    await Conversation.findOne({
      participants: {
        $all: [
          userId,
          otherUserId,
        ],
      },
    });

  if (!conversation) {
    conversation =
      await Conversation.create({
        participants: [
          userId,
          otherUserId,
        ],
      });
  }

  return conversation;
};

// ==========================================
// SOCKET HANDLER
// ==========================================

const socketHandler = (io) => {
  // ==========================================
  // SOCKET AUTHENTICATION
  // ==========================================

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token;

      if (!token) {
        return next(
          new Error(
            "Authentication token missing"
          )
        );
      }

      const decoded =
        jwt.verify(
          token,
          process.env.JWT_SECRET
        );

      const userId =
        decoded.userId ||
        decoded.id;

      if (!userId) {
        return next(
          new Error(
            "Invalid authentication token"
          )
        );
      }

      // Get user verification status
      const user =
        await User.findById(
          userId
        ).select(
          "_id name email phone emailVerified phoneVerified tokenVersion"
        );

      if (!user) {
        return next(
          new Error("User not found")
        );
      }

      const tokenVersion =
        decoded.tokenVersion ?? 0;

      const currentTokenVersion =
        user.tokenVersion ?? 0;

      if (
        tokenVersion !==
        currentTokenVersion
      ) {
        return next(
          new Error(
            "Session expired. Please login again."
          )
        );
      }

      // ==========================================
      // EMAIL OR MOBILE VERIFICATION REQUIRED
      // ==========================================

      if (
        !user.emailVerified &&
        !user.phoneVerified
      ) {
        return next(
          new Error(
            "Please verify your email or mobile number before using NexChat"
          )
        );
      }

      socket.user = user;

      next();
    } catch (error) {
      console.error(
        "Socket authentication error:",
        error
      );

      next(
        new Error(
          "Invalid or expired token"
        )
      );
    }
  });

  // ==========================================
  // SOCKET CONNECTION
  // ==========================================

  io.on(
    "connection",
    async (socket) => {
      const userId =
        socket.user._id.toString();

      console.log(
        `User connected: ${socket.user.name} (${userId})`
      );

      // ==========================================
      // JOIN PERSONAL USER ROOM
      // ==========================================

      socket.join(
        `user:${userId}`
      );

      // ==========================================
      // ONLINE USERS
      // ==========================================

      addOnlineSocket(
        userId,
        socket.id
      );

      // Update database online status
      await User.findByIdAndUpdate(
        userId,
        {
          isOnline: true,
        }
      );

      io.emit(
        "online_users",
        getOnlineUserIds()
      );

      // ==========================================
      // SEND EXISTING UNREAD MESSAGE COUNT
      // ==========================================

      try {
        const unreadCount =
          await Message.countDocuments({
            receiver:
              socket.user._id,

            isRead: false,

            deletedFor: {
              $ne:
                socket.user._id,
            },
          });

        socket.emit(
          "unread_count",
          {
            count: unreadCount,
          }
        );
      } catch (error) {
        console.error(
          "Unread count socket error:",
          error
        );
      }

      // ==========================================
      // SEND MESSAGE
      // ==========================================

      socket.on(
        "send_message",
        async (data) => {
          try {
            const {
              receiverId,
              text = "",
              messageType = "text",
              fileId = null,
              fileName = "",
              fileSize = 0,
              mimeType = "",
            } = data;

            // ==========================================
            // VALIDATE RECEIVER
            // ==========================================

            if (!receiverId) {
              socket.emit(
                "message_error",
                {
                  message:
                    "Receiver ID is required",
                }
              );

              return;
            }

            // ==========================================
            // PREVENT SELF MESSAGE
            // ==========================================

            if (
              socket.user._id.toString() ===
              receiverId.toString()
            ) {
              socket.emit(
                "message_error",
                {
                  message:
                    "You cannot send a message to yourself",
                }
              );

              return;
            }

            // ==========================================
            // FIND RECEIVER
            // ==========================================

            const receiver =
              await User.findById(
                receiverId
              );

            if (!receiver) {
              socket.emit(
                "message_error",
                {
                  message:
                    "Receiver not found",
                }
              );

              return;
            }

            // ==========================================
            // CHECK BLOCK STATUS
            // ==========================================

            const blocked =
              await isBlockedBetweenUsers(
                socket.user._id,
                receiverId
              );

            if (blocked) {
              socket.emit(
                "message_error",
                {
                  message:
                    "You cannot send messages to this user",

                  blocked: true,
                }
              );

              return;
            }

            // ==========================================
            // CHECK ACCEPTED CONNECTION
            // ==========================================

            const isConnected =
              await areUsersConnected(
                socket.user._id,
                receiverId
              );

            if (!isConnected) {
              socket.emit(
                "message_error",
                {
                  message:
                    "You can only send messages to connected users",
                }
              );

              return;
            }

            // ==========================================
            // VALIDATE MESSAGE
            // ==========================================

            if (
              messageType === "text" &&
              !text?.trim()
            ) {
              socket.emit(
                "message_error",
                {
                  message:
                    "Message is required",
                }
              );

              return;
            }

            if (
              (
                messageType === "image" ||
                messageType === "file"
              ) &&
              !fileId
            ) {
              socket.emit(
                "message_error",
                {
                  message:
                    "File is required",
                }
              );

              return;
            }

            // ==========================================
            // GET OR CREATE CONVERSATION
            // ==========================================

            const conversation =
              await getOrCreateConversation(
                socket.user._id,
                receiverId
              );

            // ==========================================
            // CREATE MESSAGE
            // ==========================================

            const message =
              new Message({
                conversation:
                  conversation._id,

                sender:
                  socket.user._id,

                receiver:
                  receiverId,

                text:
                  text?.trim() || "",

                messageType,

                fileId:
                  fileId || null,

                fileName:
                  fileName || "",

                fileSize:
                  fileSize || 0,

                mimeType:
                  mimeType || "",

                isDelivered: false,

                deliveredAt: null,

                isSeen: false,

                seenAt: null,

                isRead: false,

                isDeleted: false,

                deletedForEveryone:
                  false,

                deletedAt: null,

                deletedFor: [],
              });

            await message.save();

            // ==========================================
            // UPDATE LAST MESSAGE
            // ==========================================

            conversation.lastMessage =
              message._id;

            await conversation.save();

            // ==========================================
            // POPULATE MESSAGE
            // ==========================================

            await message.populate(
              "sender",
              "name email"
            );

            await message.populate(
              "receiver",
              "name email"
            );

            const messageData =
              message.toObject();

            // ==========================================
            // SEND TO SENDER
            // SEND TO ALL SENDER DEVICES / TABS
            // ==========================================

            io.to(
              `user:${userId}`
            ).emit(
              "message_sent",
              messageData
            );

            // ==========================================
            // SEND TO RECEIVER
            // SEND TO ALL RECEIVER DEVICES / TABS
            // ==========================================

            if (
              isUserOnline(receiverId)
            ) {
              io.to(
                `user:${receiverId}`
              ).emit(
                "receive_message",
                messageData
              );

              // ========================================
              // MARK MESSAGE AS DELIVERED
              // ========================================

              message.isDelivered =
                true;

              message.deliveredAt =
                new Date();

              await message.save();

              // ========================================
              // INFORM SENDER ABOUT DELIVERY
              // ========================================

              io.to(
                `user:${userId}`
              ).emit(
                "message_delivered",
                {
                  messageId:
                    message._id,

                  deliveredAt:
                    message.deliveredAt,
                }
              );
            }
          } catch (error) {
            console.error(
              "Send message socket error:",
              error
            );

            socket.emit(
              "message_error",
              {
                message:
                  "Failed to send message",
              }
            );
          }
        }
      );

      // ==========================================
      // MARK OLD MESSAGES AS DELIVERED
      // ==========================================

      socket.on(
        "mark_messages_delivered",
        async ({ senderId }) => {
          try {
            if (!senderId) {
              return;
            }

            const currentUserId =
              socket.user._id;

            const deliveredAt =
              new Date();

            const messages =
              await Message.find({
                sender: senderId,

                receiver:
                  currentUserId,

                isDelivered: false,

                deletedFor: {
                  $ne:
                    currentUserId,
                },

                isDeleted: false,
              }).select(
                "_id sender receiver"
              );

            if (!messages.length) {
              return;
            }

            await Message.updateMany(
              {
                sender: senderId,

                receiver:
                  currentUserId,

                isDelivered: false,

                deletedFor: {
                  $ne:
                    currentUserId,
                },

                isDeleted: false,
              },
              {
                $set: {
                  isDelivered: true,

                  deliveredAt,
                },
              }
            );

            // ========================================
            // SEND DELIVERY EVENT TO ORIGINAL SENDER
            // ========================================

            if (
              isUserOnline(senderId)
            ) {
              messages.forEach(
                (message) => {
                  io.to(
                    `user:${senderId}`
                  ).emit(
                    "message_delivered",
                    {
                      messageId:
                        message._id,

                      deliveredAt,
                    }
                  );
                }
              );
            }

            console.log(
              `Messages delivered: ${messages.length}`
            );
          } catch (error) {
            console.error(
              "Mark messages delivered error:",
              error
            );
          }
        }
      );

      // ==========================================
      // TYPING
      // ==========================================

      socket.on(
        "typing",
        async ({ receiverId }) => {
          try {
            if (!receiverId) {
              return;
            }

            // Blocked users should not receive typing events
            const blocked =
              await isBlockedBetweenUsers(
                socket.user._id,
                receiverId
              );

            if (blocked) {
              return;
            }

            const isConnected =
              await areUsersConnected(
                socket.user._id,
                receiverId
              );

            if (!isConnected) {
              return;
            }

            if (
              isUserOnline(receiverId)
            ) {
              io.to(
                `user:${receiverId}`
              ).emit(
                "user_typing",
                {
                  userId:
                    socket.user._id.toString(),
                }
              );
            }
          } catch (error) {
            console.error(
              "Typing error:",
              error
            );
          }
        }
      );

      // ==========================================
      // STOP TYPING
      // ==========================================

      socket.on(
        "stop_typing",
        async ({ receiverId }) => {
          try {
            if (!receiverId) {
              return;
            }

            // Blocked users should not receive typing events
            const blocked =
              await isBlockedBetweenUsers(
                socket.user._id,
                receiverId
              );

            if (blocked) {
              return;
            }

            const isConnected =
              await areUsersConnected(
                socket.user._id,
                receiverId
              );

            if (!isConnected) {
              return;
            }

            if (
              isUserOnline(receiverId)
            ) {
              io.to(
                `user:${receiverId}`
              ).emit(
                "user_stop_typing",
                {
                  userId:
                    socket.user._id.toString(),
                }
              );
            }
          } catch (error) {
            console.error(
              "Stop typing error:",
              error
            );
          }
        }
      );

      // ==========================================
      // MESSAGE SEEN
      // ==========================================

      socket.on(
        "message_seen",
        async ({ messageId }) => {
          try {
            if (!messageId) {
              return;
            }

            const message =
              await Message.findById(
                messageId
              );

            if (!message) {
              return;
            }

            // Only receiver can mark as seen
            if (
              message.receiver.toString() !==
              socket.user._id.toString()
            ) {
              return;
            }

            const seenAt =
              new Date();

            message.isSeen = true;

            message.isRead = true;

            message.isDelivered =
              true;

            message.seenAt =
              seenAt;

            message.deliveredAt =
              message.deliveredAt ||
              seenAt;

            await message.save();

            // ========================================
            // SEND SEEN UPDATE TO ALL SENDER DEVICES
            // ========================================

            if (
              isUserOnline(
                message.sender
              )
            ) {
              io.to(
                `user:${message.sender.toString()}`
              ).emit(
                "message_seen",
                {
                  messageId:
                    message._id,

                  seenAt,
                }
              );
            }
          } catch (error) {
            console.error(
              "Message seen error:",
              error
            );
          }
        }
      );

      // ==========================================
      // MARK MESSAGES AS READ
      // ==========================================

      socket.on(
        "mark_messages_read",
        async ({ senderId }) => {
          try {
            if (!senderId) {
              return;
            }

            const seenAt =
              new Date();

            const result =
              await Message.updateMany(
                {
                  sender:
                    senderId,

                  receiver:
                    socket.user._id,

                  isRead: false,

                  deletedFor: {
                    $ne:
                      socket.user._id,
                  },
                },
                {
                  $set: {
                    isRead: true,

                    isSeen: true,

                    isDelivered:
                      true,

                    seenAt,

                    deliveredAt:
                      seenAt,
                  },
                }
              );

            console.log(
              `Messages marked as read: ${result.modifiedCount}`
            );

            // ========================================
            // SEND READ UPDATE TO ALL SENDER DEVICES
            // ========================================

            if (
              isUserOnline(senderId)
            ) {
              io.to(
                `user:${senderId}`
              ).emit(
                "messages_read",
                {
                  userId:
                    socket.user._id,

                  readAt: seenAt,

                  count:
                    result.modifiedCount,
                }
              );
            }
          } catch (error) {
            console.error(
              "Mark messages read error:",
              error
            );
          }
        }
      );

      // ==========================================
      // DELETE MESSAGE
      // DELETE FOR ME / DELETE FOR EVERYONE
      // ==========================================

      socket.on(
        "delete_message",
        async ({
          messageId,
          deleteFor,
        }) => {
          try {
            if (!messageId) {
              socket.emit(
                "delete_message_error",
                {
                  messageId,

                  message:
                    "Message ID is required",
                }
              );

              return;
            }

            if (
              !["me", "everyone"].includes(
                deleteFor
              )
            ) {
              socket.emit(
                "delete_message_error",
                {
                  messageId,

                  message:
                    "deleteFor must be 'me' or 'everyone'",
                }
              );

              return;
            }

            const message =
              await Message.findById(
                messageId
              );

            if (!message) {
              socket.emit(
                "delete_message_error",
                {
                  messageId,

                  message:
                    "Message not found",
                }
              );

              return;
            }

            const currentUserId =
              socket.user._id.toString();

            const senderId =
              message.sender.toString();

            const receiverId =
              message.receiver.toString();

            const isSender =
              senderId ===
              currentUserId;

            const isReceiver =
              receiverId ===
              currentUserId;

            // ========================================
            // CHECK USER ACCESS
            // ========================================

            if (
              !isSender &&
              !isReceiver
            ) {
              socket.emit(
                "delete_message_error",
                {
                  messageId,

                  message:
                    "You are not allowed to delete this message",
                }
              );

              return;
            }

            // ========================================
            // DELETE FOR ME
            // ========================================

            if (
              deleteFor === "me"
            ) {
              await Message.findByIdAndUpdate(
                messageId,
                {
                  $addToSet: {
                    deletedFor:
                      socket.user._id,
                  },
                },
                {
                  new: true,
                }
              );

              // ========================================
              // SEND DELETE FOR ME TO ALL USER DEVICES
              // ========================================

              io.to(
                `user:${currentUserId}`
              ).emit(
                "message_deleted",
                {
                  messageId,

                  deleteFor: "me",

                  deletedBy:
                    currentUserId,
                }
              );

              return;
            }

            // ========================================
            // DELETE FOR EVERYONE
            // ONLY SENDER
            // ========================================

            if (!isSender) {
              socket.emit(
                "delete_message_error",
                {
                  messageId,

                  message:
                    "Only the sender can delete this message for everyone",
                }
              );

              return;
            }

            if (
              message.deletedForEveryone
            ) {
              socket.emit(
                "delete_message_error",
                {
                  messageId,

                  message:
                    "Message is already deleted for everyone",
                }
              );

              return;
            }

            // ========================================
            // DELETE FILE FROM GRIDFS
            // ========================================

            if (message.fileId) {
              try {
                const {
                  getGridFSBucket,
                } = require(
                  "../config/gridfs"
                );

                const bucket =
                  getGridFSBucket();

                await bucket.delete(
                  message.fileId
                );

                console.log(
                  `GridFS file deleted: ${message.fileId}`
                );
              } catch (fileError) {
                console.error(
                  "GridFS file deletion error:",
                  fileError
                );
              }
            }

            // ========================================
            // MARK MESSAGE AS DELETED
            // ========================================

            message.isDeleted =
              true;

            message.deletedForEveryone =
              true;

            message.deletedAt =
              new Date();

            message.text = "";

            message.fileId = null;

            message.fileName = "";

            message.fileSize = 0;

            message.mimeType = "";

            message.messageType =
              "text";

            await message.save();

            // ========================================
            // SEND DELETE UPDATE TO ALL SENDER DEVICES
            // ========================================

            io.to(
              `user:${currentUserId}`
            ).emit(
              "message_deleted",
              {
                messageId,

                deleteFor:
                  "everyone",

                deletedBy:
                  currentUserId,

                deletedAt:
                  message.deletedAt,
              }
            );

            // ========================================
            // SEND DELETE UPDATE TO ALL RECEIVER DEVICES
            // ========================================

            if (
              isUserOnline(receiverId)
            ) {
              io.to(
                `user:${receiverId}`
              ).emit(
                "message_deleted",
                {
                  messageId,

                  deleteFor:
                    "everyone",

                  deletedBy:
                    currentUserId,

                  deletedAt:
                    message.deletedAt,
                }
              );
            }
          } catch (error) {
            console.error(
              "Delete message socket error:",
              error
            );

            socket.emit(
              "delete_message_error",
              {
                messageId,

                message:
                  "Failed to send message",
              }
            );
          }
        }
      );

      // ==========================================
      // DISCONNECT
      // ==========================================

      socket.on(
        "disconnect",
        async () => {
          try {
            console.log(
              `User disconnected: ${socket.user.name} (${userId})`
            );

            // Remove only this socket
            const stillOnline =
              removeOnlineSocket(
                userId,
                socket.id
              );

            // User still has another tab/device connected
            if (stillOnline) {
              console.log(
                `User ${userId} is still online on another device/tab`
              );

              return;
            }

            const lastSeen =
              new Date();

            // Update user's offline status
            // and last seen time.
            await User.findByIdAndUpdate(
              userId,
              {
                isOnline: false,

                lastSeen,
              }
            );

            // Update all connected clients
            io.emit(
              "online_users",
              getOnlineUserIds()
            );

            // Send last seen information
            // to all connected clients.
            io.emit(
              "user_offline",
              {
                userId,

                lastSeen,
              }
            );

            console.log(
              `Last seen updated for ${userId}:`,
              lastSeen
            );
          } catch (error) {
            console.error(
              "Disconnect error:",
              error
            );
          }
        }
      );
    }
  );
};

module.exports = socketHandler;