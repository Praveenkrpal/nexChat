import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import api from "../services/api";

const UserAvatar = ({
  user,
  size = "md",
  showOnline = false,
  online = false,
}) => {
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const sizeClasses = {
    sm: "h-10 w-10 text-sm",
    md: "h-12 w-12 text-base",
    lg: "h-20 w-20 text-2xl",
  };

  const onlineSizeClasses = {
    sm: "h-3 w-3 border-2",
    md: "h-3.5 w-3.5 border-2",
    lg: "h-4 w-4 border-[3px]",
  };

  // ==========================================
  // LOAD GRIDFS AVATAR
  // ==========================================

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;

    const loadAvatar = async () => {
      if (!user?.avatar) {
        setImageUrl("");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const avatarId = user.avatar?.toString();

        const response = await api.get(`/messages/file/${avatarId}`, {
          responseType: "blob",
        });

        if (cancelled) return;

        objectUrl = URL.createObjectURL(response.data);

        setImageUrl(objectUrl);
      } catch (error) {
        console.error(
          `Failed to load avatar for ${user?.name}:`,
          error.response?.data?.message || error.message
        );

        if (!cancelled) {
          setImageUrl("");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAvatar();

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [user?.avatar]);

  // ==========================================
  // USER INITIAL
  // ==========================================

  const initial = user?.name?.charAt(0)?.toUpperCase() || "?";

  // ==========================================
  // AVATAR
  // ==========================================

  return (
    <div className="relative flex-shrink-0">
      {/* Avatar */}

      {loading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`${sizeClasses[size]} flex items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.04]`}
        >
          <div className="h-1/2 w-1/2 animate-pulse rounded-full bg-white/10" />
        </motion.div>
      ) : imageUrl ? (
        <motion.img
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          src={imageUrl}
          alt={user?.name || "User"}
          className={`${sizeClasses[size]} rounded-full border border-white/10 object-cover`}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className={`${sizeClasses[size]} flex items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 font-semibold text-white shadow-[0_0_18px_rgba(139,92,246,0.12)]`}
        >
          {initial}
        </motion.div>
      )}

      {/* Online indicator */}

      {showOnline && online && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 20,
          }}
          className={`absolute bottom-0 right-0 ${onlineSizeClasses[size]} rounded-full border-[#0b0f1d] bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]`}
        />
      )}
    </div>
  );
};

export default UserAvatar;
