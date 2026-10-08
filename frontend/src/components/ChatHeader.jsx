import { useEffect, useState } from "react";

import {
  FiPhone,
  FiVideo,
  FiMoreVertical,
  FiArrowLeft,
  FiUserX,
  FiUserCheck,
} from "react-icons/fi";

import { motion, AnimatePresence } from "framer-motion";

import UserAvatar from "./UserAvatar";
import api from "../services/api";

const ChatHeader = ({
  user,
  online,
  onBack,
  onBlockStatusChange,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [loadingBlockStatus, setLoadingBlockStatus] =
    useState(false);
  const [blockLoading, setBlockLoading] =
    useState(false);

  // ==========================================
  // GET BLOCK STATUS
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    const fetchBlockStatus = async () => {
      if (!user?._id) {
        setBlocked(false);
        return;
      }

      try {
        setLoadingBlockStatus(true);

        const response = await api.get(
          `/blocks/${user._id}`
        );

        if (cancelled) return;

        if (response.data?.success) {
          const isBlocked =
            response.data.blocked === true;

          setBlocked(isBlocked);

          if (onBlockStatusChange) {
            onBlockStatusChange(isBlocked);
          }
        }
      } catch (error) {
        console.error(
          "Failed to fetch block status:",
          error.response?.data?.message ||
            error.message
        );

        if (!cancelled) {
          setBlocked(false);
        }
      } finally {
        if (!cancelled) {
          setLoadingBlockStatus(false);
        }
      }
    };

    fetchBlockStatus();

    return () => {
      cancelled = true;
    };
  }, [user?._id, onBlockStatusChange]);

  // ==========================================
  // BLOCK USER
  // ==========================================

  const handleBlockUser = async () => {
    if (!user?._id || blockLoading) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to block ${
        user.name || "this user"
      }?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setBlockLoading(true);

      const response = await api.post(
        `/blocks/${user._id}`
      );

      if (response.data?.success) {
        setBlocked(true);
        setMenuOpen(false);

        if (onBlockStatusChange) {
          onBlockStatusChange(true);
        }
      }
    } catch (error) {
      console.error(
        "Block user error:",
        error.response?.data?.message ||
          error.message
      );

      alert(
        error.response?.data?.message ||
          "Failed to block user"
      );
    } finally {
      setBlockLoading(false);
    }
  };

  // ==========================================
  // UNBLOCK USER
  // ==========================================

  const handleUnblockUser = async () => {
    if (!user?._id || blockLoading) {
      return;
    }

    try {
      setBlockLoading(true);

      const response = await api.delete(
        `/blocks/${user._id}`
      );

      if (response.data?.success) {
        setBlocked(false);
        setMenuOpen(false);

        if (onBlockStatusChange) {
          onBlockStatusChange(false);
        }
      }
    } catch (error) {
      console.error(
        "Unblock user error:",
        error.response?.data?.message ||
          error.message
      );

      alert(
        error.response?.data?.message ||
          "Failed to unblock user"
      );
    } finally {
      setBlockLoading(false);
    }
  };

  // ==========================================
  // CLOSE MENU WHEN USER CHANGES
  // ==========================================

  useEffect(() => {
    setMenuOpen(false);
  }, [user?._id]);

  if (!user) return null;

  return (
    <header className="relative z-20 flex h-[72px] items-center justify-between border-b border-white/10 bg-[#0b0f1d]/95 px-3 backdrop-blur-xl sm:px-5">
      {/* Left Section */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {/* Back Button - Mobile */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-white/10 hover:text-white md:hidden"
          title="Back"
        >
          <FiArrowLeft size={20} />
        </motion.button>

        {/* Avatar */}
        <div className="relative shrink-0">
          <UserAvatar
            user={user}
            size="sm"
            showOnline
            online={online}
          />
        </div>

        {/* User Information */}
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-white sm:text-base">
            {user.name || "Unknown User"}
          </h2>

          <div className="mt-0.5 flex items-center gap-1.5">
            {blocked ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />

                <p className="text-xs font-medium text-red-400">
                  Blocked
                </p>
              </>
            ) : online ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                <p className="text-xs font-medium text-emerald-400">
                  Online
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-500">
                Offline
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="relative flex shrink-0 items-center gap-1">
        {/* Voice Call */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          disabled={blocked}
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
            blocked
              ? "cursor-not-allowed text-slate-700"
              : "text-slate-400 hover:bg-violet-500/10 hover:text-violet-400"
          }`}
          title={
            blocked
              ? "User is blocked"
              : "Voice Call"
          }
        >
          <FiPhone size={18} />
        </motion.button>

        {/* Video Call */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          disabled={blocked}
          className={`hidden h-10 w-10 items-center justify-center rounded-xl transition-all sm:flex ${
            blocked
              ? "cursor-not-allowed text-slate-700"
              : "text-slate-400 hover:bg-violet-500/10 hover:text-violet-400"
          }`}
          title={
            blocked
              ? "User is blocked"
              : "Video Call"
          }
        >
          <FiVideo size={19} />
        </motion.button>

        {/* More Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={() =>
            setMenuOpen((prev) => !prev)
          }
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-white/10 hover:text-white"
          title="More"
        >
          <FiMoreVertical size={19} />
        </motion.button>

        {/* More Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.95,
                y: -5,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
                y: -5,
              }}
              transition={{
                duration: 0.15,
              }}
              className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#111625]/95 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl"
            >
              {/* Block / Unblock */}
              {loadingBlockStatus ? (
                <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-violet-400" />

                  Checking status...
                </div>
              ) : blocked ? (
                <button
                  onClick={handleUnblockUser}
                  disabled={blockLoading}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-emerald-400 transition-all hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiUserCheck size={17} />

                  <span>
                    {blockLoading
                      ? "Unblocking..."
                      : "Unblock User"}
                  </span>
                </button>
              ) : (
                <button
                  onClick={handleBlockUser}
                  disabled={blockLoading}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-400 transition-all hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiUserX size={17} />

                  <span>
                    {blockLoading
                      ? "Blocking..."
                      : "Block User"}
                  </span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Gradient Line */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
    </header>
  );
};

export default ChatHeader;