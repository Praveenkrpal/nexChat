
const nodemailer = require("nodemailer");

// ==========================================
// GMAIL SMTP TRANSPORTER
// ==========================================

if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
  console.error(
    "Email configuration missing: EMAIL_USER or EMAIL_APP_PASSWORD"
  );
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD?.replace(/\s/g, ""),
  },

  connectionTimeout: 20000,
  greetingTimeout: 15000,
  socketTimeout: 30000,
});

// ==========================================
// VERIFY SMTP CONNECTION
// ==========================================

const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log("Gmail SMTP connection verified successfully");
    return true;
  } catch (error) {
    console.error("Gmail SMTP verification failed:", {
      message: error.message,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      timeoutType: error.timeoutType,
    });

    return false;
  }
};

// ==========================================
// ESCAPE HTML VALUES
// ==========================================

const escapeHtml = (value = "") => {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });
};

// ==========================================
// REUSABLE EMAIL SENDER
// ==========================================

const sendOtpEmail = async ({ email, name, otp, isPasswordReset }) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
      throw new Error("Email environment variables are missing");
    }

    const safeName = escapeHtml(name || "User");
    const safeOtp = escapeHtml(otp);

    const subject = isPasswordReset
      ? "NexChat Password Reset OTP"
      : "NexChat Email Verification OTP";

    const heading = isPasswordReset
      ? "Reset Your NexChat Password"
      : "Welcome to NexChat 👋";

    const message = isPasswordReset
      ? "We received a request to reset your NexChat password. Use the OTP below to continue."
      : "Use the following OTP to verify your email address:";

    const extraMessage = isPasswordReset
      ? "If you did not request a password reset, you can safely ignore this email."
      : "Do not share this OTP with anyone.";

    const html = `
      <div style="max-width:600px;margin:0 auto;padding:30px;
        font-family:Arial,sans-serif;background:#f8fafc;color:#1e293b;">
        <div style="background:#fff;padding:30px;border-radius:12px;
          box-shadow:0 4px 15px rgba(0,0,0,.08);">

          <h2 style="margin-top:0;color:#2563eb;">
            ${heading}
          </h2>

          <p>Hi <strong>${safeName}</strong>,</p>
          <p>${message}</p>

          <div style="margin:25px 0;text-align:center;">
            <span style="display:inline-block;padding:15px 30px;
              background:#eff6ff;color:#1d4ed8;font-size:30px;
              font-weight:bold;letter-spacing:8px;border-radius:8px;">
              ${safeOtp}
            </span>
          </div>

          <p>This OTP is valid for <strong>60 seconds</strong>.</p>

          <p style="color:#64748b;font-size:14px;">
            ${extraMessage}
          </p>

          ${
            isPasswordReset
              ? `<p style="color:#dc2626;font-size:14px;font-weight:600;">
                   Never share this OTP with anyone.
                 </p>`
              : ""
          }

          <hr style="border:none;border-top:1px solid #e2e8f0;
            margin:25px 0;" />

          <p style="margin-bottom:0;color:#64748b;font-size:13px;">
            This is an automated email from NexChat. Please do not reply.
          </p>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: {
        name: "NexChat",
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject,
      html,
    });

    console.log(
      `${isPasswordReset ? "Password reset" : "Verification"} email sent`,
      {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
      }
    );

    return true;
  } catch (error) {
    console.error("Email sending failed:", {
      message: error.message,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      timeoutType: error.timeoutType,
    });

    return false;
  }
};

// ==========================================
// SEND EMAIL VERIFICATION OTP
// ==========================================

const sendVerificationEmail = async (email, name, otp) => {
  return sendOtpEmail({
    email,
    name,
    otp,
    isPasswordReset: false,
  });
};

// ==========================================
// SEND PASSWORD RESET OTP
// ==========================================

const sendPasswordResetEmail = async (email, name, otp) => {
  return sendOtpEmail({
    email,
    name,
    otp,
    isPasswordReset: true,
  });
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  verifyEmailConnection,
};
