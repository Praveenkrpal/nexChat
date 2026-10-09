import axios from "axios";

const api = axios.create({
  baseURL: "https://nexchat-backend-adj2.onrender.com/api",
  // baseURL: "http://localhost:5000/api",
  withCredentials: true,
});

// ==========================================
// REQUEST INTERCEPTOR
// ==========================================

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ==========================================
// RESPONSE INTERCEPTOR
// ==========================================

api.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    const status = error.response?.status;
    const token = localStorage.getItem("token");

    // ==========================================
    // AUTH ROUTES
    // ==========================================

    const requestUrl = error.config?.url || "";

    const isAuthRoute =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/forgot-password") ||
      requestUrl.includes("/auth/verify-password-reset-otp") ||
      requestUrl.includes("/auth/reset-password") ||
      requestUrl.includes("/auth/verify-email") ||
      requestUrl.includes("/auth/resend-email-otp") ||
      requestUrl.includes("/auth/send-mobile-otp") ||
      requestUrl.includes("/auth/verify-mobile-otp");

    // ==========================================
    // SESSION EXPIRED / INVALID TOKEN
    // ==========================================

    if (
      status === 401 &&
      token &&
      !isAuthRoute
    ) {
      console.warn(
        "Session expired. Logging out..."
      );

      // Remove authentication data
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Optional flag for login page
      sessionStorage.setItem(
        "sessionExpired",
        "true"
      );

      // Redirect to login
      window.location.replace("/login");
    }

    return Promise.reject(error);
  }
);

export default api;