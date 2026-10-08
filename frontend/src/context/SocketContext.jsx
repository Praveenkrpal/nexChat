import { createContext, useContext, useEffect, useState } from "react";

import socket from "../services/socket";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();

  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    // ==========================================
    // NO USER = DISCONNECT SOCKET
    // ==========================================

    if (!user) {
      if (socket.connected) {
        socket.disconnect();
      }

      setOnlineUsers([]);
      return;
    }

    // ==========================================
    // GET JWT TOKEN
    // ==========================================

    const token = localStorage.getItem("token");

    if (!token) {
      if (socket.connected) {
        socket.disconnect();
      }

      setOnlineUsers([]);
      return;
    }

    // ==========================================
    // SOCKET AUTHENTICATION
    // ==========================================

    socket.auth = {
      token,
    };

    // ==========================================
    // CONNECT SOCKET
    // ==========================================

    if (!socket.connected) {
      socket.connect();
    }

    // ==========================================
    // ONLINE USERS
    // ==========================================

    const handleOnlineUsers = (users) => {
      setOnlineUsers(Array.isArray(users) ? users : []);
    };

    socket.on("online_users", handleOnlineUsers);

    // ==========================================
    // CLEANUP
    // ==========================================

    return () => {
      socket.off("online_users", handleOnlineUsers);

      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [user]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};
