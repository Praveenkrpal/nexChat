import { motion } from "framer-motion";

const TypingIndicator = ({ user }) => {
  if (!user) return null;

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 6,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      exit={{
        opacity: 0,
        y: 6,
      }}
      transition={{
        duration: 0.2,
      }}
      className="border-t border-white/[0.06] bg-[#0b0f1d]/95 px-4 py-2 backdrop-blur-xl"
    >
      <div className="flex items-center gap-2">
        {/* Typing text */}
        <span className="max-w-[180px] truncate text-xs text-slate-500 sm:max-w-[260px]">
          <span className="font-medium text-violet-400">{user}</span> is typing
        </span>

        {/* Animated dots */}
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((index) => (
            <motion.span
              key={index}
              animate={{
                y: [0, -4, 0],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: index * 0.15,
              }}
              className="h-1.5 w-1.5 rounded-full bg-violet-400"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default TypingIndicator;
