import { useEffect, useState } from "react";

import {
  FiDownload,
  FiMoreHorizontal,
  FiTrash2,
  FiFile,
  FiImage,
  FiPlay,
} from "react-icons/fi";

import { motion, AnimatePresence } from "framer-motion";

import api from "../services/api";

const Message = ({ message, own, onDelete }) => {
  const [fileUrl, setFileUrl] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const fileSize = message.fileSize
    ? `${Math.round(message.fileSize / 1024)} KB`
    : "";

  // ==========================================
  // MEDIA MESSAGE CHECK
  // ==========================================

  const isMediaMessage = ["image", "video", "audio", "file"].includes(
    message.messageType
  );

  // ==========================================
  // LOAD GRIDFS FILE
  // ==========================================

  useEffect(() => {
    let objectUrl = null;

    const loadFile = async () => {
      if (!message.fileId || message.isDeleted || message.deletedForEveryone) {
        return;
      }

      try {
        setFileLoading(true);

        const response = await api.get(`/messages/file/${message.fileId}`, {
          responseType: "blob",
        });

        objectUrl = URL.createObjectURL(response.data);

        setFileUrl(objectUrl);
      } catch (error) {
        console.error(
          "Failed to load file:",
          error.response?.data?.message || error.message
        );
      } finally {
        setFileLoading(false);
      }
    };

    loadFile();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [message.fileId, message.isDeleted, message.deletedForEveryone]);

  // ==========================================
  // CLOSE MENU
  // ==========================================

  useEffect(() => {
    const handleClickOutside = () => {
      setShowMenu(false);
    };

    if (showMenu) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showMenu]);

  // ==========================================
  // DELETE FOR ME
  // ==========================================

  const handleDeleteForMe = async () => {
    try {
      setShowMenu(false);

      await api.delete(`/messages/${message._id}`, {
        data: {
          deleteFor: "me",
        },
      });

      if (onDelete) {
        onDelete(message._id, "me");
      }
    } catch (error) {
      console.error(
        "Delete for me error:",
        error.response?.data?.message || error.message
      );
    }
  };

  // ==========================================
  // DELETE FOR EVERYONE
  // ==========================================

  const handleDeleteForEveryone = async () => {
    try {
      setShowMenu(false);

      await api.delete(`/messages/${message._id}`, {
        data: {
          deleteFor: "everyone",
        },
      });

      if (onDelete) {
        onDelete(message._id, "everyone");
      }
    } catch (error) {
      console.error(
        "Delete for everyone error:",
        error.response?.data?.message || error.message
      );
    }
  };

  // ==========================================
  // CONTEXT MENU
  // ==========================================

  const handleContextMenu = (event) => {
    event.preventDefault();

    if (message.isDeleted || message.deletedForEveryone) {
      return;
    }

    setShowMenu(true);
  };

  // ==========================================
  // DELETED MESSAGE
  // ==========================================

  if (message.isDeleted || message.deletedForEveryone) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={`mb-3 flex ${own ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`max-w-[80%] rounded-2xl border px-4 py-2.5 ${
            own
              ? "rounded-br-md border-violet-500/10 bg-violet-500/10"
              : "rounded-bl-md border-white/5 bg-white/5"
          }`}
        >
          <div className="flex items-center gap-2">
            <FiTrash2 size={13} className="shrink-0 text-slate-500" />

            <p className="text-xs italic text-slate-500">
              This message was deleted
            </p>
          </div>

          <div className="mt-1 text-right text-[10px] text-slate-600">
            {time}
          </div>
        </div>
      </motion.div>
    );
  }

  // ==========================================
  // MESSAGE STATUS
  // ==========================================

  const renderStatus = () => {
    if (!own) return null;

    if (message.isSeen) {
      return (
        <span className="ml-1 font-semibold tracking-[-3px] text-violet-300">
          ✓✓
        </span>
      );
    }

    if (message.isDelivered) {
      return (
        <span className="ml-1 font-semibold tracking-[-3px] text-slate-300">
          ✓✓
        </span>
      );
    }

    return <span className="ml-1 font-semibold text-slate-300">✓</span>;
  };

  // ==========================================
  // MEDIA LOADING
  // ==========================================

  const MediaLoading = ({ text }) => (
    <div className="flex h-32 min-w-[220px] items-center justify-center rounded-xl bg-black/10">
      <div className="flex items-center gap-2 text-xs opacity-60">
        <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
        {text}
      </div>
    </div>
  );

  // ==========================================
  // RENDER MESSAGE
  // ==========================================

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 8,
        scale: 0.98,
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      transition={{
        duration: 0.18,
        ease: "easeOut",
      }}
      className={`group mb-3 flex ${own ? "justify-end" : "justify-start"}`}
    >
      <div className="relative max-w-[88%] sm:max-w-[380px]">
        {/* ======================================
            DELETE MENU
        ====================================== */}

        <AnimatePresence>
          {showMenu && (
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
              onClick={(e) => e.stopPropagation()}
              className={`absolute top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#151a2c]/95 shadow-2xl shadow-black/40 backdrop-blur-xl ${
                own ? "right-0" : "left-0"
              }`}
            >
              <button
                onClick={handleDeleteForMe}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                <FiTrash2 size={15} />

                <span>Delete for me</span>
              </button>

              {own && (
                <button
                  onClick={handleDeleteForEveryone}
                  className="flex w-full items-center gap-3 border-t border-white/5 px-4 py-3 text-left text-sm text-red-400 transition hover:bg-red-500/10"
                >
                  <FiTrash2 size={15} />

                  <span>Delete for everyone</span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ======================================
            MORE BUTTON
        ====================================== */}

        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu((prev) => !prev);
          }}
          className={`absolute -top-2 z-20 hidden h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-[#151a2c] text-slate-500 shadow-lg transition-all hover:text-white group-hover:flex ${
            own ? "-left-9" : "-right-9"
          }`}
          title="Message options"
        >
          <FiMoreHorizontal size={14} />
        </button>

        {/* ======================================
            MESSAGE BUBBLE

            Text messages keep the original
            bubble styling.

            Media messages have NO outer
            background, border or padding.
        ====================================== */}

        <div
          onContextMenu={handleContextMenu}
          className={
            isMediaMessage
              ? "text-slate-100"
              : `overflow-hidden rounded-2xl border px-3 py-2.5 shadow-sm ${
                  own
                    ? "rounded-br-md border-violet-400/20 bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-violet-900/20"
                    : "rounded-bl-md border-white/5 bg-[#151a2c] text-slate-100"
                }`
          }
        >
          {/* ====================================
              IMAGE
          ==================================== */}

          {message.messageType === "image" && (
            <div className="mb-1">
              {fileLoading ? (
                <MediaLoading text="Loading image..." />
              ) : fileUrl ? (
                <div className="overflow-hidden rounded-xl">
                  <img
                    src={fileUrl}
                    alt={message.fileName || "Image"}
                    className="block max-h-80 max-w-full cursor-pointer object-cover transition-transform duration-300 hover:scale-[1.02]"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-black/10 p-4 text-xs opacity-60">
                  <FiImage size={16} />
                  Unable to load image
                </div>
              )}
            </div>
          )}

          {/* ====================================
              VIDEO
          ==================================== */}

          {message.messageType === "video" && (
            <div className="mb-1 overflow-hidden rounded-xl bg-black/20">
              {fileLoading ? (
                <MediaLoading text="Loading video..." />
              ) : fileUrl ? (
                <>
                  <div className="relative">
                    <video
                      src={fileUrl}
                      controls
                      preload="metadata"
                      playsInline
                      className="block max-h-80 w-full rounded-xl"
                    >
                      Your browser does not support video playback.
                    </video>

                    <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm">
                      <FiPlay size={13} />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 px-2 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {message.fileName || "Video"}
                      </p>

                      {fileSize && (
                        <p className="mt-0.5 text-[10px] opacity-50">
                          {fileSize}
                        </p>
                      )}
                    </div>

                    <a
                      href={fileUrl}
                      download={message.fileName || "video"}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-lg p-2 transition hover:bg-black/10"
                      title="Download video"
                    >
                      <FiDownload size={15} />
                    </a>
                  </div>
                </>
              ) : (
                <div className="p-3 text-xs opacity-60">
                  Unable to load video
                </div>
              )}
            </div>
          )}

          {/* ====================================
              AUDIO
          ==================================== */}

          {message.messageType === "audio" && (
            <div className="mb-1 min-w-[220px] sm:min-w-[250px]">
              {fileLoading ? (
                <div className="flex items-center gap-2 p-2">
                  <span className="text-lg">🎧</span>

                  <span className="text-xs opacity-60">Loading audio...</span>
                </div>
              ) : fileUrl ? (
                <div className="flex flex-col gap-2">
                  <audio
                    src={fileUrl}
                    controls
                    preload="metadata"
                    className="w-full"
                  />

                  {message.fileName && (
                    <div className="truncate px-1 text-xs opacity-60">
                      {message.fileName}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs opacity-60">Unable to load audio</div>
              )}
            </div>
          )}

          {/* ====================================
              FILE / DOCUMENT
          ==================================== */}

          {message.messageType === "file" && (
            <div className="mb-1">
              {fileLoading ? (
                <MediaLoading text="Loading file..." />
              ) : fileUrl ? (
                <a
                  href={fileUrl}
                  download={message.fileName || "download"}
                  onClick={(e) => e.stopPropagation()}
                  className="flex min-w-[220px] items-center gap-3 rounded-xl bg-black/10 p-3 transition hover:bg-black/20"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <FiFile size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {message.fileName || "File"}
                    </div>

                    {fileSize && (
                      <div className="mt-0.5 text-[10px] opacity-60">
                        {fileSize}
                      </div>
                    )}
                  </div>

                  <FiDownload size={16} className="shrink-0 opacity-70" />
                </a>
              ) : (
                <div className="flex items-center gap-2 text-xs opacity-60">
                  <FiFile size={15} />
                  Unable to load file
                </div>
              )}
            </div>
          )}

          {/* ====================================
              TEXT
          ==================================== */}

          {message.text && (
            <p className="whitespace-pre-wrap break-words text-sm leading-5">
              {message.text}
            </p>
          )}

          {/* ====================================
              TIME + STATUS
          ==================================== */}

          <div
            className={`mt-1 flex items-center justify-end text-[10px] ${
              own ? "text-violet-100/80" : "text-slate-500"
            }`}
          >
            <span>{time}</span>

            {renderStatus()}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Message;
