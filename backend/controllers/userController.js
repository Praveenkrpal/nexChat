const User = require("../models/User");

// ==========================================
// GET ALL USERS
// ==========================================

const getUsers = async (req, res) => {
  try {
    const users = await User.find({
      _id: {
        $ne: req.user.userId,
      },
    })
      .select("-password")
      .sort({
        name: 1,
      });

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

// ==========================================
// SEARCH USERS
// ==========================================

const searchUsers = async (req, res) => {
  try {
    const { search } = req.query;

    const users = await User.find({
      _id: {
        $ne: req.user.userId,
      },

      $or: [
        {
          name: {
            $regex: search || "",
            $options: "i",
          },
        },
        {
          email: {
            $regex: search || "",
            $options: "i",
          },
        },
      ],
    })
      .select("-password")
      .limit(20);

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Search failed",
    });
  }
};

// ==========================================
// GET MY PROFILE
// ==========================================

const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get profile error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
};

// ==========================================
// FIND USER BY NEXCHAT ID
// ==========================================

const getUserByNexChatId = async (req, res) => {
  try {
    const { nexChatId } = req.params;

    if (!nexChatId) {
      return res.status(400).json({
        success: false,
        message: "NexChat ID is required",
      });
    }

    const normalizedNexChatId = nexChatId.trim().toUpperCase();

    const user = await User.findOne({
      nexChatId: normalizedNexChatId,
    }).select(
      "_id name nexChatId avatar isOnline lastSeen"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Don't allow searching yourself
    if (
      user._id.toString() ===
      req.user.userId.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: "You cannot search for yourself",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(
      "Get user by NexChat ID error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==========================================
// UPDATE MY PROFILE
// ==========================================

const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { name, email, avatar } = req.body;

    // Find current user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ==========================================
    // UPDATE NAME
    // ==========================================

    if (name !== undefined) {
      const trimmedName = name.trim();

      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty",
        });
      }

      user.name = trimmedName;
    }

    // ==========================================
    // UPDATE EMAIL
    // ==========================================

    if (email !== undefined) {
      const trimmedEmail = email.trim().toLowerCase();

      if (!trimmedEmail) {
        return res.status(400).json({
          success: false,
          message: "Email cannot be empty",
        });
      }

      // Check whether another user already
      // has this email
      const existingUser = await User.findOne({
        email: trimmedEmail,
        _id: {
          $ne: userId,
        },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email is already in use",
        });
      }

      user.email = trimmedEmail;
    }

    // ==========================================
    // UPDATE AVATAR
    // ==========================================

    if (avatar !== undefined) {
      user.avatar = avatar;
    }

    await user.save();

    // Remove password from response
    const updatedUser = await User.findById(userId).select("-password");

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  getUsers,
  searchUsers,
  getMyProfile,
  updateMyProfile,
  getUserByNexChatId,
};