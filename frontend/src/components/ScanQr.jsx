import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { FiCamera, FiX, FiCheckCircle, FiAlertCircle } from "react-icons/fi";

const ScanQr = ({ onUserFound, onClose }) => {
  const scannerRef = useRef(null);
  const hasScannedRef = useRef(false);

  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const scannerId = "nexchat-qr-reader";

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode(scannerId);

        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: {
              width: 250,
              height: 250,
            },
          },

          // =========================
          // QR SUCCESS CALLBACK
          // =========================
          async (decodedText) => {
            // Prevent duplicate scan callbacks
            if (hasScannedRef.current) {
              return;
            }

            // Lock scanning immediately
            hasScannedRef.current = true;

            console.log("QR scanned:", decodedText);

            // NexChat ID format:
            // NC-XXXXXXXX

            const nexChatId = decodedText.trim().toUpperCase();

            // =========================
            // VALIDATE NEXCHAT ID
            // =========================
            if (!/^NC-[A-Z0-9]{8}$/.test(nexChatId)) {
              console.log("Invalid QR:", decodedText);

              // Allow scanning again
              hasScannedRef.current = false;

              setError("Invalid NexChat QR code");

              return;
            }

            console.log("Valid NexChat ID:", nexChatId);

            // Stop showing scanner UI
            setScanning(false);

            // Clear previous error
            setError("");

            // =========================
            // STOP CAMERA
            // =========================
            try {
              if (scannerRef.current) {
                await scannerRef.current.stop();
              }
            } catch (stopError) {
              console.log("Scanner stop error:", stopError);
            }

            // =========================
            // SEND ID TO SIDEBAR
            // =========================
            onUserFound(nexChatId);
          },

          // =========================
          // QR SCAN ERROR CALLBACK
          // =========================
          () => {
            // Ignore normal scanning errors.
            // html5-qrcode calls this continuously
            // when no QR code is detected.
          }
        );
      } catch (error) {
        console.error("QR scanner error:", error);

        setError("Unable to access camera. Please allow camera permission.");

        setScanning(false);
      }
    };

    startScanner();

    // =========================
    // CLEANUP
    // =========================
    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            scannerRef.current = null;
          });
      }
    };
  }, [onUserFound]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        {/* =========================
            HEADER
        ========================= */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
              <FiCamera size={20} />
            </div>

            <div>
              <h2 className="font-semibold text-white">Scan QR Code</h2>

              <p className="text-xs text-slate-400">
                Scan a NexChat profile QR
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* =========================
            SCANNER
        ========================= */}
        <div className="p-5">
          {scanning && (
            <>
              <div
                id="nexchat-qr-reader"
                className="overflow-hidden rounded-2xl bg-black"
              />

              <p className="mt-4 text-center text-sm text-slate-400">
                Point your camera at a NexChat QR code
              </p>
            </>
          )}

          {/* =========================
              ERROR
          ========================= */}
          {error && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
              <FiAlertCircle className="shrink-0 text-red-400" size={20} />

              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* =========================
              SUCCESS
          ========================= */}
          {!scanning && !error && (
            <div className="flex flex-col items-center py-10">
              <FiCheckCircle className="mb-3 text-green-400" size={48} />

              <p className="text-sm text-slate-300">
                QR code scanned successfully
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScanQr;
