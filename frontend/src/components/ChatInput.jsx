import { useEffect, useRef, useState } from "react";
import api from "../services/api";

import {
  FiPaperclip,
  FiSmile,
  FiMic,
  FiSend,
  FiX,
  FiTrash2,
  FiFile,
} from "react-icons/fi";

import { motion, AnimatePresence } from "framer-motion";
import EmojiPicker from "emoji-picker-react";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ChatInput = ({ onSend, onTyping, onStopTyping, isBlocked = false }) => {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Selected/recorded media waiting for Send
  const [pendingMedia, setPendingMedia] = useState(null);

  // Uploading state
  const [uploading, setUploading] = useState(false);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const fileInputRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioChunksRef = useRef([]);

  const recordingTimerRef = useRef(null);

  // =====================================================
  // CLEANUP
  // =====================================================

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (pendingMedia?.url) {
        URL.revokeObjectURL(pendingMedia.url);
      }
    };
  }, [pendingMedia?.url]);

  // =====================================================
  // GET MESSAGE TYPE
  // =====================================================

  const getMessageType = (mimeType = "") => {
    if (mimeType.startsWith("image/")) {
      return "image";
    }

    if (mimeType.startsWith("video/")) {
      return "video";
    }

    if (mimeType.startsWith("audio/")) {
      return "audio";
    }

    return "file";
  };

  // =====================================================
  // FORMAT FILE SIZE
  // =====================================================

  const formatFileSize = (bytes) => {
    if (!bytes) {
      return "0 Bytes";
    }

    const sizes = ["Bytes", "KB", "MB", "GB"];

    const index = Math.floor(Math.log(bytes) / Math.log(1024));

    return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${sizes[index]}`;
  };

  // =====================================================
  // CLEAR PENDING MEDIA
  // =====================================================

  const clearPendingMedia = () => {
    if (pendingMedia?.url) {
      URL.revokeObjectURL(pendingMedia.url);
    }

    setPendingMedia(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // =====================================================
  // SELECT FILE
  // =====================================================

  const handleFileChange = (event) => {
    if (isBlocked) {
      event.target.value = "";
      return;
    }

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      alert("File size must be 50 MB or less.");

      event.target.value = "";

      return;
    }

    if (pendingMedia?.url) {
      URL.revokeObjectURL(pendingMedia.url);
    }

    const previewUrl = URL.createObjectURL(file);

    const type = getMessageType(file.type);

    setPendingMedia({
      file,
      url: previewUrl,
      type,
      mimeType: file.type,
      fileName: file.name,
      fileSize: file.size,
      isRecorded: false,
    });

    setShowEmojiPicker(false);

    if (onStopTyping) {
      onStopTyping();
    }
  };

  // =====================================================
  // EMOJI
  // =====================================================

  const handleEmojiClick = (emojiData) => {
    if (isBlocked) return;

    setMessage((prev) => prev + emojiData.emoji);

    if (onTyping) {
      onTyping();
    }
  };

  // =====================================================
  // MESSAGE CHANGE
  // =====================================================

  const handleMessageChange = (event) => {
    if (isBlocked) return;
    const value = event.target.value;

    setMessage(value);

    if (value.trim()) {
      if (onTyping) {
        onTyping();
      }
    } else {
      if (onStopTyping) {
        onStopTyping();
      }
    }
  };

  // =====================================================
  // START AUDIO RECORDING
  // =====================================================

  const startRecording = async () => {
    if (isBlocked) return;
    try {
      if (pendingMedia) {
        return;
      }

      if (message.trim()) {
        return;
      }

      setShowEmojiPicker(false);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      let mimeType = "";

      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        mimeType = "audio/ogg;codecs=opus";
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const actualMimeType = recorder.mimeType || mimeType || "audio/webm";

        const audioBlob = new Blob(audioChunksRef.current, {
          type: actualMimeType,
        });

        if (!audioBlob.size) {
          audioChunksRef.current = [];

          return;
        }

        const extension = actualMimeType.includes("ogg") ? "ogg" : "webm";

        const audioFile = new File(
          [audioBlob],
          `voice-message-${Date.now()}.${extension}`,
          {
            type: actualMimeType,
          }
        );

        const previewUrl = URL.createObjectURL(audioFile);

        setPendingMedia({
          file: audioFile,
          url: previewUrl,
          type: "audio",
          mimeType: actualMimeType,
          fileName: audioFile.name,
          fileSize: audioFile.size,
          isRecorded: true,
        });

        audioChunksRef.current = [];

        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());

          audioStreamRef.current = null;
        }
      };

      recorder.onerror = (event) => {
        console.error("Audio recording error:", event);

        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());

          audioStreamRef.current = null;
        }

        setIsRecording(false);
        setRecordingTime(0);
      };

      recorder.start();

      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      if (onStopTyping) {
        onStopTyping();
      }
    } catch (error) {
      console.error("Microphone permission error:", error);

      alert("Microphone permission is required to record audio.");
    }
  };

  // =====================================================
  // STOP RECORDING
  // =====================================================

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;

    if (!recorder) {
      return;
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);

      recordingTimerRef.current = null;
    }

    setIsRecording(false);
    setRecordingTime(0);

    if (recorder.state !== "inactive") {
      recorder.stop();
    }

    mediaRecorderRef.current = null;

    if (onStopTyping) {
      onStopTyping();
    }
  };

  // =====================================================
  // CANCEL RECORDING
  // =====================================================

  const cancelRecording = () => {
    const recorder = mediaRecorderRef.current;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);

      recordingTimerRef.current = null;
    }

    if (recorder) {
      recorder.onstop = null;

      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    }

    mediaRecorderRef.current = null;

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());

      audioStreamRef.current = null;
    }

    audioChunksRef.current = [];

    setIsRecording(false);
    setRecordingTime(0);

    if (onStopTyping) {
      onStopTyping();
    }
  };

  // =====================================================
  // BLOCK HANDLING
  // =====================================================

  useEffect(() => {
    if (!isBlocked) return;

    // Close emoji picker
    setShowEmojiPicker(false);

    // Stop typing indicator
    if (onStopTyping) {
      onStopTyping();
    }

    // Cancel active recording
    if (isRecording) {
      cancelRecording();
    }
  }, [isBlocked]);

  // =====================================================
  // RECORDING TIMER
  // =====================================================

  const formatRecordingTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);

    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  // =====================================================
  // UPLOAD + SEND MEDIA
  // =====================================================

  const sendPendingMedia = async () => {
    if (isBlocked || !pendingMedia?.file || uploading) {
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();

      formData.append("file", pendingMedia.file);

      const response = await api.post("/messages/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const uploadedFile = response.data?.file;

      if (!uploadedFile?.fileId) {
        throw new Error("File upload failed.");
      }

      const messageType = getMessageType(pendingMedia.mimeType);

      onSend({
        text: message.trim(),
        messageType,
        fileId: uploadedFile.fileId,
        fileName: uploadedFile.fileName || pendingMedia.fileName,
        fileSize: uploadedFile.fileSize || pendingMedia.fileSize,
        mimeType: uploadedFile.mimeType || pendingMedia.mimeType,
      });

      clearPendingMedia();

      setMessage("");

      setShowEmojiPicker(false);

      if (onStopTyping) {
        onStopTyping();
      }
    } catch (error) {
      console.error("Media upload error:", error);

      console.error("Server response:", error.response?.data);

      const errorMessage =
        error.response?.data?.message ||
        "Failed to upload media. Please try again.";

      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  // =====================================================
  // SEND TEXT OR MEDIA
  // =====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isBlocked || uploading || isRecording) {
      return;
    }

    if (pendingMedia) {
      await sendPendingMedia();

      return;
    }

    const text = message.trim();

    if (!text) {
      return;
    }

    onSend({
      text,
      messageType: "text",
    });

    setMessage("");

    setShowEmojiPicker(false);

    if (onStopTyping) {
      onStopTyping();
    }
  };

  // =====================================================
  // OPEN FILE SELECTOR
  // =====================================================

  const openFileSelector = () => {
    if (isBlocked || uploading || isRecording) {
      return;
    }

    fileInputRef.current?.click();
  };

  // =====================================================
  // PENDING MEDIA PREVIEW
  // =====================================================

  const renderPendingMediaPreview = () => {
    if (!pendingMedia) {
      return null;
    }

    return (
      <AnimatePresence>
        <motion.div
          initial={{
            opacity: 0,
            height: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            height: "auto",
            y: 0,
          }}
          exit={{
            opacity: 0,
            height: 0,
            y: 10,
          }}
          className="border-t border-white/10 bg-[#0b0f1d]/95 px-3 py-3 backdrop-blur-xl sm:px-4"
        >
          <div className="relative flex items-center gap-3 rounded-2xl border border-white/10 bg-[#151a2c] p-3 shadow-lg">
            {/* REMOVE */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={clearPendingMedia}
              disabled={uploading}
              className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/30 text-slate-400 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              title="Remove"
            >
              <FiX size={15} />
            </motion.button>

            {/* IMAGE */}
            {pendingMedia.type === "image" && (
              <img
                src={pendingMedia.url}
                alt="Preview"
                className="h-20 w-20 rounded-xl border border-white/10 object-cover"
              />
            )}

            {/* VIDEO */}
            {pendingMedia.type === "video" && (
              <video
                src={pendingMedia.url}
                controls
                className="h-20 w-32 rounded-xl bg-black object-cover"
              />
            )}

            {/* AUDIO */}
            {pendingMedia.type === "audio" && (
              <div className="flex w-full flex-col gap-2 pr-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
                    <FiMic size={19} />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {pendingMedia.isRecorded
                        ? "Voice message"
                        : pendingMedia.fileName}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatFileSize(pendingMedia.fileSize)}
                    </p>
                  </div>
                </div>

                <audio src={pendingMedia.url} controls className="h-9 w-full" />
              </div>
            )}

            {/* FILE */}
            {pendingMedia.type === "file" && (
              <div className="flex min-w-0 flex-1 items-center gap-3 pr-8">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                  <FiFile size={22} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {pendingMedia.fileName}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatFileSize(pendingMedia.fileSize)}
                  </p>
                </div>
              </div>
            )}

            {/* SEND */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={sendPendingMedia}
              disabled={uploading || isBlocked}
              className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-900/20 transition disabled:cursor-not-allowed disabled:opacity-60"
              title="Send"
            >
              {uploading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <FiSend size={18} />
              )}
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };

  // =====================================================
  // RECORDING UI
  // =====================================================

  if (isRecording) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-t border-white/10 bg-[#0b0f1d]/95 backdrop-blur-xl"
      >
        <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
          {/* CANCEL */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={cancelRecording}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-red-400 transition hover:bg-red-500/20"
            title="Cancel recording"
          >
            <FiTrash2 size={18} />
          </motion.button>

          {/* RECORDING */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500">
              <span className="absolute h-10 w-10 animate-ping rounded-full bg-red-500 opacity-20" />

              <div className="relative h-3 w-3 rounded-full bg-white" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">
                  Recording...
                </span>

                <span className="text-xs font-medium text-red-400">
                  {formatRecordingTime(recordingTime)}
                </span>
              </div>

              {/* WAVEFORM */}
              <div className="mt-1 flex h-5 items-center gap-1 overflow-hidden">
                {[
                  10, 18, 13, 22, 15, 25, 12, 20, 16, 23, 11, 19, 14, 24, 17,
                ].map((height, index) => (
                  <motion.span
                    key={index}
                    animate={{
                      height: [
                        `${height * 0.5}px`,
                        `${height}px`,
                        `${height * 0.7}px`,
                      ],
                    }}
                    transition={{
                      duration: 0.6 + index * 0.03,
                      repeat: Infinity,
                      repeatType: "mirror",
                    }}
                    className="w-1 rounded-full bg-red-400"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* STOP */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={stopRecording}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-900/20"
            title="Stop recording"
          >
            <div className="h-4 w-4 rounded-sm bg-white" />
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // =====================================================
  // NORMAL INPUT
  // =====================================================

  return (
    <div className="relative border-t border-white/10 bg-[#0b0f1d]/95 backdrop-blur-xl">
      {/* PENDING MEDIA */}
      {renderPendingMediaPreview()}

      <form
        onSubmit={handleSubmit}
        className="relative flex items-end gap-1.5 px-2.5 py-3 sm:gap-2 sm:px-4"
      >
        {/* HIDDEN FILE INPUT */}
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept="
            image/jpeg,
            image/png,
            image/gif,
            image/webp,
            video/mp4,
            video/webm,
            video/quicktime,
            audio/mpeg,
            audio/wav,
            audio/ogg,
            audio/webm,
            audio/mp4,
            audio/x-m4a,
            application/pdf,
            application/msword,
            application/vnd.openxmlformats-officedocument.wordprocessingml.document,
            application/vnd.ms-excel,
            application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,
            text/plain,
            application/zip
          "
          onChange={handleFileChange}
        />

        {/* ATTACHMENT */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          type="button"
          onClick={openFileSelector}
          disabled={uploading || isBlocked}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-violet-500/10 hover:text-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
          title="Attach file"
        >
          <FiPaperclip size={20} />
        </motion.button>

        {/* EMOJI */}
        <div className="relative">
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            disabled={uploading || isBlocked}
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
              showEmojiPicker
                ? "bg-yellow-500/10 text-yellow-400"
                : "text-slate-500 hover:bg-yellow-500/10 hover:text-yellow-400"
            } disabled:cursor-not-allowed disabled:opacity-40`}
            title="Emoji"
          >
            <FiSmile size={20} />
          </motion.button>

          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 10,
                  scale: 0.95,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  y: 10,
                  scale: 0.95,
                }}
                className="absolute bottom-12 left-0 z-50"
              >
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme="dark"
                  lazyLoadEmojis
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* TEXT INPUT */}
        <input
          type="text"
          value={message}
          onChange={handleMessageChange}
          placeholder={
            isBlocked
              ? "Messaging is blocked"
              : pendingMedia
              ? "Add a caption..."
              : "Type a message..."
          }
          disabled={uploading || isBlocked}
          className="min-h-10 flex-1 rounded-2xl border border-white/10 bg-[#151a2c] px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        />

        {/* SEND OR MIC */}
        <AnimatePresence mode="wait" initial={false}>
          {pendingMedia || message.trim() ? (
            <motion.button
              key="send"
              initial={{
                opacity: 0,
                scale: 0.7,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                scale: 0.7,
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              type="submit"
              disabled={uploading || isBlocked}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-900/20 transition disabled:cursor-not-allowed disabled:opacity-60"
              title="Send"
            >
              {uploading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <FiSend size={18} />
              )}
            </motion.button>
          ) : (
            <motion.button
              key="mic"
              initial={{
                opacity: 0,
                scale: 0.7,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                scale: 0.7,
              }}
              whileHover={{
                scale: 1.05,
              }}
              whileTap={{
                scale: 0.9,
              }}
              type="button"
              onClick={startRecording}
              disabled={uploading || isBlocked}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-violet-500/10 hover:text-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
              title="Record audio"
            >
              <FiMic size={20} />
            </motion.button>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
};

export default ChatInput;
