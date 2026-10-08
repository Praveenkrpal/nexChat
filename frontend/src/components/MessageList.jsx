import { AnimatePresence, motion } from "framer-motion";
import Message from "./Message";

const MessageList = ({ messages = [], currentUser, onDelete }) => {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-[#080b18] px-3 py-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700/50 sm:px-5">
      {/* Empty Chat */}
      {messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex max-w-xs flex-col items-center text-center"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10">
              <span className="text-2xl">💬</span>
            </div>

            <h3 className="text-sm font-semibold text-white">
              No messages yet
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Start the conversation by sending a message.
            </p>
          </motion.div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <AnimatePresence initial={false}>
            {messages.map((message) => {
              const senderId = message.sender?._id || message.sender;

              const own = senderId?.toString() === currentUser?._id?.toString();

              return (
                <motion.div
                  key={message._id}
                  layout
                  initial={{
                    opacity: 0,
                    y: 10,
                    scale: 0.98,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.95,
                  }}
                  transition={{
                    duration: 0.2,
                    ease: "easeOut",
                  }}
                >
                  <Message message={message} own={own} onDelete={onDelete} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default MessageList;
