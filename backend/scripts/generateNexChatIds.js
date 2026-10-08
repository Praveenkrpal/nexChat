require("dotenv").config();

const mongoose = require("mongoose");
const crypto = require("crypto");

const User = require("../models/User");

// ==========================================
// NEXCHAT ID CONFIG
// ==========================================

const NEXCHAT_ID_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

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

// ==========================================
// GENERATE UNIQUE NEXCHAT ID
// ==========================================

const generateUniqueNexChatId = async () => {
  let nexChatId;
  let exists = true;

  while (exists) {
    nexChatId = generateNexChatId();

    exists = await User.exists({
      nexChatId,
    });
  }

  return nexChatId;
};

// ==========================================
// MIGRATE EXISTING USERS
// ==========================================

const migrateUsers = async () => {
  try {
    // ==========================================
    // CONNECT TO MONGODB
    // ==========================================

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

    // ==========================================
    // FIND USERS WITHOUT NEXCHAT ID
    // ==========================================

    const users = await User.find({
      $or: [
        { nexChatId: { $exists: false } },
        { nexChatId: null },
        { nexChatId: "" },
      ],
    }).select("_id name nexChatId");

    console.log(
      `Users without NexChat ID: ${users.length}`
    );

    // ==========================================
    // GENERATE ID FOR EACH USER
    // ==========================================

    for (const user of users) {
      const nexChatId = await generateUniqueNexChatId();

      // Use updateOne because nexChatId is immutable
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            nexChatId,
          },
        }
      );

      console.log(
        `${user.name} -> ${nexChatId}`
      );
    }

    // ==========================================
    // COMPLETED
    // ==========================================

    console.log(
      "NexChat ID migration completed successfully"
    );

    await mongoose.disconnect();

    process.exit(0);
  } catch (error) {
    console.error(
      "NexChat ID migration error:",
      error
    );

    await mongoose.disconnect();

    process.exit(1);
  }
};

// ==========================================
// START MIGRATION
// ==========================================

migrateUsers();