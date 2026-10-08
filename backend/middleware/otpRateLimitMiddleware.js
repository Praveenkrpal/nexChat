const { rateLimit } = require("express-rate-limit");

// ==========================================
// OTP SEND / RESEND RATE LIMIT
// ==========================================

const otpSendRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,

  // Maximum 10 OTP-send requests from one IP
  limit: 10,

  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many OTP requests. Please try again later.",
  },
});

// ==========================================
// OTP VERIFICATION RATE LIMIT
// ==========================================

const otpVerifyRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,

  // Maximum 30 verification requests from one IP
  limit: 30,

  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many OTP verification attempts. Please try again later.",
  },
});

module.exports = {
  otpSendRateLimit,
  otpVerifyRateLimit,
};