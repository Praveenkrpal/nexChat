const mongoose = require("mongoose");

const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const Block = require("../models/Block");

const {
  getGridFSBucket,
} = require("../config/gridfs");

// ==========================================
// GET OR CREATE CONVERSATION
// ==========================================

const getOrCreateConversation = async (
  userId,
  otherUserId
) => {
  let conversation = await Conversation.findOne({
    participants: {
      $all: [
        userId,
        otherUserId,
      ],
    },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [
        userId,
        otherUserId,
      ],
    });
  }

  return conversation;
};

// ==========================================
// CHECK BLOCK STATUS
// ==========================================

const isBlockedBetweenUsers = async (
  userId,
  otherUserId
) => {
  const block = await Block.findOne({
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
// GET MESSAGES WITH A USER
// ==========================================

const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;

    const currentUserId = req.user.userId;

    // ==========================================
    // FIND EXISTING CONVERSATION
    // ==========================================

    const conversation = await Conversation.findOne({
      participants: {
        $all: [
          currentUserId,
          userId,
        ],
      },
    });

    // ==========================================
    // NO CONVERSATION YET
    // ==========================================

    if (!conversation) {
      return res.status(200).json({
        success: true,
        conversationId: null,
        messages: [],
      });
    }

    // ==========================================
    // FETCH EXISTING MESSAGES
    // ==========================================

    const messages = await Message.find({
      conversation: conversation._id,

      deletedFor: {
        $ne: currentUserId,
      },
    })
      .populate(
        "sender",
        "name email"
      )
      .populate(
        "receiver",
        "name email"
      )
      .sort({
        createdAt: 1,
      });

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,

      conversationId:
        conversation._id,

      messages,
    });
  } catch (error) {
    console.error(
      "Get messages error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch messages",
    });
  }
};

// ==========================================
// SEND MESSAGE - REST API
// ==========================================

const sendMessage = async (
  req,
  res
) => {
  try {
    const {
      receiverId,
      text,
      messageType,
      fileId,
      fileName,
      fileSize,
      mimeType,
    } = req.body;

    const senderId = req.user.userId;

    // ==========================================
    // VALIDATE RECEIVER
    // ==========================================

    if (!receiverId) {
      return res.status(400).json({
        success: false,

        message:
          "Receiver is required",
      });
    }

    // ==========================================
    // CHECK BLOCK STATUS
    // ==========================================

    const blocked =
      await isBlockedBetweenUsers(
        senderId,
        receiverId
      );

    if (blocked) {
      return res.status(403).json({
        success: false,

        message:
          "You cannot send messages to this user",

        blocked: true,
      });
    }

    // ==========================================
    // MESSAGE TYPE
    // ==========================================

    const type =
      messageType || "text";

    // ==========================================
    // TEXT VALIDATION
    // ==========================================

    if (
      type === "text" &&
      !text?.trim()
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Message is required",
      });
    }

    // ==========================================
    // FILE / IMAGE VALIDATION
    // ==========================================

    if (
      (type === "image" ||
        type === "file") &&
      !fileId
    ) {
      return res.status(400).json({
        success: false,

        message:
          "File is required",
      });
    }

    // ==========================================
    // GET OR CREATE CONVERSATION
    // ==========================================

    const conversation =
      await getOrCreateConversation(
        senderId,
        receiverId
      );

    // ==========================================
    // CREATE MESSAGE
    // ==========================================

    const message =
      await Message.create({
        conversation:
          conversation._id,

        sender: senderId,

        receiver: receiverId,

        text:
          text?.trim() || "",

        messageType: type,

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

        deletedForEveryone: false,

        deletedAt: null,

        deletedFor: [],
      });

    // ==========================================
    // UPDATE LAST MESSAGE
    // ==========================================

    conversation.lastMessage =
      message._id;

    await conversation.save();

    // ==========================================
    // POPULATE MESSAGE
    // ==========================================

    const populatedMessage =
      await Message.findById(
        message._id
      )
        .populate(
          "sender",
          "name email"
        )
        .populate(
          "receiver",
          "name email"
        );

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(201).json({
      success: true,

      message:
        populatedMessage,
    });
  } catch (error) {
    console.error(
      "Send message error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to send message",
    });
  }
};

// ==========================================
// GET UNREAD MESSAGES
// ==========================================

const getUnreadMessages = async (
  req,
  res
) => {
  try {
    const currentUserId =
      req.user.userId;

    const messages =
      await Message.find({
        receiver:
          currentUserId,

        isRead: false,

        deletedFor: {
          $ne: currentUserId,
        },
      })
        .populate(
          "sender",
          "name email"
        )
        .populate(
          "receiver",
          "name email"
        )
        .sort({
          createdAt: 1,
        });

    return res.status(200).json({
      success: true,

      count:
        messages.length,

      messages,
    });
  } catch (error) {
    console.error(
      "Get unread messages error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch unread messages",
    });
  }
};

// ==========================================
// MARK MESSAGES AS READ
// ==========================================

const markMessagesAsRead = async (
  req,
  res
) => {
  try {
    const currentUserId =
      req.user.userId;

    const { userId } =
      req.params;

    const seenAt =
      new Date();

    const result =
      await Message.updateMany(
        {
          sender: userId,

          receiver:
            currentUserId,

          isRead: false,

          deletedFor: {
            $ne: currentUserId,
          },
        },
        {
          $set: {
            isRead: true,

            isSeen: true,

            isDelivered: true,

            seenAt,

            deliveredAt:
              seenAt,
          },
        }
      );

    return res.status(200).json({
      success: true,

      message:
        "Messages marked as read",

      modifiedCount:
        result.modifiedCount,
    });
  } catch (error) {
    console.error(
      "Mark messages as read error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to mark messages as read",
    });
  }
};

// ==========================================
// DELETE MESSAGE
// DELETE FOR ME / DELETE FOR EVERYONE
// ==========================================

const deleteMessage = async (
  req,
  res
) => {
  try {
    const currentUserId =
      req.user.userId;

    const { messageId } =
      req.params;

    const {
      deleteFor,
    } = req.body;

    // ==========================================
    // VALIDATE MESSAGE ID
    // ==========================================

    if (
      !mongoose.Types.ObjectId.isValid(
        messageId
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Invalid message ID",
      });
    }

    // ==========================================
    // VALIDATE DELETE TYPE
    // ==========================================

    if (
      !["me", "everyone"].includes(
        deleteFor
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          "deleteFor must be 'me' or 'everyone'",
      });
    }

    // ==========================================
    // FIND MESSAGE
    // ==========================================

    const message =
      await Message.findById(
        messageId
      );

    if (!message) {
      return res.status(404).json({
        success: false,

        message:
          "Message not found",
      });
    }

    // ==========================================
    // CHECK USER PARTICIPATION
    // ==========================================

    const isSender =
      message.sender.toString() ===
      currentUserId.toString();

    const isReceiver =
      message.receiver.toString() ===
      currentUserId.toString();

    if (
      !isSender &&
      !isReceiver
    ) {
      return res.status(403).json({
        success: false,

        message:
          "You are not allowed to delete this message",
      });
    }

    // ==========================================
    // DELETE FOR ME
    // ==========================================

    if (deleteFor === "me") {
      await Message.findByIdAndUpdate(
        messageId,
        {
          $addToSet: {
            deletedFor:
              currentUserId,
          },
        },
        {
          new: true,
        }
      );

      return res.status(200).json({
        success: true,

        deleteFor: "me",

        messageId,
      });
    }

    // ==========================================
    // DELETE FOR EVERYONE
    // ==========================================

    if (!isSender) {
      return res.status(403).json({
        success: false,

        message:
          "Only the sender can delete this message for everyone",
      });
    }

    // ==========================================
    // ALREADY DELETED
    // ==========================================

    if (
      message.deletedForEveryone
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Message is already deleted for everyone",
      });
    }

    // ==========================================
    // DELETE FILE FROM GRIDFS
    // ==========================================

    if (message.fileId) {
      try {
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

        // Continue deleting the message.
        // The GridFS file may already be missing.
      }
    }

    // ==========================================
    // MARK MESSAGE AS DELETED
    // ==========================================

    message.isDeleted = true;

    message.deletedForEveryone =
      true;

    message.deletedAt =
      new Date();

    // ==========================================
    // CLEAR MESSAGE CONTENT
    // ==========================================

    message.text = "";

    message.fileId = null;

    message.fileName = "";

    message.fileSize = 0;

    message.mimeType = "";

    message.messageType = "text";

    await message.save();

    return res.status(200).json({
      success: true,

      deleteFor: "everyone",

      messageId,

      message: {
        _id: message._id,

        isDeleted:
          message.isDeleted,

        deletedForEveryone:
          message.deletedForEveryone,

        deletedAt:
          message.deletedAt,
      },
    });
  } catch (error) {
    console.error(
      "Delete message error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to delete message",
    });
  }
};

// ==========================================
// GET CONVERSATIONS
// ==========================================

const getConversations = async (
  req,
  res
) => {
  try {
    if (
      !req.user ||
      !req.user.userId
    ) {
      console.error(
        "Get conversations: User not authenticated"
      );

      return res.status(401).json({
        success: false,

        message:
          "User authentication required",
      });
    }

    const currentUserId =
      req.user.userId;

    const conversations =
      await Conversation.find({
        participants:
          currentUserId,
      })
        .populate(
          "participants",
          "name email isOnline lastSeen"
        )
        .populate(
          "lastMessage"
        )
        .sort({
          updatedAt: -1,
        });

    const result = [];

    for (
      const conversation of conversations
    ) {
      const otherUser =
        conversation.participants.find(
          (participant) =>
            participant._id.toString() !==
            currentUserId.toString()
        );

      if (!otherUser) {
        continue;
      }

      // ========================================
      // GET UNREAD COUNT
      // ========================================

      const unreadCount =
        await Message.countDocuments({
          conversation:
            conversation._id,

          receiver:
            currentUserId,

          isRead: false,

          deletedFor: {
            $ne: currentUserId,
          },
        });

      // ========================================
      // LAST MESSAGE
      // ========================================

      let lastMessage =
        conversation.lastMessage ||
        null;

      // If the latest message was deleted
      // for me, find the latest visible message.

      if (
        lastMessage &&
        Array.isArray(
          lastMessage.deletedFor
        ) &&
        lastMessage.deletedFor.some(
          (id) =>
            id.toString() ===
            currentUserId.toString()
        )
      ) {
        lastMessage =
          await Message.findOne({
            conversation:
              conversation._id,

            deletedFor: {
              $ne: currentUserId,
            },
          })
            .sort({
              createdAt: -1,
            })
            .populate(
              "sender",
              "name email"
            )
            .populate(
              "receiver",
              "name email"
            );
      }

      result.push({
        conversationId:
          conversation._id,

        user: otherUser,

        lastMessage,

        unreadCount,

        updatedAt:
          conversation.updatedAt,
      });
    }

    return res.status(200).json({
      success: true,

      conversations: result,
    });
  } catch (error) {
    console.error(
      "GET CONVERSATIONS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch conversations",

      error:
        error.message,
    });
  }
};

// ==========================================
// UPLOAD FILE TO GRIDFS
// ==========================================

const uploadFile = async (
  req,
  res
) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,

        message:
          "Please select a file",
      });
    }

    const bucket =
      getGridFSBucket();

    const file = req.file;

    const uploadStream =
      bucket.openUploadStream(
        file.originalname,
        {
          metadata: {
            contentType:
              file.mimetype,

            originalName:
              file.originalname,

            uploadedBy:
              req.user.userId,
          },
        }
      );

    uploadStream.on(
      "finish",
      () => {
        res.status(201).json({
          success: true,

          message:
            "File uploaded successfully",

          file: {
            fileId:
              uploadStream.id,

            fileName:
              file.originalname,

            fileSize:
              file.size,

            mimeType:
              file.mimetype,
          },
        });
      }
    );

    uploadStream.on(
      "error",
      (error) => {
        console.error(
          "GridFS upload error:",
          error
        );

        if (!res.headersSent) {
          res.status(500).json({
            success: false,

            message:
              "File upload failed",
          });
        }
      }
    );

    uploadStream.end(
      file.buffer
    );
  } catch (error) {
    console.error(
      "Upload file error:",
      error
    );

    res.status(500).json({
      success: false,

      message:
        "Failed to upload file",
    });
  }
};

// ==========================================
// GET FILE FROM GRIDFS
// ==========================================

const getFile = async (
  req,
  res
) => {
  try {
    const { fileId } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        fileId
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Invalid file ID",
      });
    }

    const objectId =
      new mongoose.Types.ObjectId(
        fileId
      );

    const bucket =
      getGridFSBucket();

    const files =
      await bucket
        .find({
          _id: objectId,
        })
        .toArray();

    if (!files.length) {
      return res.status(404).json({
        success: false,

        message:
          "File not found",
      });
    }

    const file =
      files[0];

    res.set(
      "Content-Type",
      file.metadata?.contentType ||
        "application/octet-stream"
    );

    res.set(
      "Content-Length",
      file.length.toString()
    );

    res.set(
      "Content-Disposition",
      `inline; filename="${file.filename}"`
    );

    const downloadStream =
      bucket.openDownloadStream(
        objectId
      );

    downloadStream.on(
      "error",
      (error) => {
        console.error(
          "GridFS download error:",
          error
        );

        if (!res.headersSent) {
          res.status(500).json({
            success: false,

            message:
              "Failed to retrieve file",
          });
        }
      }
    );

    downloadStream.pipe(res);
  } catch (error) {
    console.error(
      "Get file error:",
      error
    );

    if (!res.headersSent) {
      res.status(500).json({
        success: false,

        message:
          "Failed to retrieve file",
      });
    }
  }
};

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  getMessages,
  sendMessage,
  getUnreadMessages,
  markMessagesAsRead,
  getConversations,
  uploadFile,
  getFile,
  getOrCreateConversation,
  deleteMessage,
  isBlockedBetweenUsers,
};