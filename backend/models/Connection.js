const mongoose = require("mongoose");

const connectionSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },

    // Identifies a pair regardless of request direction.
    pairKey: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

connectionSchema.index({ requester: 1, status: 1 });
connectionSchema.index({ receiver: 1, status: 1 });

module.exports = mongoose.model(
  "Connection",
  connectionSchema
);