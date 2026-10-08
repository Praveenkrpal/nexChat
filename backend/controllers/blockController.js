const Block = require("../models/Block");
const User = require("../models/User");

// ==========================================
// BLOCK USER
// ==========================================

const blockUser = async (req, res) => {
  try {
    const blockerId = req.user.userId;
    const { userId } = req.params;

    // ==========================================
    // VALIDATE USER ID
    // ==========================================

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // ==========================================
    // PREVENT SELF BLOCK
    // ==========================================

    if (blockerId.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot block yourself",
      });
    }

    // ==========================================
    // CHECK USER EXISTS
    // ==========================================

    const user = await User.findById(userId).select("_id name");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ==========================================
    // CHECK ALREADY BLOCKED
    // ==========================================

    const existingBlock = await Block.findOne({
      blocker: blockerId,
      blocked: userId,
    });

    if (existingBlock) {
      return res.status(400).json({
        success: false,
        message: "User is already blocked",
        blocked: true,
      });
    }

    // ==========================================
    // CREATE BLOCK
    // ==========================================

    const block = await Block.create({
      blocker: blockerId,
      blocked: userId,
    });

    return res.status(201).json({
      success: true,
      message: "User blocked successfully",
      blocked: true,
      block,
    });
  } catch (error) {
    console.error("Block user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to block user",
    });
  }
};

// ==========================================
// UNBLOCK USER
// ==========================================

const unblockUser = async (req, res) => {
  try {
    const blockerId = req.user.userId;
    const { userId } = req.params;

    // ==========================================
    // VALIDATE USER ID
    // ==========================================

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // ==========================================
    // DELETE BLOCK
    // ==========================================

    const deletedBlock =
      await Block.findOneAndDelete({
        blocker: blockerId,
        blocked: userId,
      });

    if (!deletedBlock) {
      return res.status(404).json({
        success: false,
        message: "User is not blocked",
        blocked: false,
      });
    }

    return res.status(200).json({
      success: true,
      message: "User unblocked successfully",
      blocked: false,
    });
  } catch (error) {
    console.error("Unblock user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to unblock user",
    });
  }
};

// ==========================================
// CHECK BLOCK STATUS
// ==========================================

const getBlockStatus = async (req, res) => {
  try {
    const blockerId = req.user.userId;
    const { userId } = req.params;

    const block = await Block.findOne({
      blocker: blockerId,
      blocked: userId,
    }).lean();

    return res.status(200).json({
      success: true,
      blocked: !!block,
    });
  } catch (error) {
    console.error(
      "Get block status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to check block status",
    });
  }
};

// ==========================================
// GET MY BLOCKED USERS
// ==========================================

const getBlockedUsers = async (req, res) => {
  try {
    const blockerId = req.user.userId;

    const blocks = await Block.find({
      blocker: blockerId,
    })
      .populate(
        "blocked",
        "name email phone avatar isOnline lastSeen"
      )
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      blockedUsers: blocks,
    });
  } catch (error) {
    console.error(
      "Get blocked users error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch blocked users",
    });
  }
};

module.exports = {
  blockUser,
  unblockUser,
  getBlockStatus,
  getBlockedUsers,
};