const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    text: {
      type: String,
      trim: true,
      default: "",
    },

    messageType: {
      type: String,
      enum: ["text", "image", "file", "audio", "video"],
      default: "text",
    },

    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    fileName: {
      type: String,
      default: "",
    },

    fileSize: {
      type: Number,
      default: 0,
    },

    mimeType: {
      type: String,
      default: "",
    },

    // ==========================================
    // MESSAGE DELIVERY STATUS
    // ==========================================

    isDelivered: {
      type: Boolean,
      default: false,
    },

    deliveredAt: {
      type: Date,
      default: null,
    },

    // ==========================================
    // MESSAGE SEEN STATUS
    // ==========================================

    isSeen: {
      type: Boolean,
      default: false,
    },

    seenAt: {
      type: Date,
      default: null,
    },

    // ==========================================
    // MESSAGE READ STATUS
    // ==========================================

    isRead: {
      type: Boolean,
      default: false,
    },

    // ==========================================
    // MESSAGE DELETE STATUS
    // ==========================================

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedForEveryone: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    // ==========================================
    // DELETE FOR ME
    // Stores users who deleted this message
    // from their own chat
    // ==========================================

    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Message", messageSchema);