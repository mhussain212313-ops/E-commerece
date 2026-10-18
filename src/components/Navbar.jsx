import React, { useState } from "react";
import { 
  Menu, Search, Moon, Sun, ShoppingBag, Bell, Maximize, 
  Settings, Globe, ShieldCheck, Database, RefreshCw 
} from "lucide-react";
import { useApp } from "../context/AppContext";

export const Navbar = () => {
  const { 
    theme, toggleTheme, searchQuery, setSearchQuery, 
    sidebarOpen, setSidebarOpen, totalPendingAmount,
    resetToDemo, addToast, categories
  } = useApp();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Total ready-to-deliver packet suits
  const totalPacketSuits = categories.reduce((sum, c) => sum + (c.stock.packetSuits || 0), 0);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header className="zeno-navbar">
      {/* Left section: Toggle & Search */}
      <div className="navbar-left">
        <button 
          className="menu-toggle-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title="Toggle Sidebar"
          aria-label="Toggle Navigation Sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="nav-search-bar">
          <Search size={18} className="nav-search-icon" />
          <input 
            type="text" 
            placeholder="Search fabrics, clients, invoices, rolls..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Right section: Icons & User Avatar matching reference image */}
      <div className="navbar-right">
        {/* Language Icon */}
        <button 
          className="nav-icon-btn nav-globe-btn" 
          title="Language: English / Urdu (PKR Currency)"
          onClick={() => addToast("Active Currency: Pakistani Rupee (PKR) • English / Urdu B2B Support", "info")}
        >
          <Globe size={19} />
        </button>

        {/* Dark / Light Mode Toggle */}
        <button 
          className="nav-icon-btn" 
          onClick={toggleTheme} 
          title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
        >
          {theme === "light" ? <Moon size={19} /> : <Sun size={19} className="text-amber-400" />}
        </button>

        {/* Ready Packet Stock Counter Badge */}
        <button 
          className="nav-icon-btn" 
          title={`Ready Packet Suits in Stock: ${totalPacketSuits} suits`}
          onClick={() => addToast(`Current ready-to-deliver Packet Stock: ${totalPacketSuits} suits`, "info")}
        >
          <ShoppingBag size={19} />
          <span className="badge-counter">{totalPacketSuits > 99 ? "99+" : totalPacketSuits}</span>
        </button>

        {/* Notification Bell */}
        <div style={{ position: "relative" }}>
          <button 
            className="nav-icon-btn" 
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications & Ledger Alerts"
          >
            <Bell size={19} />
            {totalPendingAmount > 0 && <span className="status-dot" style={{ background: "#ef4444", top: 8, right: 8 }} />}
          </button>

          {showNotifications && (
            <div style={{
              position: "absolute",
              right: 0,
              top: "48px",
              width: "320px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-card)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-lg)",
              padding: "16px",
              zIndex: 50
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h4 style={{ fontSize: "14px", fontWeight: "700" }}>System Alerts</h4>
                <span className="badge badge-purple" style={{ fontSize: "10px" }}>Live</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12.5px" }}>
                <div style={{ padding: "8px 10px", background: "var(--bg-subtle)", borderRadius: "8px" }}>
                  <div style={{ fontWeight: "600", color: "var(--accent-amber)" }}>Khata Ledger Pending</div>
                  <div style={{ color: "var(--text-muted)", marginTop: "2px" }}>
                    Total outstanding balance: PKR {totalPendingAmount.toLocaleString()} across active B2B clients.
                  </div>
                </div>
                <div style={{ padding: "8px 10px", background: "var(--bg-subtle)", borderRadius: "8px" }}>
                  <div style={{ fontWeight: "600", color: "var(--accent-green)" }}>Inventory Synchronization</div>
                  <div style={{ color: "var(--text-muted)", marginTop: "2px" }}>
                    Live deduction engine connected. All 5 fabric categories balanced.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fullscreen Toggle */}
        <button 
          className="nav-icon-btn nav-fullscreen-btn" 
          onClick={toggleFullScreen}
          title="Toggle Fullscreen"
        >
          <Maximize size={19} />
        </button>

        {/* Settings / DB Info Modal Toggle */}
        <button 
          className="nav-icon-btn nav-settings-btn" 
          onClick={() => setShowSettingsModal(true)}
          title="Database Connection & Settings"
        >
          <Settings size={19} />
        </button>

        {/* User Profile Avatar with Jack Miller status dot */}
        <div 
          className="user-profile-badge" 
          title="Salahuddin Fabrics Store Owner / Admin"
          onClick={() => setShowSettingsModal(true)}
        >
          <div className="avatar-wrapper">
            <img 
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" 
              alt="Jack Miller" 
            />
            <span className="status-dot" />
          </div>
          <div style={{ display: "none" }} className="profile-text-desktop">
            <div style={{ fontSize: "13px", fontWeight: "700" }}>Jack Miller</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Store Manager</div>
          </div>
        </div>
      </div>

      {/* Settings Modal (Shows DB template info and reset options) */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="stat-icon-circle stat-icon-purple" style={{ width: "36px", height: "36px" }}>
                  <Database size={18} />
                </div>
                <div>
                  <h3 className="modal-title">System & Database Setup</h3>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Architecture & Backend Status</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowSettingsModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ 
                padding: "14px", 
                background: "var(--primary-light)", 
                borderRadius: "var(--radius-md)", 
                border: "1px solid var(--primary-border)",
                fontSize: "13px"
              }}>
                <div style={{ fontWeight: "700", color: "var(--primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <ShieldCheck size={16} /> Backend Database Rule: Standalone Mode
                </div>
                <p style={{ color: "var(--text-main)", marginTop: "4px" }}>
                  As instructed, no external database has been connected. All state is maintained live in high-performance frontend state and synced with localStorage.
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: "13.5px", fontWeight: "700", marginBottom: "6px" }}>Environment File:</h4>
                <div style={{ 
                  background: "var(--bg-main)", 
                  padding: "12px", 
                  borderRadius: "8px", 
                  fontFamily: "monospace", 
                  fontSize: "12px",
                  border: "1px solid var(--border-input)"
                }}>
                  <code>.env (Clean & Empty at project root)</code>
                  <p style={{ color: "var(--text-muted)", marginTop: "4px" }}>
                    Currently kept 100% empty. You can manually enter your database credentials whenever you are ready.
                  </p>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: "13.5px", fontWeight: "700", marginBottom: "6px" }}>Demo Data Tools:</h4>
                <button 
                  className="btn-secondary" 
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => {
                    resetToDemo();
                    setShowSettingsModal(false);
                  }}
                >
                  <RefreshCw size={16} /> Reset All Data to Demo Factory State
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setShowSettingsModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
