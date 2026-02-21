import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import GoBack from "../assets/icons/goBack.svg?react";
import TemplateCards from "../components/templateCards";
import { useAuth } from "../context/useAuth";
import { useSettings } from "../context/useSettings";
import axios from "axios";

const API_URL = "http://localhost:5000";

// Built-in templates that always appear (keyed by folder name)
const BUILT_IN_FOLDERS = [
  "IEEE Conference",
  "IEEE Journal",
  "ACM Manuscript",
  "MLA Format",
  "Resume",
];

const SignInModal = ({ isOpen, onClose, onSignIn }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-xl font-bold mb-4">Sign In Required</h3>
        <p className="text-gray-600 mb-6">
          You need to be signed in to browse more templates from the server.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onSignIn}
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 font-medium"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

function TemplateSelect() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const isDark = settings.appearance.mode === "dark";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userTemplates, setUserTemplates] = useState([]);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/templates`);
        if (res.data.success) {
          // Filter out built-in folders to get user-saved templates
          const custom = res.data.templates.filter(
            (t) => !BUILT_IN_FOLDERS.includes(t),
          );
          setUserTemplates(custom);
        }
      } catch (err) {
        console.error("Failed to fetch templates:", err);
      }
    };
    fetchTemplates();
  }, []);

  const handleBrowseClick = () => {
    if (isAuthenticated) {
      navigate("/template/browse");
    } else {
      setIsModalOpen(true);
    }
  };

  const handleSignIn = () => {
    setIsModalOpen(false);
    navigate("/login");
  };

  return (
    <div
      className={`min-h-screen flex flex-row mt-20 ${isDark ? "text-white" : "text-black"}`}
    >
      <Link
        to="/"
        className="font-inter ml-24 mt-3 text-sm flex hover:opacity-70 transition-opacity"
      >
        <GoBack
          style={{ fill: isDark ? "#fff" : "#0a0a0a" }}
          className="w-5 h-5"
        />
        <p className="ml-2">Go Back</p>
      </Link>

      <div className="flex flex-1 flex-col justify-center">
        <div className="mt-0 ml-20 w-[72vw] mb-10">
          <div className="flex justify-between items-end mb-8">
            <div>
              <p className="font-playfair text-5xl font-bold">Templates</p>
              <p
                className={`mt-2 font-inter font-medium ${isDark ? "text-gray-400" : "text-[#7D7D7D]"}`}
              >
                Select a template to start your project
              </p>
            </div>

            <button
              onClick={handleBrowseClick}
              className={`px-6 py-2 rounded font-medium border transition-colors ${
                isDark
                  ? "border-gray-600 hover:bg-gray-800"
                  : "border-gray-300 hover:bg-gray-50"
              }`}
            >
              Browse More Templates
            </button>
          </div>

          {/* Built-in templates + Blank */}
          <div className="flex flex-row flex-wrap mt-10 gap-x-20 gap-y-12">
            <Link
              to="/detailPage/blank"
              className="transform hover:scale-105 transition-transform duration-200"
            >
              <TemplateCards title="Blank Document" />
            </Link>
            {BUILT_IN_FOLDERS.map((folder) => (
              <Link
                key={folder}
                to={`/template/preview/${folder}`}
                className="transform hover:scale-105 transition-transform duration-200"
              >
                <TemplateCards title={folder} />
              </Link>
            ))}
          </div>

          {/* User-saved templates */}
          {userTemplates.length > 0 && (
            <div className="mt-16">
              <p
                className={`text-xl font-inter font-medium mb-6 ${isDark ? "text-gray-300" : "text-[#333]"}`}
              >
                Your Templates
              </p>
              <div className="flex flex-row flex-wrap gap-x-20 gap-y-12">
                {userTemplates.map((folder) => (
                  <Link
                    key={folder}
                    to={`/template/preview/${folder}`}
                    className="transform hover:scale-105 transition-transform duration-200"
                  >
                    <TemplateCards title={folder} />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <SignInModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSignIn={handleSignIn}
      />
    </div>
  );
}

export default TemplateSelect;
