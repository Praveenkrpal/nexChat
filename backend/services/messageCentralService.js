const axios = require("axios");

const BASE_URL = "https://cpaas.messagecentral.com";

// ==========================================
// GENERATE AUTH TOKEN
// ==========================================

const generateAuthToken = async () => {
  try {
    const customerId =
      process.env.MESSAGE_CENTRAL_CUSTOMER_ID;

    const email =
      process.env.MESSAGE_CENTRAL_EMAIL;

    const password =
      process.env.MESSAGE_CENTRAL_PASSWORD;

    if (!customerId || !email || !password) {
      throw new Error(
        "Message Central credentials are missing"
      );
    }

    // Message Central requires Base64 encoded password
    const encodedPassword =
      Buffer.from(password).toString("base64");

    const response = await axios.get(
      `${BASE_URL}/auth/v1/authentication/token`,
      {
        params: {
          customerId,
          key: encodedPassword,
          scope: "NEW",
          country: "91",
          email,
        },
        headers: {
          accept: "*/*",
        },
      }
    );

    if (!response.data?.token) {
      throw new Error(
        "Message Central auth token was not generated"
      );
    }

    return response.data.token;
  } catch (error) {
    console.error(
      "Message Central token error:",
      error.response?.data || error.message
    );

    throw new Error(
      "Unable to authenticate with Message Central"
    );
  }
};

// ==========================================
// SEND MOBILE OTP
// ==========================================

const sendMobileOtp = async (mobileNumber) => {
  try {
    const authToken = await generateAuthToken();

    const response = await axios.post(
      `${BASE_URL}/verification/v3/send`,
      null,
      {
        params: {
          customerId:
            process.env.MESSAGE_CENTRAL_CUSTOMER_ID,
          countryCode: "91",
          flowType: "SMS",
          mobileNumber,
          otpLength: 6,
        },

        headers: {
          authToken,
        },
      }
    );

    const data = response.data;

    console.log(
      "Message Central Send OTP Response:",
      data
    );

    if (
      data?.responseCode !== 200 &&
      data?.responseCode !== "200"
    ) {
      throw new Error(
        data?.message ||
          data?.data?.errorMessage ||
          "Failed to send mobile OTP"
      );
    }

    return {
      success: true,

      verificationId:
        data.data?.verificationId,

      mobileNumber:
        data.data?.mobileNumber,

      timeout:
        data.data?.timeout,

      transactionId:
        data.data?.transactionId,
    };
  } catch (error) {
    console.error(
      "Message Central send OTP error:",
      error.response?.data ||
        error.message
    );

    throw new Error(
      error.response?.data?.message ||
        error.response?.data?.data?.errorMessage ||
        "Unable to send mobile OTP"
    );
  }
};

// ==========================================
// VERIFY MOBILE OTP
// ==========================================

const verifyMobileOtp = async (
  verificationId,
  otp
) => {
  try {
    const authToken =
      await generateAuthToken();

    const response = await axios.get(
      `${BASE_URL}/verification/v3/validateOtp`,
      {
        params: {
          verificationId,
          code: otp,
        },

        headers: {
          authToken,
        },
      }
    );

    const data = response.data;

    console.log(
      "Message Central Verify OTP Response:",
      data
    );

    return {
      success:
        data?.responseCode === 200 &&
        data?.data?.verificationStatus ===
          "VERIFICATION_COMPLETED",

      verificationStatus:
        data?.data?.verificationStatus,

      message:
        data?.message,
    };
  } catch (error) {
    console.error(
      "Message Central verify OTP error:",
      error.response?.data ||
        error.message
    );

    return {
      success: false,

      verificationStatus:
        "VERIFICATION_FAILED",

      message:
        error.response?.data?.message ||
        error.response?.data?.data?.errorMessage ||
        "Invalid or expired OTP",
    };
  }
};

module.exports = {
  generateAuthToken,
  sendMobileOtp,
  verifyMobileOtp,
};