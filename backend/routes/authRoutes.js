const express = require("express");

const {
  register,
  login,
  verifyEmail,
  sendMobileOtpController,
  verifyMobileOtpController,
  resendEmailOtpController,
  getMe,

  // PASSWORD RESET
  forgotPasswordController,
  verifyPasswordResetOtpController,
  resetPasswordController,
  logoutController,
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

const {
  otpSendRateLimit,
  otpVerifyRateLimit,
} = require("../middleware/otpRateLimitMiddleware");

const router = express.Router();

// ==========================================
// EMAIL / BASIC AUTH
// ==========================================

router.post("/register", register);

router.post("/login", login);

// ==========================================
// EMAIL VERIFICATION
// ==========================================

// Verify Email OTP
router.post(
  "/verify-email",
  otpVerifyRateLimit,
  verifyEmail
);

// Resend Email OTP
router.post(
  "/resend-email-otp",
  otpSendRateLimit,
  resendEmailOtpController
);

// ==========================================
// MOBILE AUTH
// ==========================================

// Send / Resend Mobile OTP
router.post(
  "/send-mobile-otp",
  otpSendRateLimit,
  sendMobileOtpController
);

// Verify Mobile OTP
router.post(
  "/verify-mobile-otp",
  otpVerifyRateLimit,
  verifyMobileOtpController
);

// ==========================================
// FORGOT PASSWORD
// ==========================================

// Step 1:
// Send password reset OTP
//
// Email:
// POST /api/auth/forgot-password
//
// Mobile:
// POST /api/auth/forgot-password
//
router.post(
  "/forgot-password",
  otpSendRateLimit,
  forgotPasswordController
);

// ==========================================
// PASSWORD RESET OTP VERIFICATION
// ==========================================

// Step 2:
// Verify reset OTP and generate reset token
router.post(
  "/verify-password-reset-otp",
  otpVerifyRateLimit,
  verifyPasswordResetOtpController
);

// ==========================================
// RESET PASSWORD
// ==========================================

// Step 3:
// Set new password using reset token
router.post(
  "/reset-password",
  resetPasswordController
);

// ==========================================
// LOGOUT
// ==========================================
router.post(
  "/logout",
  protect,
  logoutController
);

// ==========================================
// CURRENT USER
// ==========================================

router.get(
  "/me",
  protect,
  getMe
);

module.exports = router;