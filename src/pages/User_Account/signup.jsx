import react, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useOutletContext } from "react-router-dom";
import ConfirmModal from "../../components/confirmModal";
import { api } from "../../api/projectHandling";
import { useSettings } from "../../context/useSettings";

function DynamicSignup() {
  const navigate = useNavigate();
  const { isSectionSpaceOpen } = useOutletContext();
  const [userName, setName] = useState("");
  const [password, setPassword] = useState("");
  const [emailId, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { settings } = useSettings();
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: "",
    message: "",
  });

  const getServerUrl = () => {
    const mode = settings.server?.mode;
    return settings.server?.methods?.[mode]?.backendServer || "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    // Check if server is configured
    if (!getServerUrl().trim()) {
      setError(
        "* Server not configured. Go to Settings → Configuration and set up either Self-Hosting or Cloud-Based hosting.",
      );
      return;
    }

    setLoading(true);

    const userData = {
      emailId,
      userName,
      password,
    };

    try {
      // const res = await axios.post(
      //   `${import.meta.env.VITE_admin_server}/api/signup`,
      //   userData,
      //   {
      //     withCredentials: true,
      //   },
      // );

      const res = await api.post(`/api/signup`, userData);
      console.log("Signup Response:", res);

      // Reset form
      setName("");
      setPassword("");
      setEmail("");

      // Navigate after successful signup
      navigate("/");
    } catch (err) {
      console.error("Signup failed:", err);
      setAlertModal({
        isOpen: true,
        title: "Signup Failed",
        message: "Failed to create user. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    return userName && password && emailId;
  };

  return (
    <div
      className={`h-[calc(100vh-2.75rem)] bg-[#eaeaea] relative overflow-hidden mt-11 flex flex-col transition-all duration-300 ${
        isSectionSpaceOpen ? "ml-96" : "ml-12"
      }`}
    >
      {/* Branding */}
      {/* <div className="absolute top-6 left-6 z-10">
        <div className="text-[#0C2340] font-medium font-playfair text-2xl">
          <p>Docière Pro</p>
        </div>
      </div> */}

      {/* Main content container */}
      <div className="flex flex-col h-full">
        {/* Form container */}
        <div className="flex-1 flex items-center justify-center p-3">
          <div className="relative z-10 w-full max-w-sm">
            <div className="bg-white rounded-xl border-[1px] border-gray-500 overflow-hidden">
              {/* Header */}
              <div className="bg-white px-6 py-6 text-center relative overflow-hidden">
                <button
                  onClick={() => navigate("/")}
                  className="absolute top-4 left-4 text-xs font-medium text-gray-500 hover:text-[#0C2340] transition-colors flex items-center gap-1"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  Home
                </button>
                <h2 className="text-lg font-inter font-semibold text-[#0C2340] mt-4">
                  Create New User
                </h2>
              </div>

              {/* Form */}
              <div className="px-6 py-5">
                {/* Server configuration error */}
                {error && (
                  <div className="mb-4 bg-red-50 border-l-4 border-red-400 rounded-lg p-3">
                    <div className="flex">
                      <svg
                        className="w-4 h-4 text-red-400 mr-2 mt-0.5 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-red-700 text-xs font-medium">
                        {error}
                      </span>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Username field */}
                  <div className="space-y-1">
                    <label
                      htmlFor="username"
                      className="block text-xs font-semibold text-[#0C2340]"
                    >
                      Username
                    </label>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={userName}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={loading}
                      className="w-full pl-3 pr-3 py-3 text-sm border-2 border-gray-200 rounded-lg focus:ring-0 transition-all duration-300 disabled:bg-gray-50 disabled:opacity-70 text-[#0C2340] placeholder-gray-400"
                      placeholder="Enter username"
                    />
                  </div>

                  {/* Password field */}
                  <div className="space-y-1">
                    <label
                      htmlFor="password"
                      className="block text-xs font-semibold text-[#0C2340]"
                    >
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="w-full pl-3 pr-3 py-3 text-sm border-2 border-gray-200 rounded-lg focus:ring-0 transition-all duration-300 disabled:bg-gray-50 disabled:opacity-70 text-[#0C2340] placeholder-gray-400"
                      placeholder="Enter password"
                    />
                  </div>

                  {/* Email field */}
                  <div className="space-y-1">
                    <label
                      htmlFor="email"
                      className="block text-xs font-semibold text-[#0C2340]"
                    >
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={emailId}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="w-full pl-3 pr-3 py-3 text-sm border-2 border-gray-200 rounded-lg focus:ring-0 transition-all duration-300 disabled:bg-gray-50 disabled:opacity-70 text-[#0C2340] placeholder-gray-400"
                      placeholder="Enter email address"
                    />
                  </div>

                  {/* Submit button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={!validateForm() || loading}
                      className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium font-inter rounded-lg text-white bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      {loading ? (
                        <div className="flex items-center">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Creating User...
                        </div>
                      ) : (
                        "Create User"
                      )}
                    </button>
                  </div>
                </form>

                {/* Footer link */}
                <p className="text-sm text-center mt-2 font-inter text-gray-600">
                  Already have an account?{" "}
                  <p
                    onClick={() => navigate("/login")}
                    className="hover:text-[#0C2340] inline-block cursor-pointer"
                  >
                    Login here
                  </p>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        {/* <div className="flex-shrink-0 py-3 text-center text-black/60 text-xs">
          <p>© 2025 Dociere. All rights reserved.</p>
        </div> */}
      </div>
      <ConfirmModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="OK"
        cancelText=""
        onConfirm={() => setAlertModal({ ...alertModal, isOpen: false })}
        onCancel={() => setAlertModal({ ...alertModal, isOpen: false })}
      />
    </div>
  );
}

export default DynamicSignup;
