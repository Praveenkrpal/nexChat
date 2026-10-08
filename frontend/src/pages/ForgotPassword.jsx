import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import {
  FiArrowLeft,
  FiArrowRight,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiKey,
  FiLock,
  FiMail,
  FiPhone,
  FiRefreshCw,
  FiShield,
  FiCheck,
} from "react-icons/fi";

import api from "../services/api";

const ForgotPassword = () => {
  const navigate = useNavigate();

  // ==========================================
  // STEP
  // ==========================================

  const [step, setStep] = useState("request");

  // ==========================================
  // RESET METHOD
  // ==========================================

  const [method, setMethod] = useState("email");

  // ==========================================
  // FORM DATA
  // ==========================================

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [otp, setOtp] = useState("");

  const [resetToken, setResetToken] = useState("");

  const [newPassword, setNewPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  // ==========================================
  // UI STATE
  // ==========================================

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [countdown, setCountdown] = useState(0);

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ==========================================
  // OTP COUNTDOWN
  // ==========================================

  useEffect(() => {
    if (step !== "otp" || countdown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step]);

  // ==========================================
  // CLEAR MESSAGES
  // ==========================================

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  // ==========================================
  // CHANGE METHOD
  // ==========================================

  const handleMethodChange = (selectedMethod) => {
    setMethod(selectedMethod);

    clearMessages();

    setEmail("");
    setPhone("");
  };

  // ==========================================
  // SEND PASSWORD RESET OTP
  // ==========================================

  const handleSendOtp = async (e) => {
    e.preventDefault();

    clearMessages();

    // Validation

    if (method === "email" && !email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (method === "mobile" && !phone.trim()) {
      setError("Please enter your mobile number.");
      return;
    }

    if (method === "mobile" && phone.replace(/\D/g, "").length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        method,
      };

      if (method === "email") {
        payload.email = email.trim();
      } else {
        payload.phone = phone.trim();
      }

      const response = await api.post("/auth/forgot-password", payload);

      if (response.data?.success) {
        setSuccess(
          "If the account exists, a password reset OTP has been sent."
        );

        setCountdown(response.data?.otpExpiresIn || 60);

        setOtp("");

        setStep("otp");
      }
    } catch (error) {
      setError(
        error.response?.data?.message || "Unable to send password reset OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // VERIFY OTP
  // ==========================================

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    clearMessages();

    if (!otp.trim()) {
      setError("Please enter the OTP.");
      return;
    }

    if (otp.trim().length !== 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        method,
        otp: otp.trim(),
      };

      if (method === "email") {
        payload.email = email.trim();
      } else {
        payload.phone = phone.trim();
      }

      const response = await api.post(
        "/auth/verify-password-reset-otp",
        payload
      );

      if (response.data?.success) {
        setResetToken(response.data.resetToken);

        setSuccess("OTP verified successfully.");

        setStep("reset");
      }
    } catch (error) {
      setError(error.response?.data?.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // RESEND OTP
  // ==========================================

  const handleResendOtp = async () => {
    if (countdown > 0) {
      return;
    }

    clearMessages();

    try {
      setLoading(true);

      const payload = {
        method,
      };

      if (method === "email") {
        payload.email = email.trim();
      } else {
        payload.phone = phone.trim();
      }

      const response = await api.post("/auth/forgot-password", payload);

      if (response.data?.success) {
        setSuccess("A new password reset OTP has been sent.");

        setOtp("");

        setCountdown(response.data?.otpExpiresIn || 60);
      }
    } catch (error) {
      setError(error.response?.data?.message || "Unable to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // RESET PASSWORD
  // ==========================================

  const handleResetPassword = async (e) => {
    e.preventDefault();

    clearMessages();

    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (!confirmPassword) {
      setError("Please confirm your new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!resetToken) {
      setError("Reset session expired. Please request a new OTP.");

      setStep("request");

      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/reset-password", {
        resetToken,
        newPassword,
        confirmPassword,
      });

      if (response.data?.success) {
        setSuccess("Password reset successfully.");

        setStep("success");

        setResetToken("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error) {
      setError(error.response?.data?.message || "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // GO BACK TO REQUEST
  // ==========================================

  const handleBackToRequest = () => {
    clearMessages();

    setStep("request");

    setOtp("");
    setResetToken("");
    setCountdown(0);
  };

  // ==========================================
  // FORMAT COUNTDOWN
  // ==========================================

  const formatCountdown = () => {
    const minutes = Math.floor(countdown / 60);

    const seconds = countdown % 60;

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // ==========================================
  // STEP TITLE
  // ==========================================

  const getStepTitle = () => {
    if (step === "request") {
      return "Forgot Password?";
    }

    if (step === "otp") {
      return "Verify OTP";
    }

    return "Create New Password";
  };

  const getStepDescription = () => {
    if (step === "request") {
      return "Reset your NexChat password using your verified email or mobile number.";
    }

    if (step === "otp") {
      return `Enter the 6-digit OTP sent to your ${
        method === "email" ? "email address" : "mobile number"
      }.`;
    }

    return "Choose a strong new password for your NexChat account.";
  };

  // ==========================================
  // STEP ICON
  // ==========================================

  const renderStepIcon = () => {
    if (step === "request") {
      return <FiKey size={24} />;
    }

    if (step === "otp") {
      return <FiShield size={24} />;
    }

    return <FiLock size={24} />;
  };

  // ==========================================
  // SUCCESS SCREEN
  // ==========================================

  if (step === "success") {
    return (
      <div className="relative min-h-[100dvh] overflow-hidden bg-[#080b18] text-white">
        {/* Background */}

        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-violet-600/15 blur-3xl" />

          <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-fuchsia-600/10 blur-3xl" />

          <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-3xl" />
        </div>

        <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4 py-8">
          <motion.div
            initial={{
              opacity: 0,
              y: 25,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            transition={{
              duration: 0.45,
              ease: "easeOut",
            }}
            className="w-full max-w-[440px]"
          >
            <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0d1222]/95 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />

              <div className="px-6 py-9 text-center sm:px-8 sm:py-10">
                <motion.div
                  initial={{
                    opacity: 0,
                    scale: 0.6,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 250,
                    damping: 18,
                  }}
                  className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.1)]"
                >
                  <FiCheckCircle size={38} />
                </motion.div>

                <h1 className="mt-6 text-2xl font-bold text-white sm:text-3xl">
                  Password Reset Successful
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Your NexChat password has been changed successfully.
                </p>

                <p className="mt-2 text-xs text-slate-600">
                  You can now login using your new password.
                </p>

                <motion.button
                  type="button"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() =>
                    navigate("/login", {
                      replace: true,
                    })
                  }
                  className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/10 transition-all hover:shadow-violet-500/20"
                >
                  Go to Login
                  <FiArrowRight size={17} />
                </motion.button>
              </div>
            </div>

            <p className="mt-6 text-center text-[11px] text-slate-600">
              NexChat • Secure Messaging
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN UI
  // ==========================================

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#080b18] text-white">
      {/* ======================================
          BACKGROUND
      ====================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-violet-600/15 blur-3xl" />

        <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-fuchsia-600/10 blur-3xl" />

        <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/5 blur-3xl" />
      </div>

      {/* GRID */}

      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* ======================================
          MAIN
      ====================================== */}

      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4 py-8 sm:px-6">
        <motion.div
          initial={{
            opacity: 0,
            y: 25,
            scale: 0.98,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          transition={{
            duration: 0.45,
            ease: "easeOut",
          }}
          className="w-full max-w-[440px]"
        >
          {/* ==================================
              HEADER
          ================================== */}

          <div className="mb-6 text-center sm:mb-8">
            <div className="relative mb-4 flex items-center justify-center">
              {/* Back button */}

              {step !== "request" ? (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleBackToRequest}
                  className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-slate-400 transition-all hover:bg-white/[0.07] hover:text-white"
                  title="Back"
                >
                  <FiArrowLeft size={18} />
                </motion.button>
              ) : (
                <Link
                  to="/login"
                  className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-slate-400 transition-all hover:bg-white/[0.07] hover:text-white"
                  title="Back to Login"
                >
                  <FiArrowLeft size={18} />
                </Link>
              )}

              {/* Icon */}

              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{
                    opacity: 0,
                    scale: 0.7,
                    rotate: -10,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    rotate: 0,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.7,
                  }}
                  transition={{
                    duration: 0.2,
                  }}
                  className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_0_35px_rgba(139,92,246,0.2)]"
                >
                  {renderStepIcon()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Title */}

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{
                  opacity: 0,
                  y: 5,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: -5,
                }}
              >
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {getStepTitle()}
                </h1>

                <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-slate-500">
                  {getStepDescription()}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ==================================
              CARD
          ================================== */}

          <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0d1222]/95 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="h-px bg-gradient-to-r from-transparent via-violet-500/70 to-transparent" />

            <div className="p-5 sm:p-7">
              {/* ==================================
                  ERROR
              ================================== */}

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      height: 0,
                      y: -5,
                    }}
                    animate={{
                      opacity: 1,
                      height: "auto",
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      height: 0,
                      y: -5,
                    }}
                    className="mb-5 overflow-hidden"
                  >
                    <div className="rounded-xl border border-red-500/15 bg-red-500/[0.06] px-4 py-3">
                      <p className="text-xs leading-5 text-red-400">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ==================================
                  SUCCESS
              ================================== */}

              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      height: 0,
                      y: -5,
                    }}
                    animate={{
                      opacity: 1,
                      height: "auto",
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      height: 0,
                      y: -5,
                    }}
                    className="mb-5 overflow-hidden"
                  >
                    <div className="flex items-start gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.06] px-4 py-3">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                        <FiCheck size={12} />
                      </div>

                      <p className="text-xs leading-5 text-emerald-400">
                        {success}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ==================================
                  STEP 1 — REQUEST OTP
              ================================== */}

              <AnimatePresence mode="wait">
                {step === "request" && (
                  <motion.form
                    key="request"
                    initial={{
                      opacity: 0,
                      x: -15,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                    }}
                    exit={{
                      opacity: 0,
                      x: -15,
                    }}
                    onSubmit={handleSendOtp}
                    className="space-y-5"
                  >
                    {/* METHOD */}

                    <div>
                      <label className="mb-3 block text-xs font-medium text-slate-400">
                        Reset password using
                      </label>

                      <div className="relative grid grid-cols-2 rounded-xl border border-white/[0.07] bg-white/[0.025] p-1">
                        <motion.div
                          layout
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 30,
                          }}
                          className={`absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 shadow-lg shadow-violet-500/10 ${
                            method === "email"
                              ? "left-1"
                              : "left-[calc(50%+2px)]"
                          }`}
                        />

                        <button
                          type="button"
                          onClick={() => handleMethodChange("email")}
                          className={`relative z-10 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                            method === "email"
                              ? "text-white"
                              : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          <FiMail size={15} />
                          Email
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMethodChange("mobile")}
                          className={`relative z-10 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                            method === "mobile"
                              ? "text-white"
                              : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          <FiPhone size={15} />
                          Mobile
                        </button>
                      </div>
                    </div>

                    {/* EMAIL */}

                    <AnimatePresence mode="wait">
                      {method === "email" && (
                        <motion.div
                          key="email"
                          initial={{
                            opacity: 0,
                            x: -10,
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                          }}
                          exit={{
                            opacity: 0,
                            x: 10,
                          }}
                        >
                          <label className="mb-2 block text-xs font-medium text-slate-400">
                            Email Address
                          </label>

                          <div className="group flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 transition-all focus-within:border-violet-500/50 focus-within:bg-violet-500/[0.03] focus-within:ring-2 focus-within:ring-violet-500/10">
                            <FiMail
                              size={17}
                              className="shrink-0 text-slate-600 transition-colors group-focus-within:text-violet-400"
                            />

                            <input
                              type="email"
                              name="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="you@example.com"
                              autoComplete="email"
                              className="w-full bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-slate-600"
                            />
                          </div>
                        </motion.div>
                      )}

                      {/* MOBILE */}

                      {method === "mobile" && (
                        <motion.div
                          key="mobile"
                          initial={{
                            opacity: 0,
                            x: 10,
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                          }}
                          exit={{
                            opacity: 0,
                            x: -10,
                          }}
                        >
                          <label className="mb-2 block text-xs font-medium text-slate-400">
                            Mobile Number
                          </label>

                          <div className="group flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 transition-all focus-within:border-violet-500/50 focus-within:bg-violet-500/[0.03] focus-within:ring-2 focus-within:ring-violet-500/10">
                            <FiPhone
                              size={17}
                              className="shrink-0 text-slate-600 transition-colors group-focus-within:text-violet-400"
                            />

                            <span className="border-r border-white/10 pr-3 text-sm text-slate-500">
                              +91
                            </span>

                            <input
                              type="tel"
                              name="phone"
                              value={phone}
                              onChange={(e) =>
                                setPhone(e.target.value.replace(/\D/g, ""))
                              }
                              placeholder="9876543210"
                              inputMode="numeric"
                              maxLength={10}
                              autoComplete="tel"
                              className="w-full bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-slate-600"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* SEND */}

                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={!loading ? { y: -1 } : undefined}
                      whileTap={!loading ? { scale: 0.98 } : undefined}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/10 transition-all hover:shadow-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <FiRefreshCw className="animate-spin" size={17} />
                          Sending OTP...
                        </>
                      ) : (
                        <>
                          Send OTP
                          <FiArrowRight size={17} />
                        </>
                      )}
                    </motion.button>

                    {/* LOGIN */}

                    <p className="text-center text-xs text-slate-500">
                      Remember your password?{" "}
                      <Link
                        to="/login"
                        className="font-semibold text-violet-400 transition hover:text-violet-300"
                      >
                        Back to Login
                      </Link>
                    </p>
                  </motion.form>
                )}

                {/* ==================================
                    STEP 2 — OTP
                ================================== */}

                {step === "otp" && (
                  <motion.form
                    key="otp"
                    initial={{
                      opacity: 0,
                      x: 15,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                    }}
                    exit={{
                      opacity: 0,
                      x: 15,
                    }}
                    onSubmit={handleVerifyOtp}
                    className="space-y-5"
                  >
                    {/* OTP */}

                    <div>
                      <label className="mb-2 block text-center text-xs font-medium text-slate-400">
                        Enter 6-digit OTP
                      </label>

                      <input
                        type="text"
                        name="otp"
                        value={otp}
                        onChange={(e) =>
                          setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                        }
                        placeholder="000000"
                        inputMode="numeric"
                        maxLength={6}
                        autoComplete="one-time-code"
                        autoFocus
                        className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-4 text-center text-2xl font-semibold tracking-[0.45em] text-white outline-none transition-all placeholder:text-slate-700 focus:border-violet-500/50 focus:bg-violet-500/[0.03] focus:ring-2 focus:ring-violet-500/10"
                      />
                    </div>

                    {/* TIMER */}

                    {countdown > 0 ? (
                      <div className="text-center">
                        <p className="text-xs text-slate-500">
                          OTP expires in{" "}
                          <span className="font-semibold text-violet-400">
                            {formatCountdown()}
                          </span>
                        </p>
                      </div>
                    ) : (
                      <motion.div
                        initial={{
                          opacity: 0,
                          y: 5,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        className="rounded-xl border border-red-500/10 bg-red-500/[0.04] p-3 text-center"
                      >
                        <p className="mb-2 text-xs text-red-400">
                          OTP has expired.
                        </p>

                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={loading}
                          className="inline-flex items-center gap-2 text-xs font-semibold text-violet-400 transition hover:text-violet-300 disabled:opacity-50"
                        >
                          <FiRefreshCw size={14} />
                          Resend OTP
                        </button>
                      </motion.div>
                    )}

                    {/* VERIFY */}

                    <motion.button
                      type="submit"
                      disabled={loading || otp.length !== 6}
                      whileHover={
                        !loading && otp.length === 6 ? { y: -1 } : undefined
                      }
                      whileTap={
                        !loading && otp.length === 6
                          ? { scale: 0.98 }
                          : undefined
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/10 transition-all hover:shadow-violet-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {loading ? (
                        <>
                          <FiRefreshCw className="animate-spin" size={17} />
                          Verifying...
                        </>
                      ) : (
                        <>
                          Verify OTP
                          <FiCheck size={17} />
                        </>
                      )}
                    </motion.button>

                    {/* CHANGE */}

                    <button
                      type="button"
                      onClick={handleBackToRequest}
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 py-2 text-xs font-medium text-slate-500 transition hover:text-white disabled:opacity-50"
                    >
                      <FiArrowLeft size={14} />
                      Change email / mobile
                    </button>
                  </motion.form>
                )}

                {/* ==================================
                    STEP 3 — RESET PASSWORD
                ================================== */}

                {step === "reset" && (
                  <motion.form
                    key="reset"
                    initial={{
                      opacity: 0,
                      x: 15,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                    }}
                    exit={{
                      opacity: 0,
                      x: 15,
                    }}
                    onSubmit={handleResetPassword}
                    className="space-y-5"
                  >
                    {/* NEW PASSWORD */}

                    <div>
                      <label className="mb-2 block text-xs font-medium text-slate-400">
                        New Password
                      </label>

                      <div className="group relative">
                        <FiLock
                          size={17}
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-violet-400"
                        />

                        <input
                          type={showPassword ? "text" : "password"}
                          name="newPassword"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          autoComplete="new-password"
                          className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] py-3.5 pl-11 pr-12 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-violet-500/50 focus:bg-violet-500/[0.03] focus:ring-2 focus:ring-violet-500/10"
                        />

                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 transition hover:text-slate-300"
                        >
                          {showPassword ? (
                            <FiEyeOff size={17} />
                          ) : (
                            <FiEye size={17} />
                          )}
                        </button>
                      </div>

                      <p className="mt-2 text-[11px] text-slate-600">
                        Minimum 6 characters
                      </p>
                    </div>

                    {/* CONFIRM PASSWORD */}

                    <div>
                      <label className="mb-2 block text-xs font-medium text-slate-400">
                        Confirm Password
                      </label>

                      <div className="group relative">
                        <FiLock
                          size={17}
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-violet-400"
                        />

                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirmPassword"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          autoComplete="new-password"
                          className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] py-3.5 pl-11 pr-12 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-violet-500/50 focus:bg-violet-500/[0.03] focus:ring-2 focus:ring-violet-500/10"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword((prev) => !prev)
                          }
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 transition hover:text-slate-300"
                        >
                          {showConfirmPassword ? (
                            <FiEyeOff size={17} />
                          ) : (
                            <FiEye size={17} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* RESET */}

                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={!loading ? { y: -1 } : undefined}
                      whileTap={!loading ? { scale: 0.98 } : undefined}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/10 transition-all hover:shadow-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <FiRefreshCw className="animate-spin" size={17} />
                          Resetting...
                        </>
                      ) : (
                        <>
                          Reset Password
                          <FiCheck size={17} />
                        </>
                      )}
                    </motion.button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* SECURITY */}

              <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-600">
                <FiShield size={13} />
                <span>Your password reset is securely protected</span>
              </div>
            </div>
          </div>

          {/* FOOTER */}

          <p className="mt-6 text-center text-[11px] text-slate-600">
            NexChat • Secure Messaging
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;
