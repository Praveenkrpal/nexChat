const User = require("../models/User");

const verifiedUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "_id email phone emailVerified phoneVerified"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // User must verify at least one:
    // Email OR Mobile
    if (!user.emailVerified && !user.phoneVerified) {
      return res.status(403).json({
        success: false,
        message:
          "Please verify your email or mobile number before using NexChat",
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
      });
    }

    req.userAccount = user;

    next();
  } catch (error) {
    console.error("Verified user middleware error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = verifiedUser;