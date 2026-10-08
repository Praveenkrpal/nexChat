const express = require("express");

const {
  blockUser,
  unblockUser,
  getBlockStatus,
  getBlockedUsers,
} = require("../controllers/blockController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Get all blocked users
router.get("/", protect, getBlockedUsers);

// Check block status
router.get("/:userId", protect, getBlockStatus);

// Block user
router.post("/:userId", protect, blockUser);

// Unblock user
router.delete("/:userId", protect, unblockUser);

module.exports = router;