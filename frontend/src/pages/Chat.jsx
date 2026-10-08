import { useEffect, useRef, useState } from "react";

import { motion, AnimatePresence } from "framer-motion";

import { useSocket } from "../context/SocketContext";

import api from "../services/api";
import socket from "../services/socket";

import Sidebar from "../components/Sidebar";
import ChatHeader from "../components/ChatHeader";
import MessageList from "../components/MessageList";
import ChatInput from "../components/ChatInput";
import TypingIndicator from "../components/TypingIndicator";

const Chat = ({ user }) => {
  const { onlineUsers } = useSocket();

  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    setIsBlocked(false);
    setTyping(false);
  }, [selectedUser?._id]);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // ==========================================
  // SCROLL TO BOTTOM
  // ==========================================

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }, 50);
  };

  // ==========================================
  // FETCH LATEST SELECTED USER DATA
  // ==========================================

  useEffect(() => {
    if (!selectedUser?._id) {
      return;
    }

    const fetchSelectedUser = async () => {
      try {
        const response = await api.get("/users");

        if (response.data?.success) {
          const users = response.data.users || [];

          const latestUser = users.find(
            (item) => item._id?.toString() === selectedUser._id?.toString()
          );

          if (latestUser) {
            setSelectedUser((prevUser) => ({
              ...prevUser,
              ...latestUser,
            }));
          }
        }
      } catch (error) {
        console.error(
          "Fetch selected user error:",
          error.response?.data?.message || error.message
        );
      }
    };

    fetchSelectedUser();
  }, [selectedUser?._id]);

  // ==========================================
  // FETCH CHAT HISTORY
  // ==========================================

  useEffect(() => {
    if (!selectedUser?._id) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        const response = await api.get(`/messages/${selectedUser._id}`);

        if (response.data?.success) {
          setMessages(response.data.messages || []);

          scrollToBottom();
        }
      } catch (error) {
        console.error(
          "Fetch messages error:",
          error.response?.data?.message || error.message
        );
      }
    };

    fetchMessages();
  }, [selectedUser?._id]);

  // ==========================================
  // MARK OFFLINE MESSAGES AS DELIVERED
  // ==========================================

  useEffect(() => {
    if (!selectedUser?._id || !socket) {
      return;
    }

    const markDelivered = () => {
      socket.emit("mark_messages_delivered", {
        senderId: selectedUser._id,
      });
    };

    if (socket.connected) {
      markDelivered();
    }

    socket.on("connect", markDelivered);

    return () => {
      socket.off("connect", markDelivered);
    };
  }, [selectedUser?._id]);

  // ==========================================
  // RECEIVE MESSAGE
  // ==========================================

  useEffect(() => {
    if (!socket || !user) {
      return;
    }

    const handleReceiveMessage = (newMessage) => {
      if (!newMessage?._id) {
        return;
      }

      const senderId = newMessage.sender?._id || newMessage.sender;

      const receiverId = newMessage.receiver?._id || newMessage.receiver;

      const currentUserId = user._id?.toString();

      const selectedUserId = selectedUser?._id?.toString();

      const senderIdString = senderId?.toString();

      const receiverIdString = receiverId?.toString();

      // ==========================================
      // CHECK CURRENT CHAT
      // ==========================================

      const isCurrentChat =
        (senderIdString === selectedUserId &&
          receiverIdString === currentUserId) ||
        (senderIdString === currentUserId &&
          receiverIdString === selectedUserId);

      if (!isCurrentChat) {
        return;
      }

      // ==========================================
      // ADD / UPDATE MESSAGE
      // ==========================================

      setMessages((prevMessages) => {
        const messageExists = prevMessages.some(
          (message) => message._id?.toString() === newMessage._id?.toString()
        );

        if (messageExists) {
          return prevMessages.map((message) =>
            message._id?.toString() === newMessage._id?.toString()
              ? {
                  ...message,
                  ...newMessage,
                }
              : message
          );
        }

        return [...prevMessages, newMessage];
      });

      scrollToBottom();

      // ==========================================
      // MARK INCOMING MESSAGE AS SEEN
      // ==========================================

      if (receiverIdString === currentUserId) {
        socket.emit("message_seen", {
          messageId: newMessage._id,
        });
      }
    };

    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [user, selectedUser?._id]);

  // ==========================================
  // MESSAGE SENT
  // ==========================================

  useEffect(() => {
    if (!socket || !user) {
      return;
    }

    const handleMessageSent = (sentMessage) => {
      if (!sentMessage?._id) {
        return;
      }

      const receiverId = sentMessage.receiver?._id || sentMessage.receiver;

      const receiverIdString = receiverId?.toString();

      const selectedUserId = selectedUser?._id?.toString();

      if (receiverIdString !== selectedUserId) {
        return;
      }

      setMessages((prevMessages) => {
        const messageExists = prevMessages.some(
          (message) => message._id?.toString() === sentMessage._id?.toString()
        );

        if (messageExists) {
          return prevMessages.map((message) =>
            message._id?.toString() === sentMessage._id?.toString()
              ? {
                  ...message,
                  ...sentMessage,
                }
              : message
          );
        }

        return [...prevMessages, sentMessage];
      });

      scrollToBottom();
    };

    socket.on("message_sent", handleMessageSent);

    return () => {
      socket.off("message_sent", handleMessageSent);
    };
  }, [user, selectedUser?._id]);

  // ==========================================
  // MESSAGE DELIVERED
  // ==========================================

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleMessageDelivered = ({ messageId, deliveredAt }) => {
      if (!messageId) {
        return;
      }

      setMessages((prevMessages) =>
        prevMessages.map((message) =>
          message._id?.toString() === messageId?.toString()
            ? {
                ...message,
                isDelivered: true,
                deliveredAt:
                  deliveredAt ||
                  message.deliveredAt ||
                  new Date().toISOString(),
              }
            : message
        )
      );
    };

    socket.on("message_delivered", handleMessageDelivered);

    return () => {
      socket.off("message_delivered", handleMessageDelivered);
    };
  }, []);

  // ==========================================
  // MESSAGE SEEN
  // ==========================================

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleMessageSeen = ({ messageId, seenAt }) => {
      if (!messageId) {
        return;
      }

      setMessages((prevMessages) =>
        prevMessages.map((message) =>
          message._id?.toString() === messageId?.toString()
            ? {
                ...message,
                isDelivered: true,
                isSeen: true,
                isRead: true,
                seenAt: seenAt || message.seenAt || new Date().toISOString(),
              }
            : message
        )
      );
    };

    socket.on("message_seen", handleMessageSeen);

    return () => {
      socket.off("message_seen", handleMessageSeen);
    };
  }, []);

  // ==========================================
  // MESSAGES READ
  // ==========================================

  useEffect(() => {
    if (!socket || !user) {
      return;
    }

    const handleMessagesRead = ({ userId, readAt }) => {
      if (!userId) {
        return;
      }

      const readUserId = userId?.toString();

      const currentUserId = user._id?.toString();

      setMessages((prevMessages) =>
        prevMessages.map((message) => {
          const senderId = message.sender?._id || message.sender;

          const receiverId = message.receiver?._id || message.receiver;

          const senderIdString = senderId?.toString();

          const receiverIdString = receiverId?.toString();

          const isMyMessage = senderIdString === currentUserId;

          const isForThisUser = receiverIdString === readUserId;

          if (isMyMessage && isForThisUser) {
            return {
              ...message,
              isDelivered: true,
              isSeen: true,
              isRead: true,
              seenAt: message.seenAt || readAt || new Date().toISOString(),
            };
          }

          return message;
        })
      );
    };

    socket.on("messages_read", handleMessagesRead);

    return () => {
      socket.off("messages_read", handleMessagesRead);
    };
  }, [user]);

  // ==========================================
  // MESSAGE DELETED
  // ==========================================

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleMessageDeleted = ({ messageId, deleteFor, deletedAt }) => {
      if (!messageId) {
        return;
      }

      setMessages((prevMessages) => {
        // ========================================
        // DELETE FOR ME
        // ========================================

        if (deleteFor === "me") {
          return prevMessages.filter(
            (message) => message._id?.toString() !== messageId?.toString()
          );
        }

        // ========================================
        // DELETE FOR EVERYONE
        // ========================================

        return prevMessages.map((message) => {
          if (message._id?.toString() !== messageId?.toString()) {
            return message;
          }

          return {
            ...message,
            text: "",
            messageType: "text",
            fileId: null,
            fileName: "",
            fileSize: 0,
            mimeType: "",
            isDeleted: true,
            deletedForEveryone: true,
            deletedAt: deletedAt || new Date().toISOString(),
          };
        });
      });
    };

    socket.on("message_deleted", handleMessageDeleted);

    return () => {
      socket.off("message_deleted", handleMessageDeleted);
    };
  }, []);

  // ==========================================
  // DELETE MESSAGE
  // ==========================================

  const handleDeleteMessage = (messageId, deleteFor) => {
    if (!messageId) {
      return;
    }

    // DELETE FOR ME
    if (deleteFor === "me") {
      setMessages((prevMessages) =>
        prevMessages.filter(
          (message) => message._id?.toString() !== messageId?.toString()
        )
      );

      return;
    }

    // DELETE FOR EVERYONE
    setMessages((prevMessages) =>
      prevMessages.map((message) => {
        if (message._id?.toString() !== messageId?.toString()) {
          return message;
        }

        return {
          ...message,
          text: "",
          messageType: "text",
          fileId: null,
          fileName: "",
          fileSize: 0,
          mimeType: "",
          isDeleted: true,
          deletedForEveryone: true,
          deletedAt: new Date().toISOString(),
        };
      })
    );
  };

  // ==========================================
  // TYPING
  // ==========================================

  const handleTyping = () => {
    if (isBlocked || !selectedUser?._id || !socket) {
      return;
    }

    socket.emit("typing", {
      receiverId: selectedUser._id,
    });

    clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", {
        receiverId: selectedUser._id,
      });
    }, 1000);
  };

  // ==========================================
  // STOP TYPING
  // ==========================================

  const handleStopTyping = () => {
    if (!selectedUser?._id || !socket) {
      return;
    }

    clearTimeout(typingTimeoutRef.current);

    socket.emit("stop_typing", {
      receiverId: selectedUser._id,
    });
  };

  // ==========================================
  // USER TYPING
  // ==========================================

  useEffect(() => {
    if (!socket || !selectedUser) {
      return;
    }

    const handleUserTyping = ({ userId }) => {
      if (userId?.toString() === selectedUser._id?.toString()) {
        setTyping(true);
      }
    };

    const handleUserStopTyping = ({ userId }) => {
      if (userId?.toString() === selectedUser._id?.toString()) {
        setTyping(false);
      }
    };

    socket.on("user_typing", handleUserTyping);

    socket.on("user_stop_typing", handleUserStopTyping);

    return () => {
      socket.off("user_typing", handleUserTyping);

      socket.off("user_stop_typing", handleUserStopTyping);
    };
  }, [selectedUser?._id]);

  // ==========================================
  // SEND MESSAGE
  // ==========================================

  const handleSendMessage = ({
    text = "",
    messageType = "text",
    fileId = null,
    fileName = "",
    fileSize = 0,
    mimeType = "",
  }) => {
    if (isBlocked || !selectedUser?._id || !socket) {
      return;
    }

    if (!text.trim() && !fileId) {
      return;
    }

    socket.emit(
      "send_message",
      {
        receiverId: selectedUser._id,
        text,
        messageType,
        fileId,
        fileName,
        fileSize,
        mimeType,
      },
      (response) => {
        if (!response?.success) {
          console.error("Message failed:", response?.message);
        }
      }
    );
  };

  // ==========================================
  // MOBILE BACK
  // ==========================================

  const handleBack = () => {
    handleStopTyping();

    setSelectedUser(null);
    setMessages([]);
    setTyping(false);
  };

  // ==========================================
  // CHECK SELECTED USER ONLINE STATUS
  // ==========================================

  const isSelectedUserOnline = selectedUser?._id
    ? onlineUsers?.some((id) => id?.toString() === selectedUser._id?.toString())
    : false;

  // ==========================================
  // CLEANUP TYPING ON UNMOUNT
  // ==========================================

  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // ===============================================
  // ====MESSAGE ERROR===================
  // ===============================================
  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleMessageError = (error) => {
      if (error?.blocked) {
        setIsBlocked(true);
      }

      console.error("Message error:", error?.message);
    };

    socket.on("message_error", handleMessageError);

    return () => {
      socket.off("message_error", handleMessageError);
    };
  }, []);

  // ==========================================
  // MAIN LAYOUT
  // ==========================================

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#080b18] text-white">
      {/* ======================================
          SIDEBAR
      ====================================== */}

      <motion.aside
        initial={false}
        animate={{
          width: selectedUser ? undefined : undefined,
        }}
        className={`${
          selectedUser ? "hidden md:flex" : "flex"
        } h-full w-full shrink-0 md:w-[340px]`}
      >
        <Sidebar
          user={user}
          selectedUser={selectedUser}
          setSelectedUser={setSelectedUser}
        />
      </motion.aside>

      {/* ======================================
          CHAT AREA
      ====================================== */}

      <main
        className={`${
          selectedUser ? "flex" : "hidden md:flex"
        } min-w-0 flex-1 flex-col overflow-hidden bg-[#080b18]`}
      >
        <AnimatePresence mode="wait">
          {!selectedUser ? (
            /* ==================================
               EMPTY CHAT
            ================================== */

            <motion.div
              key="empty-chat"
              initial={{
                opacity: 0,
                scale: 0.98,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              exit={{
                opacity: 0,
              }}
              className="flex h-full flex-1 items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(124,58,237,0.08),_transparent_45%)] px-6"
            >
              <div className="flex max-w-md flex-col items-center text-center">
                {/* Logo/Icon */}
                <motion.div
                  initial={{
                    opacity: 0,
                    y: 15,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: 0.1,
                  }}
                  className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 shadow-2xl shadow-violet-950/20"
                >
                  <span className="text-4xl">💬</span>
                </motion.div>

                <motion.h2
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: 0.15,
                  }}
                  className="text-2xl font-bold tracking-tight text-white"
                >
                  Welcome to NexChat
                </motion.h2>

                <motion.p
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: 0.2,
                  }}
                  className="mt-2 max-w-sm text-sm leading-6 text-slate-500"
                >
                  Select a conversation from your chats and start messaging.
                </motion.p>
              </div>
            </motion.div>
          ) : (
            /* ==================================
               ACTIVE CHAT
            ================================== */

            <motion.div
              key={selectedUser._id}
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              {/* CHAT HEADER */}

              <div className="shrink-0">
                <ChatHeader
                  user={selectedUser}
                  online={isSelectedUserOnline}
                  onBack={handleBack}
                  onBlockStatusChange={setIsBlocked}
                />
              </div>

              {/* MESSAGES */}

              <div className="min-h-0 flex-1 overflow-hidden">
                <MessageList
                  messages={messages}
                  currentUser={user}
                  onDelete={handleDeleteMessage}
                />

                <div ref={messagesEndRef} />
              </div>

              {/* TYPING INDICATOR */}

              <AnimatePresence>
                {typing && <TypingIndicator user={selectedUser.name} />}
              </AnimatePresence>

              {/* INPUT */}

              <div className="shrink-0">
                <ChatInput
                  onSend={handleSendMessage}
                  onTyping={handleTyping}
                  onStopTyping={handleStopTyping}
                  isBlocked={isBlocked}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Chat;
