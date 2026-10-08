import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import FindByNexChatId from "./FindByNexChatId";
import ScanQr from "./ScanQr";
import QrUserPreview from "./QrUserPreview";

import {
  FiMoreVertical,
  FiLogOut,
  FiUser,
  FiUserPlus,
  FiCheck,
  FiX,
  FiMessageCircle,
  FiSearch,
  FiPlus,
  FiBell,
  FiClock,
  FiSend,
  FiCamera,
} from "react-icons/fi";

import { motion, AnimatePresence } from "framer-motion";

import api from "../services/api";

import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

import UserAvatar from "./UserAvatar";

const Sidebar = ({ user, selectedUser, setSelectedUser }) => {
  const { logout } = useAuth();
  const { socket, onlineUsers } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [connections, setConnections] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);

  const [search, setSearch] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  const [connectionLoading, setConnectionLoading] = useState({});
  const [connectionNotification, setConnectionNotification] = useState(null);

  const [activeTab, setActiveTab] = useState("chats");

  // NexChat ID search modal
  const [showNexChatSearch, setShowNexChatSearch] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrUserLoading, setQrUserLoading] = useState(false);
  const [qrFoundUser, setQrFoundUser] = useState(null);
  const navigate = useNavigate();

  // ==========================================
  // PROFILE
  // ==========================================

  const handleProfile = () => {
    setShowMenu(false);
    navigate("/profile");
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = async () => {
    try {
      setShowMenu(false);

      // Disconnect socket first
      if (socket) {
        socket.disconnect();
      }

      // Invalidate session on server
      try {
        await api.post("/auth/logout");
      } catch (error) {
        console.error(
          "Server logout error:",
          error.response?.data?.message || error.message
        );
      }

      // Clear frontend auth data
      logout();

      // Clear selected chat
      setSelectedUser(null);

      // Redirect
      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error("Logout error:", error);

      logout();
      setSelectedUser(null);

      navigate("/login", {
        replace: true,
      });
    }
  };

  // ==========================================
  // FETCH CONVERSATIONS
  // ==========================================

  const fetchConversations = async () => {
    try {
      const response = await api.get("/messages/conversations");

      if (response.data?.success) {
        setConversations(response.data.conversations || []);
      }
    } catch (error) {
      console.error(
        "Fetch conversations error:",
        error.response?.data?.message || error.message
      );
    }
  };

  // ==========================================
  // FETCH ALL USERS
  // ==========================================

  const fetchUsers = async () => {
    try {
      const response = await api.get("/users");

      if (response.data?.success) {
        const users = response.data.users || [];

        setAllUsers(users);

        // Update users inside conversations
        setConversations((prevConversations) =>
          prevConversations.map((conversation) => {
            const conversationUser = conversation.user;

            const latestUser = users.find(
              (currentUser) =>
                currentUser._id?.toString() ===
                conversationUser?._id?.toString()
            );

            if (!latestUser) {
              return conversation;
            }

            return {
              ...conversation,
              user: {
                ...conversationUser,
                ...latestUser,
              },
            };
          })
        );

        // Update requester information
        setIncomingRequests((prevRequests) =>
          prevRequests.map((request) => {
            if (!request.requester?._id) {
              return request;
            }

            const latestRequester = users.find(
              (currentUser) =>
                currentUser._id?.toString() ===
                request.requester?._id?.toString()
            );

            if (!latestRequester) {
              return request;
            }

            return {
              ...request,
              requester: {
                ...request.requester,
                ...latestRequester,
              },
            };
          })
        );
      }
    } catch (error) {
      console.error(
        "Fetch users error:",
        error.response?.data?.message || error.message
      );
    }
  };

  // ==========================================
  // FETCH CONNECTION DATA
  // ==========================================

  const fetchConnectionData = async () => {
    try {
      const [connectionsResponse, requestsResponse, sentResponse] =
        await Promise.all([
          api.get("/connections"),
          api.get("/connections/requests"),
          api.get("/connections/sent"),
        ]);

      if (connectionsResponse.data?.success) {
        setConnections(connectionsResponse.data.connections || []);
      }

      if (requestsResponse.data?.success) {
        setIncomingRequests(requestsResponse.data.requests || []);
      }

      if (sentResponse.data?.success) {
        setSentRequests(sentResponse.data.requests || []);
      }
    } catch (error) {
      console.error(
        "Fetch connection data error:",
        error.response?.data?.message || error.message
      );
    }
  };

  // ==========================================
  // INITIAL DATA
  // ==========================================

  useEffect(() => {
    if (!user?._id) {
      return;
    }

    fetchConversations();
    fetchUsers();
    fetchConnectionData();
  }, [user?._id]);

  // ==========================================
  // REAL-TIME CONNECTION REQUEST
  // ==========================================

  useEffect(() => {
    if (!socket || !user) return;

    const handleConnectionRequestReceived = (data) => {
      const connection = data?.connection;

      if (!connection) {
        return;
      }

      const requester = connection.requester;

      if (!requester?._id) {
        return;
      }

      setConnectionNotification({
        id: connection._id,
        name: requester?.name || "Someone",
      });

      setIncomingRequests((prevRequests) => {
        const alreadyExists = prevRequests.some(
          (request) => request._id?.toString() === connection._id?.toString()
        );

        if (alreadyExists) {
          return prevRequests;
        }

        return [connection, ...prevRequests];
      });

      setAllUsers((prevUsers) => {
        const requesterExists = prevUsers.some(
          (existingUser) =>
            existingUser._id?.toString() === requester._id?.toString()
        );

        if (requesterExists) {
          return prevUsers.map((existingUser) =>
            existingUser._id?.toString() === requester._id?.toString()
              ? {
                  ...existingUser,
                  ...requester,
                }
              : existingUser
          );
        }

        return [requester, ...prevUsers];
      });

      setActiveTab("people");
    };

    socket.on("connection_request_received", handleConnectionRequestReceived);

    return () => {
      socket.off(
        "connection_request_received",
        handleConnectionRequestReceived
      );
    };
  }, [socket, user]);

  // ==========================================
  // CONNECTION NOTIFICATION AUTO HIDE
  // ==========================================

  useEffect(() => {
    if (!connectionNotification) {
      return;
    }

    const timer = setTimeout(() => {
      setConnectionNotification(null);
    }, 4000);

    return () => clearTimeout(timer);
  }, [connectionNotification]);

  // ==========================================
  // REAL-TIME CONNECTION ACCEPTED
  // ==========================================

  useEffect(() => {
    if (!socket || !user) return;

    const handleConnectionAccepted = (data) => {
      const connection = data?.connection;

      if (!connection) return;

      const currentUserId = user._id?.toString();

      const otherUser =
        connection.requester?._id?.toString() === currentUserId
          ? connection.receiver
          : connection.requester;

      setSentRequests((prevRequests) =>
        prevRequests.filter(
          (request) => request._id?.toString() !== connection._id?.toString()
        )
      );

      setIncomingRequests((prevRequests) =>
        prevRequests.filter(
          (request) => request._id?.toString() !== connection._id?.toString()
        )
      );

      if (otherUser?._id) {
        setAllUsers((prevUsers) => {
          const exists = prevUsers.some(
            (existingUser) =>
              existingUser._id?.toString() === otherUser._id?.toString()
          );

          if (exists) {
            return prevUsers.map((existingUser) =>
              existingUser._id?.toString() === otherUser._id?.toString()
                ? {
                    ...existingUser,
                    ...otherUser,
                  }
                : existingUser
            );
          }

          return [otherUser, ...prevUsers];
        });

        setConnections((prevConnections) => {
          const exists = prevConnections.some(
            (item) => item.user?._id?.toString() === otherUser._id?.toString()
          );

          if (exists) {
            return prevConnections.map((item) =>
              item.user?._id?.toString() === otherUser._id?.toString()
                ? {
                    ...item,
                    connectionId: connection._id,
                    connectedAt: connection.updatedAt || connection.createdAt,
                    user: {
                      ...item.user,
                      ...otherUser,
                    },
                  }
                : item
            );
          }

          return [
            {
              connectionId: connection._id,
              connectedAt: connection.updatedAt || connection.createdAt,
              user: otherUser,
            },
            ...prevConnections,
          ];
        });
      }

      fetchConnectionData();
    };

    socket.on("connection_request_accepted", handleConnectionAccepted);

    return () => {
      socket.off("connection_request_accepted", handleConnectionAccepted);
    };
  }, [socket, user]);

  // ==========================================
  // REAL-TIME CONNECTION REJECTED
  // ==========================================

  useEffect(() => {
    if (!socket || !user) return;

    const handleConnectionRejected = (data) => {
      const connection = data?.connection;

      if (!connection) return;

      setSentRequests((prevRequests) =>
        prevRequests.filter(
          (request) => request._id?.toString() !== connection._id?.toString()
        )
      );

      setIncomingRequests((prevRequests) =>
        prevRequests.filter(
          (request) => request._id?.toString() !== connection._id?.toString()
        )
      );

      fetchConnectionData();
    };

    socket.on("connection_request_rejected", handleConnectionRejected);

    return () => {
      socket.off("connection_request_rejected", handleConnectionRejected);
    };
  }, [socket, user]);

  // ==========================================
  // RECEIVE NEW MESSAGE
  // ==========================================

  useEffect(() => {
    if (!socket || !user) return;

    const handleReceiveMessage = (newMessage) => {
      const senderId = newMessage.sender?._id || newMessage.sender;

      const receiverId = newMessage.receiver?._id || newMessage.receiver;

      const currentUserId = user._id?.toString();

      const otherUserId =
        senderId?.toString() === currentUserId
          ? receiverId?.toString()
          : senderId?.toString();

      if (!otherUserId) return;

      setConversations((prev) => {
        const existingIndex = prev.findIndex(
          (conversation) => conversation.user?._id?.toString() === otherUserId
        );

        if (existingIndex === -1) {
          fetchConversations();
          return prev;
        }

        const updated = [...prev];

        const conversation = updated[existingIndex];

        const isSelected = selectedUser?._id?.toString() === otherUserId;

        updated[existingIndex] = {
          ...conversation,

          lastMessage: {
            ...newMessage,
          },

          unreadCount: isSelected ? 0 : (conversation.unreadCount || 0) + 1,
        };

        const [movedConversation] = updated.splice(existingIndex, 1);

        updated.unshift(movedConversation);

        return updated;
      });

      fetchUsers();
    };

    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [socket, user, selectedUser]);

  // ==========================================
  // MESSAGE SENT
  // ==========================================

  useEffect(() => {
    if (!socket || !user) return;

    const handleMessageSent = (sentMessage) => {
      const receiverId = sentMessage.receiver?._id || sentMessage.receiver;

      if (!receiverId) return;

      setConversations((prev) => {
        const index = prev.findIndex(
          (conversation) =>
            conversation.user?._id?.toString() === receiverId?.toString()
        );

        if (index === -1) {
          fetchConversations();
          return prev;
        }

        const updated = [...prev];

        updated[index] = {
          ...updated[index],

          lastMessage: {
            ...sentMessage,
          },
        };

        const [conversation] = updated.splice(index, 1);

        updated.unshift(conversation);

        return updated;
      });

      fetchUsers();
    };

    socket.on("message_sent", handleMessageSent);

    return () => {
      socket.off("message_sent", handleMessageSent);
    };
  }, [socket, user]);

  // ==========================================
  // MESSAGE READ
  // ==========================================

  useEffect(() => {
    if (!socket || !user) return;

    const handleMessagesRead = ({ userId }) => {
      if (!userId) return;

      setConversations((prev) =>
        prev.map((conversation) => {
          const conversationUserId = conversation.user?._id;

          if (conversationUserId?.toString() === userId?.toString()) {
            return {
              ...conversation,
              unreadCount: 0,
            };
          }

          return conversation;
        })
      );
    };

    socket.on("messages_read", handleMessagesRead);

    return () => {
      socket.off("messages_read", handleMessagesRead);
    };
  }, [socket, user]);

  // ==========================================
  // MESSAGE DELETED
  // ==========================================

  useEffect(() => {
    if (!socket || !user) return;

    const handleMessageDeleted = ({ messageId, deleteFor }) => {
      if (!messageId) return;

      if (deleteFor === "me") {
        fetchConversations();
        return;
      }

      setConversations((prev) =>
        prev.map((conversation) => {
          const lastMessage = conversation.lastMessage;

          if (lastMessage?._id?.toString() !== messageId?.toString()) {
            return conversation;
          }

          return {
            ...conversation,

            lastMessage: {
              ...lastMessage,
              text: "",
              messageType: "text",
              fileId: null,
              fileName: "",
              fileSize: 0,
              mimeType: "",
              isDeleted: true,
              deletedForEveryone: true,
            },
          };
        })
      );
    };

    socket.on("message_deleted", handleMessageDeleted);

    return () => {
      socket.off("message_deleted", handleMessageDeleted);
    };
  }, [socket, user]);

  // ==========================================
  // CONNECTION STATUS
  // ==========================================

  const getConnectionStatus = (userId) => {
    if (!userId) {
      return "none";
    }

    const id = userId.toString();

    const connected = connections.some(
      (connection) => connection.user?._id?.toString() === id
    );

    if (connected) {
      return "accepted";
    }

    const incoming = incomingRequests.some(
      (request) => request.requester?._id?.toString() === id
    );

    if (incoming) {
      return "incoming";
    }

    const sent = sentRequests.some(
      (request) => request.receiver?._id?.toString() === id
    );

    if (sent) {
      return "sent";
    }

    return "none";
  };

  // ==========================================
  // SEND CONNECTION REQUEST
  // ==========================================

  const handleSendRequest = async (userId) => {
    if (!userId) return;

    try {
      setConnectionLoading((prev) => ({
        ...prev,
        [userId]: true,
      }));

      const response = await api.post(`/connections/request/${userId}`);

      if (response.data?.success) {
        await fetchConnectionData();
      }
    } catch (error) {
      console.error(
        "Send connection request error:",
        error.response?.data?.message || error.message
      );

      alert(
        error.response?.data?.message || "Failed to send connection request"
      );
    } finally {
      setConnectionLoading((prev) => ({
        ...prev,
        [userId]: false,
      }));
    }
  };

  // ==========================================
  // ACCEPT CONNECTION REQUEST
  // ==========================================

  const handleAcceptRequest = async (connectionId) => {
    if (!connectionId) return;

    try {
      setConnectionLoading((prev) => ({
        ...prev,
        [connectionId]: true,
      }));

      const response = await api.patch(`/connections/${connectionId}/accept`);

      if (response.data?.success) {
        await fetchConnectionData();
      }
    } catch (error) {
      console.error(
        "Accept connection request error:",
        error.response?.data?.message || error.message
      );

      alert(
        error.response?.data?.message || "Failed to accept connection request"
      );
    } finally {
      setConnectionLoading((prev) => ({
        ...prev,
        [connectionId]: false,
      }));
    }
  };

  // ==========================================
  // REJECT CONNECTION REQUEST
  // ==========================================

  const handleRejectRequest = async (connectionId) => {
    if (!connectionId) return;

    try {
      setConnectionLoading((prev) => ({
        ...prev,
        [connectionId]: true,
      }));

      const response = await api.patch(`/connections/${connectionId}/reject`);

      if (response.data?.success) {
        await fetchConnectionData();
      }
    } catch (error) {
      console.error(
        "Reject connection request error:",
        error.response?.data?.message || error.message
      );

      alert(
        error.response?.data?.message || "Failed to reject connection request"
      );
    } finally {
      setConnectionLoading((prev) => ({
        ...prev,
        [connectionId]: false,
      }));
    }
  };

  // ==========================================
  // SELECT EXISTING CONVERSATION
  // ==========================================

  const handleSelectConversation = (conversation) => {
    setSelectedUser(conversation.user);

    setConversations((prev) =>
      prev.map((item) =>
        item.conversationId === conversation.conversationId
          ? {
              ...item,
              unreadCount: 0,
            }
          : item
      )
    );
  };

  // ==========================================
  // SELECT CONNECTED USER
  // ==========================================

  const handleSelectConnectedUser = (selectedUserData) => {
    const status = getConnectionStatus(selectedUserData?._id);

    if (status !== "accepted") {
      return;
    }

    setSelectedUser(selectedUserData);
    setActiveTab("chats");
  };

  // ==========================================
  // SELECT USER FROM NEXCHAT ID
  // ==========================================

  const handleNexChatUserSelected = (selectedUserData) => {
    if (!selectedUserData?._id) {
      return;
    }

    // Open selected user directly in Chat
    setSelectedUser(selectedUserData);

    // Close modal
    setShowNexChatSearch(false);

    // Switch back to Chats tab
    setActiveTab("chats");
  };

  // ==========================================
  // QR CODE USER FOUND
  // ==========================================

  const handleQrUserFound = useCallback(async (nexChatId) => {
    if (!nexChatId) {
      return;
    }

    console.log("QR NexChat ID:", nexChatId);

    try {
      setQrUserLoading(true);

      const response = await api.get(
        `/users/nexchat/${encodeURIComponent(nexChatId)}`
      );

      console.log("QR USER RESPONSE:", response.data);

      if (response.data?.success && response.data?.user) {
        const foundUser = response.data.user;

        console.log("QR USER FOUND:", foundUser);

        // Close QR scanner
        setShowQrScanner(false);

        // Show user preview instead of directly opening chat
        setQrFoundUser(foundUser);
      }
    } catch (error) {
      console.error(
        "QR user search error:",
        error.response?.data?.message || error.message
      );

      alert(
        error.response?.data?.message || "Unable to find this NexChat user."
      );
    } finally {
      setQrUserLoading(false);
    }
  }, []);
  // ==========================================
  // LAST MESSAGE PREVIEW
  // ==========================================

  const getLastMessageText = (lastMessage) => {
    if (!lastMessage) {
      return "No messages yet";
    }

    if (lastMessage.isDeleted || lastMessage.deletedForEveryone) {
      return "This message was deleted";
    }

    if (lastMessage.messageType === "image") {
      return "📷 Image";
    }

    if (lastMessage.messageType === "video") {
      return "🎥 Video";
    }

    if (lastMessage.messageType === "audio") {
      return "🎵 Audio";
    }

    if (lastMessage.messageType === "file") {
      return `📎 ${lastMessage.fileName || "File"}`;
    }

    return lastMessage.text || "Message";
  };

  // ==========================================
  // FORMAT TIME
  // ==========================================

  const formatTime = (date) => {
    if (!date) return "";

    const messageDate = new Date(date);
    const today = new Date();

    const isToday = messageDate.toDateString() === today.toDateString();

    if (isToday) {
      return messageDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return messageDate.toLocaleDateString([], {
      day: "2-digit",
      month: "2-digit",
    });
  };

  // ==========================================
  // USERS WITHOUT CONVERSATION
  // ==========================================

  const conversationUserIds = useMemo(
    () =>
      new Set(
        conversations.map((conversation) => conversation.user?._id?.toString())
      ),
    [conversations]
  );

  const newUsers = useMemo(
    () =>
      allUsers.filter((newUser) => {
        const newUserId = newUser._id?.toString();

        if (newUserId === user?._id?.toString()) {
          return false;
        }

        if (conversationUserIds.has(newUserId)) {
          return false;
        }

        return true;
      }),
    [allUsers, conversationUserIds, user?._id]
  );

  // ==========================================
  // SEARCH
  // ==========================================

  const searchValue = search.toLowerCase().trim();

  const filteredConversations = useMemo(
    () =>
      conversations.filter(
        (conversation) =>
          conversation.user?.name?.toLowerCase().includes(searchValue) ||
          conversation.user?.email?.toLowerCase().includes(searchValue)
      ),
    [conversations, searchValue]
  );

  const filteredNewUsers = useMemo(
    () =>
      newUsers.filter(
        (newUser) =>
          newUser.name?.toLowerCase().includes(searchValue) ||
          newUser.email?.toLowerCase().includes(searchValue)
      ),
    [newUsers, searchValue]
  );

  // ==========================================
  // UNREAD COUNT
  // ==========================================

  const totalUnread = conversations.reduce(
    (total, conversation) => total + (conversation.unreadCount || 0),
    0
  );

  // ==========================================
  // ONLINE CHECK
  // ==========================================

  const isUserOnline = (userId) => {
    return onlineUsers?.some((id) => id?.toString() === userId?.toString());
  };

  // ==========================================
  // USER AVATAR
  // ==========================================

  const renderUserAvatar = (userData, size = "md") => {
    const isOnline = isUserOnline(userData?._id);

    return (
      <UserAvatar user={userData} size={size} showOnline online={isOnline} />
    );
  };

  // ==========================================
  // CONNECTION ACTION UI
  // ==========================================

  const renderConnectionAction = (userData) => {
    const userId = userData?._id;

    const status = getConnectionStatus(userId);

    // CONNECTED
    if (status === "accepted") {
      return (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleSelectConnectedUser(userData);
          }}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-violet-500/20 transition"
        >
          <FiMessageCircle size={14} />
          <span>Message</span>
        </motion.button>
      );
    }

    // REQUEST SENT
    if (status === "sent") {
      return (
        <span className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-slate-400">
          <FiClock size={13} />
          <span>Pending</span>
        </span>
      );
    }

    // INCOMING REQUEST
    if (status === "incoming") {
      const request = incomingRequests.find(
        (item) => item.requester?._id?.toString() === userId?.toString()
      );

      const requestId = request?._id;

      const isLoading = connectionLoading[requestId];

      return (
        <div
          className="flex items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            disabled={isLoading}
            onClick={() => handleAcceptRequest(requestId)}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white transition hover:bg-emerald-400 disabled:opacity-50"
            title="Accept"
          >
            <FiCheck size={15} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            disabled={isLoading}
            onClick={() => handleRejectRequest(requestId)}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/90 text-white transition hover:bg-red-400 disabled:opacity-50"
            title="Reject"
          >
            <FiX size={15} />
          </motion.button>
        </div>
      );
    }

    // NO CONNECTION
    const isLoading = connectionLoading[userId];

    return (
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        type="button"
        disabled={isLoading}
        onClick={(e) => {
          e.stopPropagation();
          handleSendRequest(userId);
        }}
        className="flex items-center gap-1.5 rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/20 disabled:opacity-50"
      >
        <FiUserPlus size={14} />

        <span>{isLoading ? "Sending..." : "Connect"}</span>
      </motion.button>
    );
  };

  // ==========================================
  // INCOMING REQUEST COUNT
  // ==========================================

  const incomingRequestCount = incomingRequests.length;

  // ==========================================
  // UI
  // ==========================================

  return (
    <>
      <aside className="relative flex h-full w-full flex-col overflow-hidden border-r border-white/[0.07] bg-[#080b18] text-white md:w-[340px]">
        {/* ======================================
            BACKGROUND GLOW
        ====================================== */}

        <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-violet-600/15 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />

        {/* ======================================
            CONNECTION NOTIFICATION
        ====================================== */}

        <AnimatePresence>
          {connectionNotification && (
            <motion.div
              initial={{
                opacity: 0,
                y: -20,
                scale: 0.96,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: -20,
                scale: 0.96,
              }}
              className="absolute left-3 right-3 top-3 z-[100]"
            >
              <div className="flex items-start gap-3 rounded-2xl border border-violet-400/20 bg-[#14182b]/95 p-3 shadow-2xl shadow-black/30 backdrop-blur-xl">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
                  <FiUserPlus size={19} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">
                    New connection request
                  </p>

                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {connectionNotification.name} sent you a request
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setConnectionNotification(null)}
                  className="text-slate-500 transition hover:text-white"
                >
                  <FiX size={17} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ======================================
            HEADER
        ====================================== */}

        <div className="relative px-5 pb-4 pt-5">
          <div className="flex items-center justify-between">
            {/* LOGO */}

            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/25">
                  <FiMessageCircle size={20} strokeWidth={2.5} />
                </div>

                <div>
                  <h1 className="text-xl font-bold tracking-tight">
                    Nex
                    <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                      Chat
                    </span>
                  </h1>

                  <p className="text-[10px] text-slate-500">
                    Modern. Secure. Real-time.
                  </p>
                </div>
              </div>
            </div>

            {/* MENU */}

            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => setShowMenu((prev) => !prev)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-400 transition hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-white"
              >
                <FiMoreVertical size={18} />
              </motion.button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: -5,
                      scale: 0.96,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      y: -5,
                      scale: 0.96,
                    }}
                    className="absolute right-0 top-11 z-50 w-44 overflow-hidden rounded-2xl border border-white/10 bg-[#14182b]/95 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl"
                  >
                    <button
                      type="button"
                      onClick={handleProfile}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                    >
                      <FiUser size={16} />
                      <span>Profile</span>
                    </button>

                    <div className="my-1 h-px bg-white/[0.06]" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                    >
                      <FiLogOut size={16} />
                      <span>Logout</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ======================================
            SEARCH
        ====================================== */}

        <div className="relative px-4 pb-4">
          <div className="group flex items-center gap-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.045] px-3.5 transition focus-within:border-violet-500/40 focus-within:bg-white/[0.065]">
            <FiSearch
              size={17}
              className="shrink-0 text-slate-500 transition group-focus-within:text-violet-400"
            />

            <input
              type="text"
              placeholder="Search people or chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-slate-500 transition hover:text-white"
              >
                <FiX size={15} />
              </button>
            )}
          </div>
        </div>

        {/* ======================================
            TABS
        ====================================== */}

        <div className="px-4 pb-3">
          <div className="flex rounded-xl border border-white/[0.06] bg-white/[0.025] p-1">
            <button
              type="button"
              onClick={() => setActiveTab("chats")}
              className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition ${
                activeTab === "chats"
                  ? "bg-white/[0.08] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <FiMessageCircle size={14} />

              <span>Chats</span>

              {totalUnread > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-1 text-[9px] font-bold text-white">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("people")}
              className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition ${
                activeTab === "people"
                  ? "bg-white/[0.08] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <FiUserPlus size={14} />

              <span>People</span>

              {incomingRequestCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {incomingRequestCount > 99 ? "99+" : incomingRequestCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ======================================
            CONTENT
        ====================================== */}

        <div className="relative flex-1 overflow-y-auto px-2 pb-3">
          {/* ====================================
              CHATS TAB
          ==================================== */}

          {activeTab === "chats" && (
            <>
              {/* CONNECTION REQUESTS */}

              {incomingRequests.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FiBell size={13} className="text-violet-400" />

                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Requests
                      </span>
                    </div>

                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[9px] font-semibold text-red-400">
                      {incomingRequestCount}
                    </span>
                  </div>

                  {incomingRequests.map((request) => {
                    const requester = request.requester;

                    if (!requester?._id) {
                      return null;
                    }

                    const requestId = request._id;

                    const isLoading = connectionLoading[requestId];

                    return (
                      <motion.div
                        initial={{
                          opacity: 0,
                          x: -8,
                        }}
                        animate={{
                          opacity: 1,
                          x: 0,
                        }}
                        key={requestId}
                        className="mx-1 mb-1 flex items-center gap-3 rounded-2xl border border-violet-500/10 bg-violet-500/[0.04] p-3"
                      >
                        {renderUserAvatar(requester)}

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-200">
                            {requester.name}
                          </p>

                          <p className="mt-0.5 text-[10px] text-slate-500">
                            Wants to connect
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleAcceptRequest(requestId)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white transition hover:bg-emerald-400 disabled:opacity-50"
                            title="Accept"
                          >
                            <FiCheck size={15} />
                          </button>

                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleRejectRequest(requestId)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/90 text-white transition hover:bg-red-400 disabled:opacity-50"
                            title="Reject"
                          >
                            <FiX size={15} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* CHAT TITLE */}

              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                  Recent chats
                </span>

                <div className="flex items-center gap-1">
                  {/* FIND BY NEXCHAT ID */}

                  <button
                    type="button"
                    onClick={() => setShowNexChatSearch(true)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-violet-500/10 hover:text-violet-400"
                    title="Find by NexChat ID"
                  >
                    <FiPlus size={15} />
                  </button>

                  {/* SCAN QR CODE */}

                  <button
                    type="button"
                    onClick={() => setShowQrScanner(true)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-violet-500/10 hover:text-violet-400"
                    title="Scan QR Code"
                  >
                    <FiCamera size={15} />
                  </button>
                </div>
              </div>

              {/* CONVERSATIONS */}

              {filteredConversations.length > 0 ? (
                <div className="space-y-1">
                  <AnimatePresence initial={false}>
                    {filteredConversations.map((conversation) => {
                      const conversationUser = conversation.user;

                      const isSelected =
                        selectedUser?._id?.toString() ===
                        conversationUser?._id?.toString();

                      const isOnline = isUserOnline(conversationUser?._id);

                      const unreadCount = conversation.unreadCount || 0;

                      return (
                        <motion.button
                          layout
                          initial={{
                            opacity: 0,
                            y: 6,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                          }}
                          transition={{
                            duration: 0.16,
                          }}
                          key={conversation.conversationId}
                          type="button"
                          onClick={() => handleSelectConversation(conversation)}
                          className={`group relative flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                            isSelected
                              ? "bg-gradient-to-r from-violet-500/[0.15] to-fuchsia-500/[0.07]"
                              : "hover:bg-white/[0.045]"
                          }`}
                        >
                          {isSelected && (
                            <motion.span
                              layoutId="activeChat"
                              className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-gradient-to-b from-violet-400 to-fuchsia-400"
                            />
                          )}

                          <div className="relative shrink-0">
                            {renderUserAvatar(conversationUser)}

                            {isOnline && (
                              <span className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#080b18] bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.65)]" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <h3
                                className={`truncate text-sm ${
                                  unreadCount > 0
                                    ? "font-semibold text-white"
                                    : "font-medium text-slate-200"
                                }`}
                              >
                                {conversationUser?.name}
                              </h3>

                              <span
                                className={`shrink-0 text-[9px] ${
                                  unreadCount > 0
                                    ? "font-medium text-violet-300"
                                    : "text-slate-600"
                                }`}
                              >
                                {formatTime(conversation.updatedAt)}
                              </span>
                            </div>

                            <div className="mt-1 flex items-center gap-2">
                              <p
                                className={`min-w-0 flex-1 truncate text-xs ${
                                  unreadCount > 0
                                    ? "font-medium text-slate-300"
                                    : "text-slate-500"
                                }`}
                              >
                                {getLastMessageText(conversation.lastMessage)}
                              </p>

                              {unreadCount > 0 && (
                                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-1.5 text-[9px] font-bold text-white shadow-lg shadow-violet-500/20">
                                  {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.035]">
                    <FiMessageCircle size={26} className="text-violet-400" />
                  </div>

                  <p className="text-sm font-medium text-slate-300">
                    {search ? "No conversations found" : "No conversations yet"}
                  </p>

                  <p className="mt-1 max-w-[220px] text-xs leading-5 text-slate-600">
                    {search
                      ? "Try searching for another person."
                      : "Start a conversation with someone from People."}
                  </p>

                  {!search && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("people")}
                      className="mt-4 rounded-xl bg-violet-500/10 px-4 py-2 text-xs font-medium text-violet-300 transition hover:bg-violet-500/20"
                    >
                      Find people
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* ====================================
              PEOPLE TAB
          ==================================== */}

          {activeTab === "people" && (
            <>
              {incomingRequests.length > 0 && (
                <div className="mb-3">
                  <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    Connection requests
                  </div>

                  <div className="space-y-1">
                    {incomingRequests.map((request) => {
                      const requester = request.requester;

                      if (!requester?._id) {
                        return null;
                      }

                      const requestId = request._id;

                      const isLoading = connectionLoading[requestId];

                      return (
                        <div
                          key={requestId}
                          className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.025] p-3"
                        >
                          {renderUserAvatar(requester)}

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-200">
                              {requester.name}
                            </p>

                            <p className="text-[10px] text-slate-500">
                              Sent you a request
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleAcceptRequest(requestId)}
                              className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-50"
                            >
                              <FiCheck size={15} />
                            </button>

                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleRejectRequest(requestId)}
                              className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500 text-white hover:bg-red-400 disabled:opacity-50"
                            >
                              <FiX size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PEOPLE */}

              {filteredNewUsers.length > 0 ? (
                <>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                      {searchValue ? "Search results" : "People"}
                    </span>

                    <span className="text-[10px] text-slate-600">
                      {filteredNewUsers.length}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {filteredNewUsers.map((newUser) => {
                      const status = getConnectionStatus(newUser?._id);

                      const isSelected =
                        selectedUser?._id?.toString() ===
                        newUser?._id?.toString();

                      return (
                        <motion.div
                          layout
                          key={newUser._id}
                          className={`flex w-full items-center gap-3 rounded-2xl p-3 transition ${
                            isSelected
                              ? "bg-violet-500/10"
                              : "hover:bg-white/[0.04]"
                          }`}
                        >
                          {renderUserAvatar(newUser)}

                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-medium text-slate-200">
                              {newUser.name}
                            </h3>

                            <p className="truncate text-[10px] text-slate-500">
                              {newUser.email}
                            </p>

                            {status === "accepted" && (
                              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-emerald-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                Connected
                              </p>
                            )}

                            {status === "sent" && (
                              <p className="mt-0.5 text-[10px] text-slate-500">
                                Waiting for acceptance
                              </p>
                            )}

                            {status === "incoming" && (
                              <p className="mt-0.5 text-[10px] text-violet-400">
                                Sent you a request
                              </p>
                            )}
                          </div>

                          <div className="shrink-0">
                            {renderConnectionAction(newUser)}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              ) : (
                incomingRequests.length === 0 && (
                  <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.035]">
                      <FiUserPlus size={25} className="text-violet-400" />
                    </div>

                    <p className="text-sm font-medium text-slate-300">
                      {search ? "No people found" : "No new people"}
                    </p>

                    <p className="mt-1 text-xs text-slate-600">
                      Try another search.
                    </p>
                  </div>
                )
              )}
            </>
          )}
        </div>

        {/* ======================================
            CURRENT USER FOOTER
        ====================================== */}

        <div className="relative border-t border-white/[0.06] bg-white/[0.015] p-3">
          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.035] px-3 py-2.5">
            <div className="relative shrink-0">
              {renderUserAvatar(user, "sm")}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-200">
                {user?.name || "User"}
              </p>

              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />

                <p className="text-[10px] text-slate-500">Active now</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/[0.05] hover:text-white"
            >
              <FiMoreVertical size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ==========================================
          FIND BY NEXCHAT ID MODAL
      ========================================== */}

      {showNexChatSearch && (
        <FindByNexChatId
          onSelectUser={handleNexChatUserSelected}
          onClose={() => setShowNexChatSearch(false)}
        />
      )}

      {/* ==========================================
        SCAN QR CODE MODAL
      ========================================== */}

      {showQrScanner && (
        <ScanQr
          onUserFound={handleQrUserFound}
          onClose={() => setShowQrScanner(false)}
        />
      )}

      {/* ==========================================
    QR USER PREVIEW
========================================== */}
      {qrFoundUser && (
        <QrUserPreview
          user={qrFoundUser}
          connectionStatus={getConnectionStatus(qrFoundUser?._id)}
          isLoading={connectionLoading[qrFoundUser?._id]}
          onClose={() => {
            setQrFoundUser(null);
          }}
          onConnect={async () => {
            await handleSendRequest(qrFoundUser?._id);
          }}
          onAccept={async () => {
            const request = incomingRequests.find(
              (item) =>
                item.requester?._id?.toString() === qrFoundUser?._id?.toString()
            );

            if (request?._id) {
              await handleAcceptRequest(request._id);
            }
          }}
          onReject={async () => {
            const request = incomingRequests.find(
              (item) =>
                item.requester?._id?.toString() === qrFoundUser?._id?.toString()
            );

            if (request?._id) {
              await handleRejectRequest(request._id);
            }
          }}
          onMessage={() => {
            setSelectedUser(qrFoundUser);
            setQrFoundUser(null);
            setActiveTab("chats");
          }}
        />
      )}
    </>
  );
};

export default Sidebar;
