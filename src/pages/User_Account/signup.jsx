import react, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function DynamicSignup() {
  const navigate = useNavigate();
  const [userName, setName] = useState("");
  const [password, setPassword] = useState("");
  const [emailId, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    const userData = {
      emailId,
      userName,
      password,
    };

    try {
      const res = await axios.post(
        `http://localhost:5025/api/signup`,
        userData,
        {
          withCredentials: true,
        }
      );
      console.log("Signup Response:", res);

      // Reset form
      setName("");
      setPassword("");
      setEmail("");

      // Navigate after successful signup
      navigate("/");
    } catch (err) {
      console.error("Signup failed:", err);
      alert("Failed to create user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    return userName && password && emailId;
  };

  return (
    <div className="h-screen bg-[#f4f4f4] relative overflow-hidden">
      {/* Branding - smaller */}
      <div className="absolute top-6 left-6 z-10">
        <div className="text-[#0C2340] font-playfair text-2xl">
          <p>Dociere</p>
        </div>
      </div>

      {/* Back button */}
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-inter text-[#0C2340] hover:bg-gray-200 rounded-md transition-colors"
        >
          <span>←</span> Back
        </button>
      </div>

      {/* Main content container */}
      <div className="flex flex-col h-full">
        {/* Form container */}
        <div className="flex-1 flex items-center justify-center p-3">
          <div className="relative z-10 w-full max-w-sm">
            <div className="bg-white rounded-xl border-[1px] border-gray-500 overflow-hidden">
              {/* Header */}
              <div className="bg-white px-6 py-6 text-center relative overflow-hidden">
                <h2 className="text-lg font-inter font-semibold text-[#0C2340] mt-4">
                  Create New User
                </h2>
              </div>

              {/* Form */}
              <div className="px-6 py-5">
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
                      className="w-full pl-3 pr-3 py-3 text-sm border-2 border-gray-200 rounded-lg focus:border-[#af0f0f] focus:ring-0 transition-all duration-300 disabled:bg-gray-50 disabled:opacity-70 text-[#0C2340] placeholder-gray-400"
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
                      className="w-full pl-3 pr-3 py-3 text-sm border-2 border-gray-200 rounded-lg focus:border-[#af0f0f] focus:ring-0 transition-all duration-300 disabled:bg-gray-50 disabled:opacity-70 text-[#0C2340] placeholder-gray-400"
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
                      className="w-full pl-3 pr-3 py-3 text-sm border-2 border-gray-200 rounded-lg focus:border-[#af0f0f] focus:ring-0 transition-all duration-300 disabled:bg-gray-50 disabled:opacity-70 text-[#0C2340] placeholder-gray-400"
                      placeholder="Enter email address"
                    />
                  </div>

                  {/* Submit button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={!validateForm() || loading}
                      className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-[#ae4242] to-[#c45252] hover:from-[#c45252] hover:to-[#ae4242] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ae4242] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
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
                  <a className="hover:text-[#0C2340]" href="/login">
                    Login here
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 py-3 text-center text-black/60 text-xs">
          <p>© 2025 Dociere. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

export default DynamicSignup;
