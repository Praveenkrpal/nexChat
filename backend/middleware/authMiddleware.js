const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    // ==========================================
    // GET AUTHORIZATION HEADER
    // ==========================================

    const authHeader =
      req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message:
          "Authorization token missing",
      });
    }

    // ==========================================
    // EXTRACT TOKEN
    // ==========================================

    const token =
      authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "Authorization token missing",
      });
    }

    // ==========================================
    // VERIFY JWT
    // ==========================================

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // ==========================================
    // GET USER ID
    // ==========================================

    const userId =
      decoded.userId || decoded.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authentication token",
      });
    }

    // ==========================================
    // GET CURRENT TOKEN VERSION
    // ==========================================

    const user =
      await User.findById(userId).select(
        "_id tokenVersion"
      );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // ==========================================
    // CHECK TOKEN VERSION
    // ==========================================

    const tokenVersion =
      decoded.tokenVersion ?? 0;

    const currentTokenVersion =
      user.tokenVersion ?? 0;

    if (
      tokenVersion !==
      currentTokenVersion
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Session expired. Please login again.",
      });
    }

    // ==========================================
    // AUTHENTICATED USER
    // ==========================================

    req.user = decoded;

    next();
  } catch (error) {
    console.error(
      "Auth middleware error:",
      error.message
    );

    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired token",
    });
  }
};

module.exports = protect;