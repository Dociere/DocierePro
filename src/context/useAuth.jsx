import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { checkServerConnection } from "../api/projectHandling";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isServerConnected, setIsServerConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const serverRes = await checkServerConnection();
      setIsServerConnected(serverRes);
      console.log("serverRes", serverRes);
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_admin_server}/api/check-auth`,
          {
            withCredentials: true,
          }
        );

        if (response.data.authenticated) {
          setIsAuthenticated(true);
          setUser(response.data.user);
          console.log("setUser", user);
          console.log("setUser res", response);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        if (error.response) {
          setMessage(
            error.response.data.message || "You are not authenticated."
          );
        } else {
          setMessage("Failed to load message due to network issue.");
        }

        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider
      value={{ user, isServerConnected, isAuthenticated, loading, message }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
