const express = require("express");

const {
  sendConnectionRequest,
  getConnectionRequests,
  getSentRequests,
  acceptConnectionRequest,
  rejectConnectionRequest,
  getConnections,
} = require("../controllers/connectionController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// SEND CONNECTION REQUEST
// POST /api/connections/request/:userId
// ==========================================

router.post(
  "/request/:userId",
  protect,
  sendConnectionRequest
);

// ==========================================
// GET INCOMING REQUESTS
// GET /api/connections/requests
// ==========================================

router.get(
  "/requests",
  protect,
  getConnectionRequests
);

// ==========================================
// GET SENT REQUESTS
// GET /api/connections/sent
// ==========================================

router.get(
  "/sent",
  protect,
  getSentRequests
);

// ==========================================
// ACCEPT REQUEST
// PATCH /api/connections/:id/accept
// ==========================================

router.patch(
  "/:id/accept",
  protect,
  acceptConnectionRequest
);

// ==========================================
// REJECT REQUEST
// PATCH /api/connections/:id/reject
// ==========================================

router.patch(
  "/:id/reject",
  protect,
  rejectConnectionRequest
);

// ==========================================
// GET ACCEPTED CONNECTIONS
// GET /api/connections
// ==========================================

router.get(
  "/",
  protect,
  getConnections
);

module.exports = router;