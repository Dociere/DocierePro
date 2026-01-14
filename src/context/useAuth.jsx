import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
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
        // else {
        //   // Only navigate if we're not already on the login page
        //   if (window.location.pathname !== "/login") {
        //     navigate("/login");
        //   }
        // }
      } catch (error) {
        console.error("Error fetching data:", error);
        if (error.response) {
          setMessage(
            error.response.data.message || "You are not authenticated."
          );
          // Only navigate if we're not already on the login page
          //   if (
          //     error.response.status === 401 &&
          //     window.location.pathname !== "/login"
          //   ) {
          //     // navigate("/login");
          //     navigate("/signup");
          //   }
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
    <AuthContext.Provider value={{ user, isAuthenticated, loading, message }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
