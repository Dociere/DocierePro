import React, { useState, useEffect } from "react";
import { 
  FiBox, 
  FiDownload, 
  FiTrash2, 
  FiCheckCircle, 
  FiLoader,
  FiX,
  FiSearch,
  FiExternalLink
} from "react-icons/fi";
import axios from "axios";
import { useAuth } from "../context/useAuth";

const Extensions = ({ onClose }) => {
  const { isServerConnected } = useAuth();
  const [activeTab, setActiveTab] = useState("marketplace");
  const [marketplaceExtensions, setMarketplaceExtensions] = useState([]);
  const [installedExtensions, setInstalledExtensions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [installingId, setInstallingId] = useState(null);

  const fetchExtensions = async () => {
    setLoading(true);
    try {
      // 1. Fetch installed from Electron IPC
      if (window.electronAPI && window.electronAPI.extensions) {
        const installed = await window.electronAPI.extensions.getInstalled();
        setInstalledExtensions(installed);
      }

      // 2. Fetch marketplace from DociereServer
      const response = await axios.get("http://localhost:5025/api/extensions");
      setMarketplaceExtensions(response.data);
    } catch (err) {
      console.error("Failed to fetch extensions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExtensions();
  }, []);

  const handleInstall = async (ext) => {
    if (!isServerConnected) {
      alert("Cannot install extension: DocierePro is not connected to DociereServer. Please connect and try again.");
      return;
    }

    setInstallingId(ext.id);
    try {
      if (window.electronAPI && window.electronAPI.extensions) {
        await window.electronAPI.extensions.install(ext.id, ext.download_url);
        
        // Refresh 
        await fetchExtensions();
        
        // Notify host to refresh
        window.dispatchEvent(new CustomEvent("dociere-extensions-refresh"));
        
        // Show success (you could use the toast system here)
        alert(`${ext.name} installed successfully!`);
      }
    } catch (err) {
      console.error("Install failed", err);
      alert("Failed to install extension. Check console for details.");
    } finally {
      setInstallingId(null);
    }
  };

  const handleUninstall = async (id) => {
    if (!window.confirm("Are you sure you want to remove this extension?")) return;
    
    try {
      if (window.electronAPI && window.electronAPI.extensions) {
        await window.electronAPI.extensions.uninstall(id);
        await fetchExtensions();
        window.dispatchEvent(new CustomEvent("dociere-extensions-refresh"));
      }
    } catch (err) {
      console.error("Uninstall failed", err);
    }
  };

  const isInstalled = (id) => installedExtensions.some(ext => ext.id === id);

  const filteredMarketplace = marketplaceExtensions.filter(ext => 
    ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ext.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col overflow-hidden font-inter border border-gray-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <FiBox size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Extensions</h2>
              <p className="text-xs text-gray-500">Enhance your Dociere workflow</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-600"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Search & Tabs */}
        <div className="px-6 py-3 border-b flex items-center justify-between gap-4">
          <div className="flex p-1 bg-gray-100 rounded-xl">
            <button 
              onClick={() => setActiveTab("marketplace")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "marketplace" ? "bg-white shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Marketplace
            </button>
            <button 
              onClick={() => setActiveTab("installed")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "installed" ? "bg-white shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Installed ({installedExtensions.length})
            </button>
          </div>

          <div className="relative flex-1 max-w-xs">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input 
              type="text" 
              placeholder="Search extensions..."
              className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3">
              <FiLoader className="animate-spin" size={32} />
              <p className="text-sm">Loading extensions...</p>
            </div>
          ) : activeTab === "marketplace" ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredMarketplace.length > 0 ? filteredMarketplace.map(ext => (
                <div key={ext.id} className="group p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-50">
                    {ext.icon ? <img src={ext.icon} alt={ext.name} className="w-8 h-8 object-contain" /> : <FiBox className="text-gray-400" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">{ext.name}</h3>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">v{ext.version}</span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3 leading-relaxed">{ext.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        <span>by <span className="text-gray-600">{ext.author}</span></span>
                      </div>
                      
                      {isInstalled(ext.id) ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-semibold px-3 py-1 bg-emerald-50 rounded-lg">
                          <FiCheckCircle size={14} />
                          <span>Installed</span>
                        </div>
                      ) : (
                        <button 
                          disabled={installingId === ext.id}
                          onClick={() => handleInstall(ext)}
                          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-md shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50"
                        >
                          {installingId === ext.id ? <FiLoader className="animate-spin" size={14} /> : <FiDownload size={14} />}
                          Install
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="h-40 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl">
                  <p>No extensions found matching your search</p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {installedExtensions.length > 0 ? installedExtensions.map(ext => (
                <div key={ext.id} className="p-4 rounded-xl border border-gray-200 flex items-center gap-4 bg-gray-50/30">
                  <div className="w-10 h-10 rounded-lg bg-white flex-shrink-0 flex items-center justify-center border border-gray-100">
                    <FiBox className="text-indigo-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 text-sm">{ext.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-1">{ext.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleUninstall(ext.id)}
                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      title="Uninstall"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="h-60 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-3xl gap-4">
                  <FiBox size={48} className="opacity-20" />
                  <div className="text-center">
                    <p className="font-medium text-gray-600">No extensions installed yet</p>
                    <p className="text-xs mt-1">Browse the marketplace to find new features</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab("marketplace")}
                    className="mt-2 text-indigo-600 text-sm font-bold hover:underline"
                  >
                    Visit Marketplace
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50/50 flex items-center justify-between">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Secure Sandboxed Architecture</p>
          <a hred="#" className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:underline">
            Developer Documentation <FiExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default Extensions;
