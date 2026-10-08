const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const verifiedUser = require("../middleware/verifiedUserMiddleware");

const upload = require("../middleware/uploadMiddleware");

const {
  getMessages,
  sendMessage,
  getUnreadMessages,
  markMessagesAsRead,
  getConversations,
  uploadFile,
  getFile,
  deleteMessage,
} = require("../controllers/messageController");

// ==========================================
// UNREAD MESSAGES
// ==========================================

router.get(
  "/unread",
  authMiddleware,
  verifiedUser,
  getUnreadMessages
);

// ==========================================
// CONVERSATIONS
// ==========================================

router.get(
  "/conversations",
  authMiddleware,
  verifiedUser,
  getConversations
);

// ==========================================
// MARK MESSAGES AS READ
// ==========================================

router.put(
  "/read/:userId",
  authMiddleware,
  verifiedUser,
  markMessagesAsRead
);

// ==========================================
// UPLOAD FILE
// ==========================================

router.post(
  "/upload",
  authMiddleware,
  verifiedUser,
  upload.single("file"),
  uploadFile
);

// ==========================================
// GET FILE FROM GRIDFS
// ==========================================

router.get(
  "/file/:fileId",
  authMiddleware,
  verifiedUser,
  getFile
);

// ==========================================
// DELETE MESSAGE
// Delete for Me / Delete for Everyone
// ==========================================

router.delete(
  "/:messageId",
  authMiddleware,
  verifiedUser,
  deleteMessage
);

// ==========================================
// GET CHAT MESSAGES
// ==========================================

router.get(
  "/:userId",
  authMiddleware,
  verifiedUser,
  getMessages
);

// ==========================================
// SEND MESSAGE
// ==========================================

router.post(
  "/",
  authMiddleware,
  verifiedUser,
  sendMessage
);

module.exports = router;