const express = require("express");

const {
  getUsers,
  searchUsers,
  getMyProfile,
  updateMyProfile,
  getUserByNexChatId,
} = require("../controllers/userController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// GET ALL USERS
// ==========================================

router.get("/", protect, getUsers);

// ==========================================
// SEARCH USERS
// ==========================================

router.get("/search", protect, searchUsers);

// ==========================================
// MY PROFILE
// ==========================================

// Get logged-in user's profile
router.get("/profile", protect, getMyProfile);

// Update logged-in user's profile
router.put("/profile", protect, updateMyProfile);

//=====GET UNIQUE USER ID============= 
router.get(
  "/nexchat/:nexChatId",
  protect,
  getUserByNexChatId
);

module.exports = router;