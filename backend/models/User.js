const mongoose = require("mongoose");
const crypto = require("crypto");

const NEXCHAT_ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const generateNexChatId = () => {
  let randomPart = "";

  for (let i = 0; i < 8; i++) {
    randomPart +=
      NEXCHAT_ID_ALPHABET[
        crypto.randomInt(0, NEXCHAT_ID_ALPHABET.length)
      ];
  }

  return `NC-${randomPart}`;
};

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

     // UNIQUE NEXCHAT ID
     nexChatId: {
      type: String,
      unique: true,
      sparse: true,
      immutable: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    // EMAIL
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationOtp: {
      type: String,
      default: null,
    },

    emailVerificationExpires: {
      type: Date,
      default: null,
    },

    emailVerificationAttempts: {
      type: Number,
      default: 0,
    },

    emailVerificationLastSentAt: {
      type: Date,
      default: null,
    },

    // MOBILE
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    phoneVerified: {
      type: Boolean,
      default: false,
    },

    phoneVerificationId: {
      type: String,
      default: null,
    },

    phoneVerificationExpires: {
      type: Date,
      default: null,
    },

    phoneVerificationAttempts: {
      type: Number,
      default: 0,
    },

    phoneVerificationLastSentAt: {
      type: Date,
      default: null,
    },

    // PASSWORD RESET
    passwordResetMethod: {
      type: String,
      enum: ["email", "mobile", null],
      default: null,
    },

    passwordResetOtp: {
      type: String,
      default: null,
    },

    passwordResetVerificationId: {
      type: String,
      default: null,
    },

    passwordResetExpires: {
      type: Date,
      default: null,
    },

    passwordResetAttempts: {
      type: Number,
      default: 0,
    },

    passwordResetLastSentAt: {
      type: Date,
      default: null,
    },

    passwordResetTokenHash: {
      type: String,
      default: null,
    },

    passwordResetTokenExpires: {
      type: Date,
      default: null,
    },

    // SESSION / PASSWORD SECURITY
    tokenVersion: {
      type: Number,
      default: 0,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },

    // PASSWORD
    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    // PROFILE
    avatar: {
      type: String,
      default: "",
    },

    // ONLINE STATUS
    isOnline: {
      type: Boolean,
      default: false,
    },

    lastSeen: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Generate NexChat ID automatically for NEW users
userSchema.pre("save", async function () {
  if (!this.isNew || this.nexChatId) {
    return;
  }

  let nexChatId;
  let exists = true;

  while (exists) {
    nexChatId = generateNexChatId();

    exists = await this.constructor.exists({
      nexChatId,
    });
  }

  this.nexChatId = nexChatId;
});

module.exports = mongoose.model("User", userSchema);