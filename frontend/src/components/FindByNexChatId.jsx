import { useState } from "react";
import { FiSearch, FiUser, FiMessageCircle, FiX } from "react-icons/fi";

import api from "../services/api";
import UserAvatar from "./UserAvatar";

const FindByNexChatId = ({ onSelectUser, onClose }) => {
  const [nexChatId, setNexChatId] = useState("");
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ==========================================
  // SEARCH USER
  // ==========================================

  const handleSearch = async (event) => {
    event.preventDefault();

    const trimmedId = nexChatId.trim().toUpperCase();

    if (!trimmedId) {
      setError("Please enter a NexChat ID");
      setUser(null);
      return;
    }

    setLoading(true);
    setError("");
    setUser(null);

    try {
      const response = await api.get(
        `/users/nexchat/${encodeURIComponent(trimmedId)}`
      );

      if (response.data?.success) {
        setUser(response.data.user);
      } else {
        setError(response.data?.message || "User not found");
      }
    } catch (error) {
      console.error(
        "NexChat ID search error:",
        error.response?.data?.message || error.message
      );

      setError(error.response?.data?.message || "User not found");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // SELECT USER
  // ==========================================

  const handleStartChat = () => {
    if (!user) return;

    if (onSelectUser) {
      onSelectUser(user);
    }

    if (onClose) {
      onClose();
    }
  };

  // ==========================================
  // CLOSE
  // ==========================================

  const handleClose = () => {
    setNexChatId("");
    setUser(null);
    setError("");

    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        {/* ===================================== */}
        {/* HEADER */}
        {/* ===================================== */}

        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Find on NexChat
            </h2>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Search using NexChat ID
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* ===================================== */}
        {/* BODY */}
        {/* ===================================== */}

        <div className="p-5">
          {/* SEARCH FORM */}

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <FiSearch
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={nexChatId}
                onChange={(event) => {
                  setNexChatId(event.target.value.toUpperCase());

                  setError("");
                }}
                placeholder="NC-XXXXXXXX"
                maxLength={11}
                className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-10 pr-3 text-sm font-medium uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </form>

          {/* ===================================== */}
          {/* ERROR */}
          {/* ===================================== */}

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* ===================================== */}
          {/* USER RESULT */}
          {/* ===================================== */}

          {user && (
            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-4">
                {/* AVATAR */}

                <div className="h-14 w-14 shrink-0">
                  <UserAvatar user={user} size="large" />
                </div>

                {/* USER INFO */}

                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-semibold text-gray-900 dark:text-white">
                    {user.name}
                  </h3>

                  <p className="mt-1 text-sm font-medium text-blue-600 dark:text-blue-400">
                    {user.nexChatId}
                  </p>

                  <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        user.isOnline ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />

                    {user.isOnline ? "Online" : "Offline"}
                  </div>
                </div>
              </div>

              {/* START CHAT */}

              <button
                type="button"
                onClick={handleStartChat}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                <FiMessageCircle size={18} />
                Start Chat
              </button>
            </div>
          )}

          {/* ===================================== */}
          {/* EMPTY STATE */}
          {/* ===================================== */}

          {!user && !error && !loading && (
            <div className="py-10 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                <FiUser size={25} />
              </div>

              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Find your friends on NexChat
              </p>

              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter their unique NexChat ID above
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FindByNexChatId;
