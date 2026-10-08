import {
  FiX,
  FiUserPlus,
  FiClock,
  FiCheck,
  FiMessageCircle,
} from "react-icons/fi";

import UserAvatar from "./UserAvatar";

const QrUserPreview = ({
  user,
  connectionStatus,
  isLoading,
  onClose,
  onConnect,
  onAccept,
  onReject,
  onMessage,
}) => {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-white">NexChat User</h2>

            <p className="mt-0.5 text-xs text-slate-500">
              User found from QR code
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* USER */}
        <div className="px-6 py-7">
          {/* AVATAR */}
          <div className="flex justify-center">
            <UserAvatar
              user={user}
              size="xl"
              showOnline
              online={user.isOnline}
            />
          </div>

          {/* NAME */}
          <div className="mt-5 text-center">
            <h3 className="text-xl font-semibold text-white">
              {user.name || "Unknown User"}
            </h3>

            <p className="mt-2 text-sm text-slate-400">{user.nexChatId}</p>
          </div>

          {/* STATUS */}
          <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
              Connection Status
            </p>

            {connectionStatus === "accepted" && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <FiCheck size={17} />
                </div>

                <div>
                  <p className="text-sm font-medium text-emerald-400">
                    Connected
                  </p>

                  <p className="text-xs text-slate-500">You are connected</p>
                </div>
              </div>
            )}

            {connectionStatus === "sent" && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <FiClock size={17} />
                </div>

                <div>
                  <p className="text-sm font-medium text-amber-400">
                    Request Pending
                  </p>

                  <p className="text-xs text-slate-500">
                    Waiting for their response
                  </p>
                </div>
              </div>
            )}

            {connectionStatus === "incoming" && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                  <FiUserPlus size={17} />
                </div>

                <div>
                  <p className="text-sm font-medium text-violet-400">
                    Wants to Connect
                  </p>

                  <p className="text-xs text-slate-500">
                    This user sent you a request
                  </p>
                </div>
              </div>
            )}

            {connectionStatus === "none" && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                  <FiUserPlus size={17} />
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-300">
                    Not Connected
                  </p>

                  <p className="text-xs text-slate-500">
                    Send a connection request
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ACTIONS */}

          {/* NOT CONNECTED */}
          {connectionStatus === "none" && (
            <button
              type="button"
              disabled={isLoading}
              onClick={onConnect}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiUserPlus size={17} />

              {isLoading ? "Sending..." : "Connect"}
            </button>
          )}

          {/* REQUEST SENT */}
          {connectionStatus === "sent" && (
            <div className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-slate-400">
              <FiClock size={17} />
              Pending
            </div>
          )}

          {/* INCOMING REQUEST */}
          {connectionStatus === "incoming" && (
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={onAccept}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50"
              >
                <FiCheck size={17} />
                Accept
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={onReject}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500/90 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-400 disabled:opacity-50"
              >
                <FiX size={17} />
                Reject
              </button>
            </div>
          )}

          {/* CONNECTED */}
          {connectionStatus === "accepted" && (
            <button
              type="button"
              onClick={onMessage}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              <FiMessageCircle size={17} />
              Message
            </button>
          )}

          {/* CLOSE */}
          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full rounded-xl px-4 py-3 text-sm font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default QrUserPreview;
