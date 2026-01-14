import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

function Login() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [emailId, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const userData = {
      emailId,
      password,
    };

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_admin_server}/api/login`,
        userData,
        {
          withCredentials: true,
        }
      );
      // const res = await axios.post(
      //   `http://localhost:8080/api/login`,
      //   userData,
      //   {
      //     withCredentials: true,
      //   }
      // );
      console.log("Login successful");
      navigate("/dashboard");
    } catch (err) {
      console.error("Login failed:", err);
      setError(
        err.response?.data?.message ||
          "Login failed. Please check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-[#f4f4f4] relative overflow-hidden">
      {/* Background decoration */}
      {/* <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-[#af0f0f] opacity-10 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-64 h-64 rounded-full bg-[#af0f0f] opacity-5 blur-3xl animate-pulse"></div>
        <div className="absolute top-1/4 left-1/2 w-48 h-48 rounded-full bg-[#af0f0f] opacity-5 blur-3xl animate-pulse"></div>
      </div> */}

      {/* Institution branding - smaller */}
      <div className="absolute top-6 left-6 z-10">
        <div className="text-[#0C2340] font-playfair text-2xl">
          <p>Coram</p>
        </div>
      </div>

      {/* Main content container with proper spacing */}
      <div className="flex flex-col h-full">
        {/* Main content area */}
        <div className="flex-1 flex items-center justify-center p-3">
          {/* Main login card - much more compact */}
          <div className="relative z-10 w-full max-w-sm">
            <div className="bg-white rounded-xl border-[1px] border-gray-500 overflow-hidden">
              {/* Header - more compact */}
              <div className="bg-white px-6 py-6 text-center relative overflow-hidden">
                <div className="absolute inset-0"></div>
                <div className="relative">
                  {/* Logo/Icon - smaller */}
                  <div className="w-14 h-14 border-[#0C2340] border-[1.5px] rounded-full mx-auto mb-3 flex items-center justify-center shadow-lg">
                    <svg
                      className="w-7 h-7 text-[#0C2340]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-lg font-inter font-semibold text-[#0C2340] mt-4">
                    Sign in to your account
                  </h2>
                </div>
              </div>

              {/* Form - more compact */}
              <div className="px-6 py-5">
                {/* Error message */}
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
                  {/* Email field - more compact */}
                  <div className="space-y-1">
                    <label
                      htmlFor="email"
                      className="block text-xs font-semibold text-[#0C2340]"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg
                          className="w-4 h-4 text-[#af0f0f]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                          />
                        </svg>
                      </div>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={emailId}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                        className="w-full pl-10 pr-3 py-3 text-sm border-2 border-gray-200 rounded-lg focus:border-[#af0f0f] focus:ring-0 transition-all duration-300 disabled:bg-gray-50 disabled:opacity-70 text-[#0C2340] placeholder-gray-400"
                        placeholder="Enter your email address"
                      />
                    </div>
                  </div>

                  {/* Password field - more compact */}
                  <div className="space-y-1">
                    <label
                      htmlFor="password"
                      className="block text-xs font-semibold text-[#0C2340]"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg
                          className="w-4 h-4 text-[#af0f0f]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="w-full pl-10 pr-10 py-3 text-sm border-2 border-gray-200 rounded-lg focus:border-[#af0f0f] focus:ring-0 transition-all duration-300 disabled:bg-gray-50 disabled:opacity-70 text-[#0C2340] placeholder-gray-400"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#af0f0f] hover:text-[#0C2340] transition-colors"
                      >
                        {showPassword ? (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M14.12 14.12l1.415 1.415M14.12 14.12L9.878 9.878"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Submit button - more compact */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading || !emailId || !password}
                      className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-[#ae4242] to-[#c45252] hover:from-[#c45252] hover:to-[#ae4242] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ae4242] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg disabled:transform-none"
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
                          Signing In...
                        </div>
                      ) : (
                        <>
                          <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                            <svg
                              className="h-4 w-4 text-white group-hover:text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                              />
                            </svg>
                          </span>
                          Sign In
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Security notice - more compact */}
                <div className="mt-4 p-3 bg-[#0C2340]/5 rounded-lg border border-[#0C2340]/10">
                  <div className="flex items-start">
                    <svg
                      className="w-4 h-4 text-[#af0f0f] mt-0.5 mr-2 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <p className="text-xs text-[#0C2340]/70">
                        <span className="font-medium">Secure Access:</span> Your
                        login credentials are encrypted and protected.
                      </p>
                    </div>
                  </div>
                </div>
                {/* <p className="text-sm text-center pt-3 font-inter text-gray-600">
                  Don't have an account?{" "}
                  <Link to="/signup" className="hover:text-[#0C2340]">
                    Sign up here
                  </Link>
                </p> */}
              </div>
            </div>
          </div>
        </div>

        {/* Fixed footer at bottom with minimal spacing */}
        <div className="flex-shrink-0 py-3 text-center text-black/60 text-xs">
          <p>
            © 2025 Clint George, Mustansir Habil Bhagat. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
