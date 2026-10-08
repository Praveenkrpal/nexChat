const nodemailer = require("nodemailer");

// ==========================================
// CREATE EMAIL TRANSPORTER
// ==========================================

const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

// ==========================================
// SEND EMAIL VERIFICATION OTP
// ==========================================

const sendVerificationEmail = async (
  email,
  name,
  otp
) => {
  try {
    await transporter.sendMail({
      from: `"NexChat" <${process.env.EMAIL_USER}>`,
      to: email,

      subject:
        "NexChat Email Verification OTP",

      html: `
        <div
          style="
            max-width: 600px;
            margin: 0 auto;
            padding: 30px;
            font-family: Arial, sans-serif;
            background: #f8fafc;
            color: #1e293b;
          "
        >
          <div
            style="
              background: white;
              padding: 30px;
              border-radius: 12px;
              box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            "
          >

            <h2
              style="
                margin-top: 0;
                color: #2563eb;
              "
            >
              Welcome to NexChat 👋
            </h2>

            <p>
              Hi <strong>${name}</strong>,
            </p>

            <p>
              Use the following OTP to verify
              your email address:
            </p>

            <div
              style="
                margin: 25px 0;
                text-align: center;
              "
            >
              <span
                style="
                  display: inline-block;
                  padding: 15px 30px;
                  background: #eff6ff;
                  color: #1d4ed8;
                  font-size: 30px;
                  font-weight: bold;
                  letter-spacing: 8px;
                  border-radius: 8px;
                "
              >
                ${otp}
              </span>
            </div>

            <p>
              This OTP is valid for
              <strong>60 seconds</strong>.
            </p>

            <p
              style="
                color: #64748b;
                font-size: 14px;
              "
            >
              Do not share this OTP with anyone.
            </p>

            <hr
              style="
                border: none;
                border-top: 1px solid #e2e8f0;
                margin: 25px 0;
              "
            />

            <p
              style="
                margin-bottom: 0;
                color: #64748b;
                font-size: 13px;
              "
            >
              This is an automated email from
              NexChat. Please do not reply.
            </p>

          </div>
        </div>
      `,
    });

    console.log(
      `Verification email sent to ${email}`
    );

    return true;
  } catch (error) {
    console.error(
      "Email sending error:",
      error
    );

    return false;
  }
};

// ==========================================
// SEND PASSWORD RESET OTP
// ==========================================

const sendPasswordResetEmail = async (
  email,
  name,
  otp
) => {
  try {
    await transporter.sendMail({
      from: `"NexChat" <${process.env.EMAIL_USER}>`,
      to: email,

      subject:
        "NexChat Password Reset OTP",

      html: `
        <div
          style="
            max-width: 600px;
            margin: 0 auto;
            padding: 30px;
            font-family: Arial, sans-serif;
            background: #f8fafc;
            color: #1e293b;
          "
        >
          <div
            style="
              background: white;
              padding: 30px;
              border-radius: 12px;
              box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            "
          >

            <h2
              style="
                margin-top: 0;
                color: #2563eb;
              "
            >
              Reset Your NexChat Password
            </h2>

            <p>
              Hi <strong>${name}</strong>,
            </p>

            <p>
              We received a request to reset
              your NexChat password.
            </p>

            <p>
              Use the OTP below to continue:
            </p>

            <div
              style="
                margin: 25px 0;
                text-align: center;
              "
            >
              <span
                style="
                  display: inline-block;
                  padding: 15px 30px;
                  background: #eff6ff;
                  color: #1d4ed8;
                  font-size: 30px;
                  font-weight: bold;
                  letter-spacing: 8px;
                  border-radius: 8px;
                "
              >
                ${otp}
              </span>
            </div>

            <p>
              This OTP is valid for
              <strong>60 seconds</strong>.
            </p>

            <p
              style="
                color: #64748b;
                font-size: 14px;
              "
            >
              If you did not request a password
              reset, you can safely ignore this
              email.
            </p>

            <p
              style="
                color: #dc2626;
                font-size: 14px;
                font-weight: 600;
              "
            >
              Never share this OTP with anyone.
            </p>

            <hr
              style="
                border: none;
                border-top: 1px solid #e2e8f0;
                margin: 25px 0;
              "
            />

            <p
              style="
                margin-bottom: 0;
                color: #64748b;
                font-size: 13px;
              "
            >
              This is an automated email from
              NexChat. Please do not reply.
            </p>

          </div>
        </div>
      `,
    });

    console.log(
      `Password reset email sent to ${email}`
    );

    return true;
  } catch (error) {
    console.error(
      "Password reset email error:",
      error
    );

    return false;
  }
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};