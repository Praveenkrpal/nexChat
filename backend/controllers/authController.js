const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User");

// ==========================================
// OTP SECURITY SETTINGS
// ==========================================

const OTP_EXPIRY_MS = 60 * 1000; // 60 seconds

const OTP_MAX_ATTEMPTS = 5; // Maximum wrong attempts

const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

const PASSWORD_RESET_TOKEN_EXPIRY_MS =
  10 * 60 * 1000; // 10 minutes

  const {
    sendVerificationEmail,
    sendPasswordResetEmail,
  } = require("../services/emailService");

const {
  sendMobileOtp,
  verifyMobileOtp,
} = require("../services/messageCentralService");

// ==========================================
// GENERATE JWT
// ==========================================

const generateToken = (
  userId,
  tokenVersion = 0
) => {
  return jwt.sign(
    {
      userId,
      tokenVersion,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

// ==========================================
// GENERATE EMAIL OTP
// ==========================================

const generateEmailOtp = () => {
  return crypto
    .randomInt(100000, 1000000)
    .toString();
};

// ==========================================
// NORMALIZE INDIAN PHONE NUMBER
// ==========================================

const normalizePhone = (phone) => {
  let normalizedPhone = phone
    .toString()
    .replace(/\D/g, "");

  // Example:
  // 919876543210 -> 9876543210

  if (
    normalizedPhone.length === 12 &&
    normalizedPhone.startsWith("91")
  ) {
    normalizedPhone =
      normalizedPhone.substring(2);
  }

  return normalizedPhone;
};

// ==========================================
// REGISTER
// Supports:
// 1. Email registration
// 2. Mobile registration
// ==========================================

const register = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      verificationMethod,
    } = req.body;

    // ==========================================
    // BASIC VALIDATION
    // ==========================================

    if (!name || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Name and password are required",
      });
    }

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide either email or mobile number",
      });
    }

    // ==========================================
    // DETERMINE VERIFICATION METHOD
    // ==========================================

    let method = verificationMethod;

    if (!method) {
      method = email ? "email" : "mobile";
    }

    if (!["email", "mobile"].includes(method)) {
      return res.status(400).json({
        success: false,
        message:
          "verificationMethod must be email or mobile",
      });
    }

    // ==========================================
    // EMAIL VALIDATION
    // ==========================================

    let normalizedEmail = null;

    if (email) {
      normalizedEmail = email
        .toLowerCase()
        .trim();

      const existingEmailUser =
        await User.findOne({
          email: normalizedEmail,
        });

      if (existingEmailUser) {
        return res.status(409).json({
          success: false,
          message:
            "Email is already registered",
        });
      }
    }

    // ==========================================
    // MOBILE VALIDATION
    // ==========================================

    let normalizedPhone = null;

    if (phone) {
      normalizedPhone =
        normalizePhone(phone);

      if (normalizedPhone.length !== 10) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid 10-digit Indian mobile number",
        });
      }

      const existingPhoneUser =
        await User.findOne({
          phone: normalizedPhone,
        });

      if (existingPhoneUser) {
        return res.status(409).json({
          success: false,
          message:
            "Mobile number is already registered",
        });
      }
    }

    // ==========================================
    // SELECTED METHOD VALIDATION
    // ==========================================

    if (
      method === "email" &&
      !normalizedEmail
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email is required for email verification",
      });
    }

    if (
      method === "mobile" &&
      !normalizedPhone
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Mobile number is required for mobile verification",
      });
    }

    // ==========================================
    // HASH PASSWORD
    // ==========================================

    const hashedPassword =
      await bcrypt.hash(password, 10);

    // ==========================================
    // CREATE USER DATA
    // ==========================================

    const userData = {
      name,
      password: hashedPassword,

      emailVerified: false,
      phoneVerified: false,

      // EMAIL OTP
      emailVerificationOtp: null,
      emailVerificationExpires: null,
      emailVerificationAttempts: 0,
      emailVerificationLastSentAt: null,

      // MOBILE OTP
      phoneVerificationId: null,
      phoneVerificationExpires: null,
      phoneVerificationAttempts: 0,
      phoneVerificationLastSentAt: null,
    };

    if (normalizedEmail) {
      userData.email = normalizedEmail;
    }

    if (normalizedPhone) {
      userData.phone = normalizedPhone;
    }

    const user = await User.create(
      userData
    );

    // ==========================================
    // EMAIL REGISTRATION
    // ==========================================

    if (method === "email") {
      const emailVerificationOtp =
        generateEmailOtp();

      const emailVerificationExpires =
        new Date(
          Date.now() + OTP_EXPIRY_MS
        );

      const emailSent =
        await sendVerificationEmail(
          user.email,
          user.name,
          emailVerificationOtp
        );

      if (!emailSent) {
        await User.findByIdAndDelete(
          user._id
        );

        return res.status(500).json({
          success: false,
          message:
            "Unable to send verification email. Please try again.",
        });
      }

      user.emailVerificationOtp =
        emailVerificationOtp;

      user.emailVerificationExpires =
        emailVerificationExpires;

      user.emailVerificationAttempts = 0;

      user.emailVerificationLastSentAt =
        new Date();

      await user.save();

      return res.status(201).json({
        success: true,

        message:
          "Registration successful. Please verify your email.",

        verificationMethod: "email",

        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          isOnline: user.isOnline,
          emailVerified:
            user.emailVerified,
          phoneVerified:
            user.phoneVerified,
        },
      });
    }

    // ==========================================
    // MOBILE REGISTRATION
    // ==========================================

    if (method === "mobile") {
      const result =
        await sendMobileOtp(
          normalizedPhone
        );

      if (
        !result.success ||
        !result.verificationId
      ) {
        await User.findByIdAndDelete(
          user._id
        );

        return res.status(500).json({
          success: false,
          message:
            "Unable to send mobile OTP. Please try again.",
        });
      }

      // Save Message Central verification ID
      user.phoneVerificationId =
        result.verificationId;

      user.phoneVerificationExpires =
        new Date(
          Date.now() + OTP_EXPIRY_MS
        );

      user.phoneVerificationAttempts = 0;

      user.phoneVerificationLastSentAt =
        new Date();

      await user.save();

      return res.status(201).json({
        success: true,

        message:
          "Registration successful. Please verify your mobile number.",

        verificationMethod: "mobile",

        verificationId:
          result.verificationId,

        timeout: result.timeout,

        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          isOnline: user.isOnline,
          emailVerified:
            user.emailVerified,
          phoneVerified:
            user.phoneVerified,
        },
      });
    }
  } catch (error) {
    console.error(
      "Register error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==========================================
// LOGIN
// ==========================================

const login = async (req, res) => {
  try {
    const {
      email,
      phone,
      identifier,
      password,
    } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    if (
      !email &&
      !phone &&
      !identifier
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email or mobile number is required",
      });
    }

    let user;

    // ==========================================
    // LOGIN USING PHONE
    // ==========================================

    if (phone) {
      const normalizedPhone =
        normalizePhone(phone);

      if (
        normalizedPhone.length !== 10
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid 10-digit Indian mobile number",
        });
      }

      user = await User.findOne({
        phone: normalizedPhone,
      });
    }

    // ==========================================
    // LOGIN USING EMAIL
    // ==========================================

    else if (email) {
      const normalizedEmail =
        email
          .toLowerCase()
          .trim();

      user = await User.findOne({
        email: normalizedEmail,
      });
    }

    // ==========================================
    // LOGIN USING IDENTIFIER
    // ==========================================

    else if (identifier) {
      const trimmedIdentifier =
        identifier.trim();

      if (
        trimmedIdentifier.includes("@")
      ) {
        const normalizedEmail =
          trimmedIdentifier.toLowerCase();

        user = await User.findOne({
          email: normalizedEmail,
        });
      } else {
        const normalizedPhone =
          normalizePhone(
            trimmedIdentifier
          );

        if (
          normalizedPhone.length !== 10
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Please enter a valid email or mobile number",
          });
        }

        user = await User.findOne({
          phone: normalizedPhone,
        });
      }
    }

    // ==========================================
    // USER NOT FOUND
    // ==========================================

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // ==========================================
    // CHECK PASSWORD
    // ==========================================

    const isPasswordCorrect =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // ==========================================
    // EMAIL OR MOBILE VERIFICATION REQUIRED
    // ==========================================

    if (
      !user.emailVerified &&
      !user.phoneVerified
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Please verify your email or mobile number before logging in",

        emailVerified:
          user.emailVerified,

        phoneVerified:
          user.phoneVerified,
      });
    }

    // ==========================================
    // GENERATE TOKEN
    // ==========================================

    const token = generateToken(
      user._id,
      user.tokenVersion || 0
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",

      token,

      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        isOnline: user.isOnline,

        emailVerified:
          user.emailVerified,

        phoneVerified:
          user.phoneVerified,
      },
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==========================================
// FORGOT PASSWORD
// Supports:
// 1. Email OTP
// 2. Mobile OTP
// ==========================================

const forgotPasswordController = async (
  req,
  res
) => {
  try {
    const {
      method,
      email,
      phone,
    } = req.body;

    // ==========================================
    // VALIDATE METHOD
    // ==========================================

    if (
      !["email", "mobile"].includes(method)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Method must be email or mobile",
      });
    }

    // ==========================================
    // EMAIL
    // ==========================================

    if (method === "email") {
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const normalizedEmail =
        email.toLowerCase().trim();

      const user = await User.findOne({
        email: normalizedEmail,
        emailVerified: true,
      });

      // Do not reveal whether account exists
      if (!user) {
        return res.status(200).json({
          success: true,
          message:
            "If an account exists with the provided details, a password reset OTP has been sent.",
          verificationMethod: "email",
          otpExpiresIn:
            OTP_EXPIRY_MS / 1000,
        });
      }

      // ========================================
      // RESEND COOLDOWN
      // ========================================

      if (
        user.passwordResetLastSentAt &&
        Date.now() -
          user.passwordResetLastSentAt.getTime() <
          OTP_RESEND_COOLDOWN_MS
      ) {
        return res.status(200).json({
          success: true,
          message:
            "If an account exists with the provided details, a password reset OTP has been sent.",
          verificationMethod: "email",
          otpExpiresIn:
            OTP_EXPIRY_MS / 1000,
        });
      }

      // ========================================
      // GENERATE OTP
      // ========================================

      const otp =
        generateEmailOtp();

        const emailSent =
        await sendPasswordResetEmail(
          user.email,
          user.name,
          otp
        );

      if (!emailSent) {
        return res.status(500).json({
          success: false,
          message:
            "Unable to send password reset OTP. Please try again.",
        });
      }

      // ========================================
      // SAVE RESET DATA
      // ========================================

      user.passwordResetMethod =
        "email";

      user.passwordResetOtp = otp;

      user.passwordResetVerificationId =
        null;

      user.passwordResetExpires =
        new Date(
          Date.now() + OTP_EXPIRY_MS
        );

      user.passwordResetAttempts = 0;

      user.passwordResetLastSentAt =
        new Date();

      // Invalidate any previous reset token
      user.passwordResetTokenHash = null;
      user.passwordResetTokenExpires = null;

      await user.save();
    }

    // ==========================================
    // MOBILE
    // ==========================================

    if (method === "mobile") {
      if (!phone) {
        return res.status(400).json({
          success: false,
          message:
            "Mobile number is required",
        });
      }

      const normalizedPhone =
        normalizePhone(phone);

      if (normalizedPhone.length !== 10) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid 10-digit Indian mobile number",
        });
      }

      const user = await User.findOne({
        phone: normalizedPhone,
        phoneVerified: true,
      });

      // Do not reveal whether account exists
      if (!user) {
        return res.status(200).json({
          success: true,
          message:
            "If an account exists with the provided details, a password reset OTP has been sent.",
          verificationMethod: "mobile",
          otpExpiresIn:
            OTP_EXPIRY_MS / 1000,
        });
      }

      // ========================================
      // RESEND COOLDOWN
      // ========================================

      if (
        user.passwordResetLastSentAt &&
        Date.now() -
          user.passwordResetLastSentAt.getTime() <
          OTP_RESEND_COOLDOWN_MS
      ) {
        return res.status(200).json({
          success: true,
          message:
            "If an account exists with the provided details, a password reset OTP has been sent.",
          verificationMethod: "mobile",
          otpExpiresIn:
            OTP_EXPIRY_MS / 1000,
        });
      }

      // ========================================
      // SEND MOBILE OTP
      // ========================================

      const result =
        await sendMobileOtp(
          normalizedPhone
        );

      if (
        !result.success ||
        !result.verificationId
      ) {
        return res.status(500).json({
          success: false,
          message:
            "Unable to send password reset OTP. Please try again.",
        });
      }

      // ========================================
      // SAVE RESET DATA
      // ========================================

      user.passwordResetMethod =
        "mobile";

      user.passwordResetOtp = null;

      user.passwordResetVerificationId =
        result.verificationId;

      user.passwordResetExpires =
        new Date(
          Date.now() + OTP_EXPIRY_MS
        );

      user.passwordResetAttempts = 0;

      user.passwordResetLastSentAt =
        new Date();

      // Invalidate previous reset token
      user.passwordResetTokenHash = null;
      user.passwordResetTokenExpires = null;

      await user.save();
    }

    return res.status(200).json({
      success: true,
      message:
        "If an account exists with the provided details, a password reset OTP has been sent.",
      verificationMethod: method,
      otpExpiresIn:
        OTP_EXPIRY_MS / 1000,
    });
  } catch (error) {
    console.error(
      "Forgot password error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==========================================
// VERIFY PASSWORD RESET OTP
// ==========================================

const verifyPasswordResetOtpController =
  async (req, res) => {
    try {
      const {
        method,
        email,
        phone,
        otp,
      } = req.body;

      if (
        !["email", "mobile"].includes(method)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Method must be email or mobile",
        });
      }

      if (!otp) {
        return res.status(400).json({
          success: false,
          message: "OTP is required",
        });
      }

      let user;

      // ========================================
      // FIND EMAIL USER
      // ========================================

      if (method === "email") {
        if (!email) {
          return res.status(400).json({
            success: false,
            message:
              "Email is required",
          });
        }

        const normalizedEmail =
          email.toLowerCase().trim();

        user = await User.findOne({
          email: normalizedEmail,
          emailVerified: true,
          passwordResetMethod:
            "email",
        });
      }

      // ========================================
      // FIND MOBILE USER
      // ========================================

      if (method === "mobile") {
        if (!phone) {
          return res.status(400).json({
            success: false,
            message:
              "Mobile number is required",
          });
        }

        const normalizedPhone =
          normalizePhone(phone);

        user = await User.findOne({
          phone: normalizedPhone,
          phoneVerified: true,
          passwordResetMethod:
            "mobile",
        });
      }

      if (!user) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid or expired password reset request",
        });
      }

      // ========================================
      // ATTEMPT LIMIT
      // ========================================

      if (
        user.passwordResetAttempts >=
        OTP_MAX_ATTEMPTS
      ) {
        return res.status(429).json({
          success: false,
          message:
            "Too many incorrect OTP attempts. Please request a new OTP.",
        });
      }

      // ========================================
      // EXPIRATION
      // ========================================

      if (
        !user.passwordResetExpires ||
        user.passwordResetExpires <
          new Date()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Password reset OTP has expired. Please request a new OTP.",
        });
      }

      // ========================================
      // EMAIL OTP
      // ========================================

      if (method === "email") {
        if (
          user.passwordResetOtp !==
          otp.toString()
        ) {
          user.passwordResetAttempts +=
            1;

          await user.save();

          const remainingAttempts =
            OTP_MAX_ATTEMPTS -
            user.passwordResetAttempts;

          return res.status(400).json({
            success: false,
            message:
              remainingAttempts > 0
                ? `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`
                : "Too many incorrect OTP attempts. Please request a new OTP.",
          });
        }
      }

      // ========================================
      // MOBILE OTP
      // ========================================

      if (method === "mobile") {
        if (
          !user.passwordResetVerificationId
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid or expired password reset request",
          });
        }

        const result =
          await verifyMobileOtp(
            user.passwordResetVerificationId,
            otp.toString()
          );

        if (!result.success) {
          user.passwordResetAttempts +=
            1;

          await user.save();

          const remainingAttempts =
            OTP_MAX_ATTEMPTS -
            user.passwordResetAttempts;

          return res.status(400).json({
            success: false,
            message:
              remainingAttempts > 0
                ? `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`
                : "Too many incorrect OTP attempts. Please request a new OTP.",
          });
        }
      }

      // ========================================
      // GENERATE SECURE RESET TOKEN
      // ========================================

      const resetToken =
        crypto
          .randomBytes(32)
          .toString("hex");

      const resetTokenHash =
        crypto
          .createHash("sha256")
          .update(resetToken)
          .digest("hex");

      user.passwordResetTokenHash =
        resetTokenHash;

      user.passwordResetTokenExpires =
        new Date(
          Date.now() +
            PASSWORD_RESET_TOKEN_EXPIRY_MS
        );

      // OTP becomes single-use
      user.passwordResetOtp = null;

      user.passwordResetVerificationId =
        null;

      user.passwordResetExpires = null;

      user.passwordResetAttempts = 0;

      user.passwordResetLastSentAt = null;

      await user.save();

      return res.status(200).json({
        success: true,
        message:
          "OTP verified. You can now reset your password.",

        resetToken,

        resetTokenExpiresIn:
          PASSWORD_RESET_TOKEN_EXPIRY_MS /
          1000,
      });
    } catch (error) {
      console.error(
        "Verify password reset OTP error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  };

  // ==========================================
// RESET PASSWORD
// ==========================================

const resetPasswordController =
async (req, res) => {
  try {
    const {
      resetToken,
      newPassword,
      confirmPassword,
    } = req.body;

    // ========================================
    // VALIDATION
    // ========================================

    if (
      !resetToken ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Reset token and both password fields are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters",
      });
    }

    if (
      newPassword !== confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Passwords do not match",
      });
    }

    // ========================================
    // HASH RESET TOKEN
    // ========================================

    const resetTokenHash =
      crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    // ========================================
    // FIND VALID RESET TOKEN
    // ========================================

    const user = await User.findOne({
      passwordResetTokenHash:
        resetTokenHash,

      passwordResetTokenExpires: {
        $gt: new Date(),
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired password reset token",
      });
    }

    // ========================================
    // OPTIONAL: PREVENT SAME PASSWORD
    // ========================================

    const samePassword =
      await bcrypt.compare(
        newPassword,
        user.password
      );

    if (samePassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be different from your old password",
      });
    }

    // ========================================
    // HASH NEW PASSWORD
    // ========================================

    user.password =
      await bcrypt.hash(
        newPassword,
        10
      );

    // ========================================
    // INVALIDATE EXISTING SESSIONS
    // ========================================

    user.tokenVersion =
      (user.tokenVersion || 0) + 1;

    user.passwordChangedAt =
      new Date();

    // ========================================
    // CLEAR RESET DATA
    // ========================================

    user.passwordResetMethod =
      null;

    user.passwordResetOtp = null;

    user.passwordResetVerificationId =
      null;

    user.passwordResetExpires = null;

    user.passwordResetAttempts = 0;

    user.passwordResetLastSentAt = null;

    user.passwordResetTokenHash = null;

    user.passwordResetTokenExpires =
      null;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. Please login again.",
    });
  } catch (error) {
    console.error(
      "Reset password error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==========================================
// VERIFY EMAIL
// ==========================================

const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message:
          "Email and OTP are required",
      });
    }

    const normalizedEmail =
      email
        .toLowerCase()
        .trim();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ==========================================
    // ALREADY VERIFIED
    // ==========================================

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message:
          "Email is already verified",
      });
    }

    // ==========================================
    // ATTEMPT LIMIT
    // ==========================================

    if (
      user.emailVerificationAttempts >=
      OTP_MAX_ATTEMPTS
    ) {
      return res.status(429).json({
        success: false,
        message:
          "Too many incorrect OTP attempts. Please request a new OTP.",
      });
    }

    // ==========================================
    // CHECK EXPIRATION
    // ==========================================

    if (
      !user.emailVerificationExpires ||
      user.emailVerificationExpires <
        new Date()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Verification OTP has expired. Please request a new OTP.",
      });
    }

    // ==========================================
    // CHECK OTP
    // ==========================================

    if (
      user.emailVerificationOtp !==
      otp.toString()
    ) {
      user.emailVerificationAttempts += 1;

      await user.save();

      const remainingAttempts =
        OTP_MAX_ATTEMPTS -
        user.emailVerificationAttempts;

      return res.status(400).json({
        success: false,
        message:
          remainingAttempts > 0
            ? `Invalid verification OTP. ${remainingAttempts} attempt(s) remaining.`
            : "Too many incorrect OTP attempts. Please request a new OTP.",
      });
    }

    // ==========================================
    // EMAIL VERIFIED
    // ==========================================

    user.emailVerified = true;

    // Make OTP single-use
    user.emailVerificationOtp = null;

    user.emailVerificationExpires =
      null;

    user.emailVerificationAttempts = 0;

    user.emailVerificationLastSentAt =
      null;

    await user.save();

    return res.status(200).json({
      success: true,

      message:
        "Email verified successfully. You can now login.",

      emailVerified: true,

      phoneVerified:
        user.phoneVerified,
    });
  } catch (error) {
    console.error(
      "Verify email error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==========================================
// SEND / RESEND MOBILE OTP
// ==========================================

const sendMobileOtpController =
  async (req, res) => {
    try {
      let { phone } = req.body;

      if (!phone) {
        return res.status(400).json({
          success: false,
          message:
            "Mobile number is required",
        });
      }

      phone = normalizePhone(phone);

      if (phone.length !== 10) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid 10-digit Indian mobile number",
        });
      }

      const user = await User.findOne({
        phone,
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "Mobile number is not associated with any account",
        });
      }

      if (user.phoneVerified) {
        return res.status(400).json({
          success: false,
          message:
            "Mobile number is already verified",
        });
      }

      // ==========================================
      // RESEND COOLDOWN
      // ==========================================

      if (
        user.phoneVerificationLastSentAt &&
        Date.now() -
          user.phoneVerificationLastSentAt.getTime() <
          OTP_RESEND_COOLDOWN_MS
      ) {
        const remainingSeconds =
          Math.ceil(
            (
              OTP_RESEND_COOLDOWN_MS -
              (
                Date.now() -
                user.phoneVerificationLastSentAt.getTime()
              )
            ) / 1000
          );

        return res.status(429).json({
          success: false,
          message:
            `Please wait ${remainingSeconds} second(s) before requesting another OTP.`,
          retryAfter:
            remainingSeconds,
        });
      }

      // ==========================================
      // SEND NEW OTP
      // ==========================================

      const result =
        await sendMobileOtp(phone);

      if (
        !result.success ||
        !result.verificationId
      ) {
        return res.status(500).json({
          success: false,
          message:
            "Unable to send mobile OTP",
        });
      }

      // ==========================================
      // SAVE NEW VERIFICATION DATA
      // ==========================================

      user.phoneVerificationId =
        result.verificationId;

      user.phoneVerificationExpires =
        new Date(
          Date.now() + OTP_EXPIRY_MS
        );

      user.phoneVerificationAttempts = 0;

      user.phoneVerificationLastSentAt =
        new Date();

      await user.save();

      return res.status(200).json({
        success: true,

        message:
          "OTP sent successfully",

        phone,

        verificationId:
          result.verificationId,

        timeout:
          result.timeout,
      });
    } catch (error) {
      console.error(
        "Send mobile OTP error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Unable to send mobile OTP",
      });
    }
  };

// ==========================================
// VERIFY MOBILE OTP
// ==========================================

const verifyMobileOtpController =
  async (req, res) => {
    try {
      const {
        phone,
        verificationId,
        otp,
      } = req.body;

      if (
        !phone ||
        !verificationId ||
        !otp
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Phone, verification ID and OTP are required",
        });
      }

      const normalizedPhone =
        normalizePhone(phone);

      if (
        normalizedPhone.length !== 10
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid 10-digit Indian mobile number",
        });
      }

      const user = await User.findOne({
        phone: normalizedPhone,
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "Mobile number is not associated with any account",
        });
      }

      if (user.phoneVerified) {
        return res.status(400).json({
          success: false,
          message:
            "Mobile number is already verified",
        });
      }

      // ==========================================
      // ATTEMPT LIMIT
      // ==========================================

      if (
        user.phoneVerificationAttempts >=
        OTP_MAX_ATTEMPTS
      ) {
        return res.status(429).json({
          success: false,
          message:
            "Too many incorrect OTP attempts. Please request a new OTP.",
        });
      }

      // ==========================================
      // CHECK VERIFICATION ID
      // ==========================================

      if (
        !user.phoneVerificationId ||
        user.phoneVerificationId.toString() !==
          verificationId.toString()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid verification request",
        });
      }

      // ==========================================
      // CHECK LOCAL EXPIRATION
      // ==========================================

      if (
        !user.phoneVerificationExpires ||
        user.phoneVerificationExpires <
          new Date()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "OTP has expired. Please request a new OTP.",
        });
      }

      // ==========================================
      // VERIFY WITH MESSAGE CENTRAL
      // ==========================================

      const result =
        await verifyMobileOtp(
          verificationId,
          otp.toString()
        );

      if (!result.success) {
        user.phoneVerificationAttempts +=
          1;

        await user.save();

        const remainingAttempts =
          OTP_MAX_ATTEMPTS -
          user.phoneVerificationAttempts;

        return res.status(400).json({
          success: false,
          message:
            remainingAttempts > 0
              ? `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`
              : "Too many incorrect OTP attempts. Please request a new OTP.",
        });
      }

      // ==========================================
      // MOBILE VERIFIED
      // ==========================================

      user.phoneVerified = true;

      // Make verification single-use
      user.phoneVerificationId = null;

      user.phoneVerificationExpires =
        null;

      user.phoneVerificationAttempts = 0;

      user.phoneVerificationLastSentAt =
        null;

      await user.save();

      return res.status(200).json({
        success: true,

        message:
          "Mobile number verified successfully. You can now login.",

        phoneVerified: true,

        emailVerified:
          user.emailVerified,
      });
    } catch (error) {
      console.error(
        "Verify mobile OTP error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  };

// ==========================================
// RESEND EMAIL OTP
// ==========================================

const resendEmailOtpController =
  async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const normalizedEmail =
        email
          .toLowerCase()
          .trim();

      const user = await User.findOne({
        email: normalizedEmail,
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.emailVerified) {
        return res.status(400).json({
          success: false,
          message:
            "Email is already verified",
        });
      }

      // ==========================================
      // RESEND COOLDOWN
      // ==========================================

      if (
        user.emailVerificationLastSentAt &&
        Date.now() -
          user.emailVerificationLastSentAt.getTime() <
          OTP_RESEND_COOLDOWN_MS
      ) {
        const remainingSeconds =
          Math.ceil(
            (
              OTP_RESEND_COOLDOWN_MS -
              (
                Date.now() -
                user.emailVerificationLastSentAt.getTime()
              )
            ) / 1000
          );

        return res.status(429).json({
          success: false,
          message:
            `Please wait ${remainingSeconds} second(s) before requesting another OTP.`,
          retryAfter:
            remainingSeconds,
        });
      }

      // ==========================================
      // GENERATE NEW OTP
      // ==========================================

      const emailVerificationOtp =
        generateEmailOtp();

      // ==========================================
      // SEND NEW OTP FIRST
      // ==========================================

      const emailSent =
        await sendVerificationEmail(
          user.email,
          user.name,
          emailVerificationOtp
        );

      if (!emailSent) {
        return res.status(500).json({
          success: false,
          message:
            "Unable to resend verification email. Please try again.",
        });
      }

      // ==========================================
      // SAVE NEW OTP
      // ==========================================

      user.emailVerificationOtp =
        emailVerificationOtp;

      user.emailVerificationExpires =
        new Date(
          Date.now() + OTP_EXPIRY_MS
        );

      // New OTP gets fresh attempts
      user.emailVerificationAttempts = 0;

      user.emailVerificationLastSentAt =
        new Date();

      await user.save();

      return res.status(200).json({
        success: true,

        message:
          "New OTP sent successfully",

        otpExpiresIn:
          OTP_EXPIRY_MS / 1000,
      });
    } catch (error) {
      console.error(
        "Resend email OTP error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  };
  

// ==========================================
// CURRENT USER
// ==========================================

const getMe = async (req, res) => {
  try {
    const user =
      await User.findById(
        req.user.userId
      ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(
      "Get current user error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==========================================
// LOGOUT
// ==========================================

const logoutController = async (req, res) => {
  try {
    const userId =
      req.user?.userId ||
      req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // ==========================================
    // INVALIDATE ALL EXISTING JWT TOKENS
    // ==========================================

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $inc: {
          tokenVersion: 1,
        },
      },

      {
        new: true,
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ==========================================
    // DISCONNECT USER'S SOCKET CONNECTIONS
    // ==========================================

    const io = req.app.get("io");

    if (io) {
      io.in(`user:${userId}`).disconnectSockets(true);
    }

    console.log(
      `User logged out successfully: ${userId}`
    );

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error(
      "Logout controller error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error during logout",
    });
  }
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  register,
  login,
  forgotPasswordController,
  verifyPasswordResetOtpController,
  resetPasswordController,
  verifyEmail,

  sendMobileOtpController,
  verifyMobileOtpController,
  resendEmailOtpController,

  logoutController,
  getMe,
};