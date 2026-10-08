import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";

import {
  FiArrowLeft,
  FiCamera,
  FiEdit2,
  FiSave,
  FiX,
  FiUser,
  FiMail,
  FiCheck,
  FiTrash2,
  FiShield,
  FiCopy,
} from "react-icons/fi";

import api from "../services/api";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

const Profile = () => {
  const navigate = useNavigate();

  // ==========================================
  // REFS
  // ==========================================

  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);

  // ==========================================
  // STATE
  // ==========================================

  const [user, setUser] = useState(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // NexChat ID
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // Avatar
  const [avatar, setAvatar] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");

  // Profile
  const [editing, setEditing] = useState(false);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // ==========================================
  // FETCH PROFILE
  // ==========================================

  const fetchProfile = async () => {
    try {
      setLoading(true);

      const response = await api.get("/users/profile");

      if (response.data?.success) {
        const profile = response.data.user;

        setUser(profile);

        setName(profile.name || "");
        setEmail(profile.email || "");
        setAvatar(profile.avatar || "");
      }
    } catch (error) {
      console.error(
        "Fetch profile error:",
        error.response?.data?.message || error.message
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // LOAD PROFILE
  // ==========================================

  useEffect(() => {
    fetchProfile();
  }, []);

  // ==========================================
  // LOAD GRIDFS AVATAR
  // ==========================================

  useEffect(() => {
    let objectUrl = null;

    const loadAvatar = async () => {
      if (!avatar) {
        setAvatarPreview("");
        return;
      }

      try {
        const response = await api.get(`/messages/file/${avatar}`, {
          responseType: "blob",
        });

        objectUrl = URL.createObjectURL(response.data);

        setAvatarPreview(objectUrl);
      } catch (error) {
        console.error(
          "Load avatar error:",
          error.response?.data?.message || error.message
        );

        setAvatarPreview("");
      }
    };

    loadAvatar();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [avatar]);

  // ==========================================
  // CLEANUP LOCAL PREVIEW
  // ==========================================

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  // ==========================================
  // SELECT AVATAR
  // ==========================================

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    // Validate type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      event.target.value = "";
      return;
    }

    // Validate size
    if (file.size > MAX_AVATAR_SIZE) {
      alert("Profile picture must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    try {
      setUploadingAvatar(true);

      // Local preview
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      const localPreview = URL.createObjectURL(file);

      previewUrlRef.current = localPreview;

      setAvatarPreview(localPreview);

      // ==========================================
      // UPLOAD TO GRIDFS
      // ==========================================

      const formData = new FormData();

      formData.append("file", file);

      const uploadResponse = await api.post("/messages/upload", formData);

      if (!uploadResponse.data?.success) {
        throw new Error(uploadResponse.data?.message || "Avatar upload failed");
      }

      const fileId = uploadResponse.data?.file?.fileId;

      if (!fileId) {
        throw new Error("GridFS file ID was not returned");
      }

      // ==========================================
      // SAVE AVATAR FILE ID
      // ==========================================

      const profileResponse = await api.put("/users/profile", {
        avatar: fileId.toString(),
      });

      if (!profileResponse.data?.success) {
        throw new Error(
          profileResponse.data?.message || "Failed to save profile picture"
        );
      }

      const updatedUser = profileResponse.data.user;

      setUser(updatedUser);
      setAvatar(updatedUser.avatar || "");

      // Remove temporary local preview
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }

      alert("Profile picture updated successfully.");
    } catch (error) {
      console.error(
        "Avatar upload error:",
        error.response?.data?.message || error.message
      );

      alert(
        error.response?.data?.message ||
          error.message ||
          "Failed to upload profile picture"
      );

      // Reload original avatar
      setAvatar(user?.avatar || "");
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  };

  // ==========================================
  // REMOVE AVATAR
  // ==========================================

  const handleRemoveAvatar = async () => {
    if (!avatar) return;

    const confirmed = window.confirm("Remove your profile picture?");

    if (!confirmed) return;

    try {
      setUploadingAvatar(true);

      const response = await api.put("/users/profile", {
        avatar: "",
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to remove profile picture"
        );
      }

      const updatedUser = response.data.user;

      setUser(updatedUser);
      setAvatar("");
      setAvatarPreview("");

      alert("Profile picture removed.");
    } catch (error) {
      console.error(
        "Remove avatar error:",
        error.response?.data?.message || error.message
      );

      alert(
        error.response?.data?.message || "Failed to remove profile picture"
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ==========================================
  // SAVE PROFILE
  // ==========================================

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Name cannot be empty.");
      return;
    }

    if (!email.trim()) {
      alert("Email cannot be empty.");
      return;
    }

    try {
      setSaving(true);

      const response = await api.put("/users/profile", {
        name: name.trim(),
        email: email.trim(),
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to update profile");
      }

      const updatedUser = response.data.user;

      setUser(updatedUser);

      setName(updatedUser.name || "");
      setEmail(updatedUser.email || "");
      setAvatar(updatedUser.avatar || "");

      setEditing(false);

      alert("Profile updated successfully.");
    } catch (error) {
      console.error(
        "Update profile error:",
        error.response?.data?.message || error.message
      );

      alert(error.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // CANCEL EDIT
  // ==========================================

  const handleCancel = () => {
    setName(user?.name || "");
    setEmail(user?.email || "");

    setEditing(false);
  };

  // ==========================================
  // COPY NEXCHAT ID
  // ==========================================

  const handleCopyNexChatId = async () => {
    if (!user?.nexChatId) return;

    try {
      await navigator.clipboard.writeText(user.nexChatId);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Copy NexChat ID error:", error);
    }
  };

  // ==========================================
  // BACK
  // ==========================================

  const handleBack = () => {
    navigate("/chat");
  };

  // ==========================================
  // AVATAR
  // ==========================================

  const renderAvatar = () => {
    if (avatarPreview) {
      return (
        <img
          src={avatarPreview}
          alt="Profile"
          className="h-32 w-32 rounded-full object-cover"
        />
      );
    }

    return (
      <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 text-white shadow-[0_0_35px_rgba(139,92,246,0.25)]">
        {user?.name ? (
          <span className="text-4xl font-bold">
            {user.name.charAt(0).toUpperCase()}
          </span>
        ) : (
          <FiUser size={48} />
        )}
      </div>
    );
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#080b18]">
        <motion.div
          initial={{
            opacity: 0,
            scale: 0.8,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          className="flex flex-col items-center"
        >
          <div className="relative flex h-14 w-14 items-center justify-center">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-violet-500 border-r-fuchsia-500" />

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
              <FiUser size={17} />
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-500">Loading profile...</p>
        </motion.div>
      </div>
    );
  }

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#080b18] text-white">
      {/* ==========================================
          BACKGROUND DECORATION
      ========================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-72 w-72 rounded-full bg-violet-600/10 blur-3xl" />

        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-fuchsia-600/10 blur-3xl" />

        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-600/5 blur-3xl" />
      </div>

      {/* ==========================================
          HEADER
      ========================================== */}

      <motion.header
        initial={{
          opacity: 0,
          y: -15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.3,
        }}
        className="relative z-10 border-b border-white/[0.07] bg-[#0b0f1d]/90 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-[72px] max-w-4xl items-center gap-3 px-4 sm:px-6">
          <motion.button
            type="button"
            whileHover={{
              scale: 1.05,
            }}
            whileTap={{
              scale: 0.9,
            }}
            onClick={handleBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-white/10 hover:text-white"
            title="Back to Chat"
          >
            <FiArrowLeft size={20} />
          </motion.button>

          <div className="min-w-0">
            <h1 className="text-base font-semibold text-white sm:text-lg">
              Profile
            </h1>

            <p className="truncate text-xs text-slate-500 sm:text-sm">
              Manage your account
            </p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
      </motion.header>

      {/* ==========================================
          CONTENT
      ========================================== */}

      <main className="relative z-10 mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        {/* ==========================================
            PROFILE HERO
        ========================================== */}

        <motion.section
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.4,
          }}
          className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0d1222] shadow-2xl shadow-black/20"
        >
          {/* Hero gradient */}

          <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-br from-violet-600/20 via-purple-600/10 to-fuchsia-600/10" />

          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />

          <div className="relative flex flex-col items-center px-5 pb-8 pt-10 sm:px-8">
            {/* ==========================================
                AVATAR
            ========================================== */}

            <motion.div
              initial={{
                scale: 0.8,
                opacity: 0,
              }}
              animate={{
                scale: 1,
                opacity: 1,
              }}
              transition={{
                duration: 0.4,
                delay: 0.1,
              }}
              className="relative"
            >
              {/* Avatar ring */}

              <div className="rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-[3px] shadow-[0_0_35px_rgba(139,92,246,0.2)]">
                <div className="rounded-full bg-[#0d1222] p-[3px]">
                  <div className="overflow-hidden rounded-full">
                    {renderAvatar()}
                  </div>
                </div>
              </div>

              {/* Online indicator */}

              <span className="absolute bottom-2 right-2 h-5 w-5 rounded-full border-4 border-[#0d1222] bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />

              {/* Camera */}

              <motion.button
                type="button"
                whileHover={{
                  scale: 1.08,
                }}
                whileTap={{
                  scale: 0.9,
                }}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 left-0 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#0d1222] bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg transition-all hover:shadow-violet-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                title="Change profile picture"
              >
                <FiCamera size={17} />
              </motion.button>
            </motion.div>

            {/* ==========================================
                HIDDEN FILE INPUT
            ========================================== */}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />

            {/* ==========================================
                NAME
            ========================================== */}

            <motion.div
              initial={{
                opacity: 0,
                y: 8,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.2,
              }}
              className="mt-5 text-center"
            >
              <h2 className="text-xl font-bold text-white sm:text-2xl">
                {user?.name || "User"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {user?.email || "No email"}
              </p>
            </motion.div>

            {/* ==========================================
                NEXCHAT ID
            ========================================== */}

            <motion.div
              initial={{
                opacity: 0,
                y: 8,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.25,
              }}
              className="mt-5 w-full max-w-sm"
            >
              <div className="mb-2 text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Your NexChat ID
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-2">
                <div className="min-w-0 flex-1 px-3">
                  <p className="truncate text-center font-mono text-sm font-semibold tracking-wider text-violet-300">
                    {user?.nexChatId || "NexChat ID unavailable"}
                  </p>
                </div>

                {user?.nexChatId && (
                  <motion.button
                    type="button"
                    whileHover={{
                      scale: 1.05,
                    }}
                    whileTap={{
                      scale: 0.92,
                    }}
                    onClick={handleCopyNexChatId}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-slate-400 transition-all hover:bg-violet-500/15 hover:text-violet-300"
                    title={copied ? "Copied" : "Copy NexChat ID"}
                  >
                    {copied ? <FiCheck size={17} /> : <FiCopy size={17} />}
                  </motion.button>
                )}
              </div>

              {/* Copied message */}

              <AnimatePresence mode="wait">
                {copied && (
                  <motion.p
                    key="copied"
                    initial={{
                      opacity: 0,
                      y: -4,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      y: -4,
                    }}
                    className="mt-2 text-center text-xs font-medium text-emerald-400"
                  >
                    NexChat ID copied
                  </motion.p>
                )}
              </AnimatePresence>

              {/* ==========================================
                  SHOW QR CODE BUTTON
              ========================================== */}

              <motion.button
                type="button"
                whileHover={{
                  y: -1,
                }}
                whileTap={{
                  scale: 0.97,
                }}
                onClick={() => setShowQr(true)}
                disabled={!user?.nexChatId}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-5 py-2.5 text-xs font-medium text-violet-300 transition-all hover:border-violet-500/40 hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="text-base leading-none">▦</span>
                Show QR Code
              </motion.button>
            </motion.div>

            {/* ==========================================
                AVATAR ACTIONS
            ========================================== */}

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <motion.button
                type="button"
                whileHover={{
                  y: -1,
                }}
                whileTap={{
                  scale: 0.97,
                }}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-slate-300 transition-all hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiCamera size={15} />

                {uploadingAvatar ? "Uploading..." : "Change Photo"}
              </motion.button>

              {avatar && (
                <motion.button
                  type="button"
                  whileHover={{
                    y: -1,
                  }}
                  whileTap={{
                    scale: 0.97,
                  }}
                  onClick={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                  className="flex items-center gap-2 rounded-xl border border-red-500/15 bg-red-500/5 px-4 py-2.5 text-xs font-medium text-red-400 transition-all hover:border-red-500/30 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiTrash2 size={14} />
                  Remove
                </motion.button>
              )}
            </div>
          </div>
        </motion.section>

        {/* ==========================================
            ACCOUNT INFORMATION
        ========================================== */}

        <motion.section
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.4,
            delay: 0.1,
          }}
          className="mt-5 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0d1222]"
        >
          {/* Section header */}

          <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-5 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                <FiUser size={18} />
              </div>

              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white sm:text-base">
                  Account Information
                </h3>

                <p className="mt-0.5 text-xs text-slate-500">
                  Update your personal information
                </p>
              </div>
            </div>

            {!editing && (
              <motion.button
                type="button"
                whileHover={{
                  scale: 1.03,
                }}
                whileTap={{
                  scale: 0.96,
                }}
                onClick={() => setEditing(true)}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-300 transition-all hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-white sm:px-4"
              >
                <FiEdit2 size={14} />

                <span className="hidden sm:inline">Edit Profile</span>

                <span className="sm:hidden">Edit</span>
              </motion.button>
            )}
          </div>

          {/* Form */}

          <div className="p-5 sm:p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              {/* NAME */}

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-400">
                  Full Name
                </label>

                <div className="relative">
                  <FiUser
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"
                  />

                  <input
                    type="text"
                    value={name}
                    disabled={!editing || saving}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-violet-500/50 focus:bg-violet-500/[0.03] focus:ring-2 focus:ring-violet-500/10 disabled:cursor-default disabled:text-slate-400"
                  />
                </div>
              </div>

              {/* EMAIL */}

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-400">
                  Email Address
                </label>

                <div className="relative">
                  <FiMail
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"
                  />

                  <input
                    type="email"
                    value={email}
                    disabled={!editing || saving}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-violet-500/50 focus:bg-violet-500/[0.03] focus:ring-2 focus:ring-violet-500/10 disabled:cursor-default disabled:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* EMAIL INFO */}

            <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.04] p-4">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <FiShield size={14} />
              </div>

              <div>
                <p className="text-xs font-medium text-emerald-400">
                  Account information
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Keep your profile information up to date so your contacts can
                  recognize you.
                </p>
              </div>
            </div>

            {/* EDIT ACTIONS */}

            <AnimatePresence>
              {editing && (
                <motion.div
                  initial={{
                    opacity: 0,
                    height: 0,
                    marginTop: 0,
                  }}
                  animate={{
                    opacity: 1,
                    height: "auto",
                    marginTop: 24,
                  }}
                  exit={{
                    opacity: 0,
                    height: 0,
                    marginTop: 0,
                  }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col-reverse gap-2 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-end">
                    <motion.button
                      type="button"
                      whileTap={{
                        scale: 0.97,
                      }}
                      onClick={handleCancel}
                      disabled={saving}
                      className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                    >
                      <FiX size={16} />
                      Cancel
                    </motion.button>

                    <motion.button
                      type="button"
                      whileHover={{
                        y: -1,
                      }}
                      whileTap={{
                        scale: 0.97,
                      }}
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/10 transition-all hover:shadow-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <FiSave size={16} />
                          Save Changes
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        {/* ==========================================
            ACCOUNT STATUS
        ========================================== */}

        <motion.section
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.4,
            delay: 0.2,
          }}
          className="mt-5 rounded-3xl border border-white/[0.08] bg-[#0d1222] p-5 sm:p-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <FiCheck size={18} />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white">
                NexChat Account
              </h3>

              <p className="mt-0.5 text-xs text-slate-500">
                Your profile is active and ready to use.
              </p>
            </div>

            <div className="ml-auto flex items-center gap-2 rounded-full border border-emerald-500/10 bg-emerald-500/5 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

              <span className="text-[11px] font-medium text-emerald-400">
                Active
              </span>
            </div>
          </div>
        </motion.section>

        {/* ==========================================
            FOOTER
        ========================================== */}

        <motion.p
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{
            delay: 0.4,
          }}
          className="py-6 text-center text-[11px] text-slate-600"
        >
          NexChat • Your conversations, your privacy
        </motion.p>
      </main>

      {/* ==========================================
          NEXCHAT QR MODAL
      ========================================== */}

      <AnimatePresence>
        {showQr && user?.nexChatId && (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setShowQr(false)}
          >
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.9,
                y: 20,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.9,
                y: 20,
              }}
              transition={{
                duration: 0.2,
              }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0d1222] p-6 shadow-2xl"
            >
              {/* Modal Header */}

              <div className="mb-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-white">
                    Your NexChat QR
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Scan this code to find you on NexChat
                  </p>
                </div>

                <motion.button
                  type="button"
                  whileHover={{
                    scale: 1.05,
                  }}
                  whileTap={{
                    scale: 0.9,
                  }}
                  onClick={() => setShowQr(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-white/10 hover:text-white"
                  title="Close"
                >
                  <FiX size={18} />
                </motion.button>
              </div>

              {/* QR CODE */}

              <div className="flex justify-center">
                <div className="rounded-2xl bg-white p-5 shadow-xl">
                  <QRCodeCanvas
                    value={user.nexChatId}
                    size={220}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="H"
                    includeMargin
                  />
                </div>
              </div>

              {/* NexChat ID */}

              <div className="mt-5 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] px-4 py-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  NexChat ID
                </p>

                <p className="mt-1 font-mono text-sm font-semibold tracking-wider text-violet-300">
                  {user.nexChatId}
                </p>
              </div>

              {/* Copy ID */}

              <motion.button
                type="button"
                whileHover={{
                  y: -1,
                }}
                whileTap={{
                  scale: 0.97,
                }}
                onClick={handleCopyNexChatId}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 py-3 text-sm font-medium text-violet-300 transition-all hover:border-violet-500/40 hover:bg-violet-500/15"
              >
                {copied ? (
                  <>
                    <FiCheck size={16} />
                    Copied
                  </>
                ) : (
                  <>
                    <FiCopy size={16} />
                    Copy NexChat ID
                  </>
                )}
              </motion.button>

              {/* Close */}

              <motion.button
                type="button"
                whileHover={{
                  y: -1,
                }}
                whileTap={{
                  scale: 0.97,
                }}
                onClick={() => setShowQr(false)}
                className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-medium text-slate-300 transition-all hover:bg-white/[0.08] hover:text-white"
              >
                Close
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
