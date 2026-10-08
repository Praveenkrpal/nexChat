import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  FiUser,
  FiMail,
  FiLock,
  FiPhone,
  FiMessageCircle,
  FiShield,
  FiRefreshCw,
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";

import api from "../services/api";

const OTP_DURATION = 60;

const Register = () => {
  const navigate = useNavigate();

  // ==========================================
  // REGISTRATION FORM
  // ==========================================

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [verificationMethod, setVerificationMethod] = useState("email");

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  // register / verify
  const [step, setStep] = useState("register");

  // ==========================================
  // OTP
  // ==========================================

  const [otp, setOtp] = useState("");
  const [verificationId, setVerificationId] = useState("");

  const [countdown, setCountdown] = useState(OTP_DURATION);

  const [otpExpired, setOtpExpired] = useState(false);

  // ==========================================
  // UI STATES
  // ==========================================

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // ==========================================
  // COUNTDOWN
  // ==========================================

  useEffect(() => {
    if (step !== "verify" || countdown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setOtpExpired(true);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step]);

  // ==========================================
  // RESET TIMER
  // ==========================================

  const startOtpTimer = () => {
    setCountdown(OTP_DURATION);
    setOtpExpired(false);
    setOtp("");
  };

  // ==========================================
  // FORMAT TIMER
  // ==========================================

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);

    const remainingSeconds = seconds % 60;

    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  // ==========================================
  // HANDLE INPUT
  // ==========================================

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // ==========================================
  // CHANGE VERIFICATION METHOD
  // ==========================================

  const handleMethodChange = (method) => {
    setVerificationMethod(method);

    setError("");
    setSuccess("");

    if (method === "email") {
      setForm((prev) => ({
        ...prev,
        phone: "",
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        email: "",
      }));
    }
  };

  // ==========================================
  // REGISTER
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const payload = {
        name: form.name,
        password: form.password,
        verificationMethod,
      };

      // EMAIL
      if (verificationMethod === "email") {
        payload.email = form.email;
      }

      // MOBILE
      if (verificationMethod === "mobile") {
        payload.phone = form.phone;
      }

      const response = await api.post("/auth/register", payload);

      const data = response.data;

      if (verificationMethod === "mobile") {
        setVerificationId(data.verificationId || "");
      }

      setSuccess(data.message);

      startOtpTimer();

      setStep("verify");
    } catch (error) {
      setError(error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // VERIFY OTP
  // ==========================================

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    // Frontend expiry check
    if (otpExpired || countdown <= 0) {
      setOtpExpired(true);

      setError("OTP has expired. Please resend a new OTP.");

      return;
    }

    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");

      return;
    }

    setLoading(true);

    try {
      // EMAIL OTP
      if (verificationMethod === "email") {
        const response = await api.post("/auth/verify-email", {
          email: form.email,
          otp,
        });

        setSuccess(
          response.data?.message || "Email verified successfully"
        );
      }

      // MOBILE OTP
      else {
        const response = await api.post("/auth/verify-mobile-otp", {
          phone: form.phone,
          verificationId,
          otp,
        });

        setSuccess(
          response.data?.message || "Mobile number verified successfully"
        );
      }

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (error) {
      const message =
        error.response?.data?.message || "OTP verification failed";

      const lowerMessage = message.toLowerCase();

      if (
        lowerMessage.includes("expired") ||
        lowerMessage.includes("expire")
      ) {
        setOtpExpired(true);
        setCountdown(0);

        setError("OTP has expired. Please resend a new OTP.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // RESEND OTP
  // ==========================================

  const handleResendOtp = async () => {
    if (countdown > 0 || resending || loading) {
      return;
    }

    setError("");
    setSuccess("");
    setResending(true);

    try {
      // EMAIL
      if (verificationMethod === "email") {
        const response = await api.post("/auth/resend-email-otp", {
          email: form.email,
        });

        setSuccess(
          response.data?.message || "New OTP sent successfully"
        );
      }

      // MOBILE
      else {
        const response = await api.post("/auth/send-mobile-otp", {
          phone: form.phone,
        });

        setVerificationId(response.data?.verificationId || "");

        setSuccess(
          response.data?.message || "New OTP sent successfully"
        );
      }

      startOtpTimer();
    } catch (error) {
      setError(
        error.response?.data?.message || "Unable to resend OTP"
      );
    } finally {
      setResending(false);
    }
  };

  // ==========================================
  // CHANGE EMAIL / MOBILE
  // ==========================================

  const handleChangeIdentifier = () => {
    setStep("register");

    setOtp("");
    setVerificationId("");

    setCountdown(OTP_DURATION);
    setOtpExpired(false);

    setError("");
    setSuccess("");
  };

  // ==========================================
  // UI
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
          className="w-full max-w-[460px]"
        >
          {/* ==================================
              BRAND
          ================================== */}

          <div className="mb-6 text-center sm:mb-8">
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.7,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              transition={{
                delay: 0.1,
                type: "spring",
                stiffness: 220,
                damping: 18,
              }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-[0_0_35px_rgba(139,92,246,0.25)]"
            >
              {step === "register" ? (
                <FiMessageCircle size={29} className="text-white" />
              ) : (
                <FiShield size={29} className="text-white" />
              )}
            </motion.div>

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
                  {step === "register"
                    ? "Create your account"
                    : "Verify your account"}
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                  {step === "register" ? (
                    <>
                      Join{" "}
                      <span className="font-medium text-violet-400">
                        NexChat
                      </span>{" "}
                      and start chatting
                    </>
                  ) : verificationMethod === "email" ? (
                    <>
                      Enter the OTP sent to{" "}
                      <span className="text-slate-300">
                        {form.email}
                      </span>
                    </>
                  ) : (
                    <>
                      Enter the OTP sent to{" "}
                      <span className="text-slate-300">
                        +91 {form.phone}
                      </span>
                    </>
                  )}
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
                      <p className="text-xs leading-5 text-red-400">
                        {error}
                      </p>
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
                  REGISTER STEP
              ================================== */}

              <AnimatePresence mode="wait">
                {step === "register" && (
                  <motion.div
                    key="register"
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
                  >
                    {/* Verification method */}

                    <div className="mb-6">
                      <label className="mb-3 block text-xs font-medium text-slate-400">
                        Verify your account using
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
                            verificationMethod === "email"
                              ? "left-1"
                              : "left-[calc(50%+2px)]"
                          }`}
                        />

                        {/* EMAIL */}

                        <button
                          type="button"
                          onClick={() => handleMethodChange("email")}
                          className={`relative z-10 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                            verificationMethod === "email"
                              ? "text-white"
                              : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          <FiMail size={15} />
                          Email
                        </button>

                        {/* MOBILE */}

                        <button
                          type="button"
                          onClick={() => handleMethodChange("mobile")}
                          className={`relative z-10 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                            verificationMethod === "mobile"
                              ? "text-white"
                              : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          <FiPhone size={15} />
                          Mobile
                        </button>
                      </div>
                    </div>

                    {/* Registration form */}

                    <form
                      onSubmit={handleSubmit}
                      className="space-y-5"
                    >
                      {/* NAME */}

                      <div>
                        <label className="mb-2 block text-xs font-medium text-slate-400">
                          Full Name
                        </label>

                        <div className="group flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 transition-all focus-within:border-violet-500/50 focus-within:bg-violet-500/[0.03] focus-within:ring-2 focus-within:ring-violet-500/10">
                          <FiUser
                            size={17}
                            className="shrink-0 text-slate-600 transition-colors group-focus-within:text-violet-400"
                          />

                          <input
                            type="text"
                            name="name"
                            required
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Your name"
                            className="w-full bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-slate-600"
                          />
                        </div>
                      </div>

                      {/* EMAIL / MOBILE */}

                      <AnimatePresence mode="wait">
                        {verificationMethod === "email" && (
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
                            transition={{
                              duration: 0.18,
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
                                required
                                value={form.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                className="w-full bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-slate-600"
                              />
                            </div>
                          </motion.div>
                        )}

                        {/* MOBILE */}

                        {verificationMethod === "mobile" && (
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
                            transition={{
                              duration: 0.18,
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
                                required
                                maxLength={10}
                                inputMode="numeric"
                                value={form.phone}
                                onChange={(e) => {
                                  setForm({
                                    ...form,
                                    phone: e.target.value.replace(
                                      /\D/g,
                                      ""
                                    ),
                                  });
                                }}
                                placeholder="9876543210"
                                className="w-full bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-slate-600"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* PASSWORD */}

                      <div>
                        <label className="mb-2 block text-xs font-medium text-slate-400">
                          Password
                        </label>

                        <div className="group flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 transition-all focus-within:border-violet-500/50 focus-within:bg-violet-500/[0.03] focus-within:ring-2 focus-within:ring-violet-500/10">
                          <FiLock
                            size={17}
                            className="shrink-0 text-slate-600 transition-colors group-focus-within:text-violet-400"
                          />

                          <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            required
                            minLength={6}
                            value={form.password}
                            onChange={handleChange}
                            placeholder="Minimum 6 characters"
                            className="w-full bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-slate-600"
                          />

                          {/* SHOW / HIDE PASSWORD */}

                          <button
                            type="button"
                            onClick={() =>
                              setShowPassword((prev) => !prev)
                            }
                            aria-label={
                              showPassword
                                ? "Hide password"
                                : "Show password"
                            }
                            className="shrink-0 text-slate-500 transition-colors hover:text-violet-400 focus:outline-none"
                          >
                            {showPassword ? (
                              <FiEyeOff size={18} />
                            ) : (
                              <FiEye size={18} />
                            )}
                          </button>
                        </div>

                        <p className="mt-2 text-[11px] text-slate-600">
                          Use at least 6 characters for your password.
                        </p>
                      </div>

                      {/* SUBMIT */}

                      <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={!loading ? { y: -1 } : undefined}
                        whileTap={
                          !loading ? { scale: 0.98 } : undefined
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/10 transition-all hover:shadow-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {loading ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            Creating account...
                          </>
                        ) : (
                          <>
                            Create Account
                            <FiArrowRight size={17} />
                          </>
                        )}
                      </motion.button>
                    </form>

                    {/* LOGIN */}

                    <p className="mt-6 text-center text-xs text-slate-500">
                      Already have an account?{" "}
                      <Link
                        to="/login"
                        className="font-semibold text-violet-400 transition hover:text-violet-300"
                      >
                        Login
                      </Link>
                    </p>
                  </motion.div>
                )}

                {/* ==================================
                    OTP STEP
                ================================== */}

                {step === "verify" && (
                  <motion.form
                    key="verify"
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
                    {/* OTP icon */}

                    <div className="flex justify-center">
                      <motion.div
                        initial={{
                          scale: 0.7,
                          opacity: 0,
                        }}
                        animate={{
                          scale: 1,
                          opacity: 1,
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 250,
                        }}
                        className="flex h-20 w-20 items-center justify-center rounded-full border border-violet-500/20 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 text-violet-400"
                      >
                        <FiShield size={32} />
                      </motion.div>
                    </div>

                    {/* OTP information */}

                    <div className="text-center">
                      <p className="text-xs leading-5 text-slate-500">
                        We've sent a 6-digit verification code to your{" "}
                        {verificationMethod === "email"
                          ? "email address"
                          : "mobile number"}
                        .
                      </p>
                    </div>

                    {/* OTP input */}

                    <div>
                      <label className="mb-2 block text-xs font-medium text-slate-400">
                        Verification Code
                      </label>

                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        onChange={(e) =>
                          setOtp(
                            e.target.value.replace(/\D/g, "")
                          )
                        }
                        placeholder="000000"
                        disabled={otpExpired}
                        autoFocus
                        className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-4 text-center text-2xl font-semibold tracking-[0.45em] text-white outline-none transition-all placeholder:text-slate-700 focus:border-violet-500/50 focus:bg-violet-500/[0.03] focus:ring-2 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>

                    {/* Countdown */}

                    <div className="text-center">
                      {countdown > 0 ? (
                        <p className="text-xs text-slate-500">
                          Code expires in{" "}
                          <span className="font-semibold text-violet-400">
                            {formatTime(countdown)}
                          </span>
                        </p>
                      ) : (
                        <p className="text-xs font-medium text-red-400">
                          Verification code expired
                        </p>
                      )}
                    </div>

                    {/* Verify */}

                    <motion.button
                      type="submit"
                      disabled={
                        loading ||
                        otpExpired ||
                        otp.length !== 6
                      }
                      whileHover={
                        !loading &&
                        !otpExpired &&
                        otp.length === 6
                          ? { y: -1 }
                          : undefined
                      }
                      whileTap={
                        !loading &&
                        !otpExpired &&
                        otp.length === 6
                          ? { scale: 0.98 }
                          : undefined
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/10 transition-all hover:shadow-violet-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {loading ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          Verify Account
                          <FiCheck size={17} />
                        </>
                      )}
                    </motion.button>

                    {/* Resend */}

                    <motion.button
                      type="button"
                      whileHover={
                        countdown === 0 &&
                        !resending &&
                        !loading
                          ? { y: -1 }
                          : undefined
                      }
                      whileTap={
                        countdown === 0 &&
                        !resending &&
                        !loading
                          ? { scale: 0.98 }
                          : undefined
                      }
                      onClick={handleResendOtp}
                      disabled={
                        countdown > 0 || resending || loading
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] py-3 text-xs font-medium text-slate-400 transition-all hover:border-violet-500/30 hover:bg-violet-500/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <FiRefreshCw
                        size={15}
                        className={resending ? "animate-spin" : ""}
                      />

                      {resending
                        ? "Sending new code..."
                        : countdown > 0
                        ? `Resend code in ${formatTime(
                            countdown
                          )}`
                        : "Resend verification code"}
                    </motion.button>

                    {/* Change identifier */}

                    <button
                      type="button"
                      onClick={handleChangeIdentifier}
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 py-2 text-xs font-medium text-violet-400 transition hover:text-violet-300 disabled:opacity-50"
                    >
                      <FiArrowLeft size={14} />
                      Change{" "}
                      {verificationMethod === "email"
                        ? "email address"
                        : "mobile number"}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Security */}

              <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-600">
                <FiShield size={13} />

                <span>Your information is securely protected</span>
              </div>
            </div>
          </div>

          {/* Footer */}

          <p className="mt-6 text-center text-[11px] text-slate-600">
            NexChat • Simple. Private. Real-time.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;