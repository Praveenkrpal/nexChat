const multer = require("multer");

const storage = multer.memoryStorage();

const allowedTypes = [
  // =========================
  // Images
  // =========================
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",

  // =========================
  // Videos
  // =========================
  "video/mp4",
  "video/webm",
  "video/quicktime",

  // =========================
  // Audio
  // =========================
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "audio/x-m4a",

  // =========================
  // Documents
  // =========================
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  // =========================
  // Excel
  // =========================
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  // =========================
  // Text
  // =========================
  "text/plain",

  // =========================
  // ZIP
  // =========================
  "application/zip",
];

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("File type is not supported"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
});

module.exports = upload;