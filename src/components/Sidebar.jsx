import React from "react";
import { 
  LayoutDashboard, Layers, BookOpen, Repeat, Users, 
  FileText, TrendingUp, Sparkles, CheckCircle2, ChevronRight, RotateCcw, X
} from "lucide-react";
import { useApp } from "../context/AppContext";

export const Sidebar = () => {
  const { 
    activeModule, setActiveModule, sidebarOpen, setSidebarOpen,
    categories, clients, totalPendingAmount, setModalState 
  } = useApp();

  const totalSuitsInStock = categories.reduce((sum, c) => {
    return sum + (c.stock.thaan * 6) + Math.floor(c.stock.looseMeters / 4) + c.stock.packetSuits;
  }, 0);

  // Auto-close drawer on mobile when an item is clicked
  const handleNavClick = (action) => {
    if (action) action();
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  return (
    <aside className={`zeno-sidebar ${sidebarOpen ? "open" : "collapsed"}`}>
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <div className="brand-icon-zeno" title="Salahuddin Fabrics">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <div className="brand-title-wrap" style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
            <span className="brand-text">Salahuddin</span>
            <span className="brand-badge">Fabrics</span>
          </div>
        </div>

        {/* Mobile Close Button */}
        <button 
          className="sidebar-close-mobile-btn"
          onClick={() => setSidebarOpen(false)}
          title="Close Navigation"
          aria-label="Close Navigation Sidebar"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="sidebar-content">
        <div className="nav-section-title">MAIN MODULES</div>
        <ul className="sidebar-nav-list">
          {/* Module 1: Dashboard */}
          <li>
            <button
              className={`nav-item-btn ${activeModule === "dashboard" ? "active" : ""}`}
              onClick={() => handleNavClick(() => setActiveModule("dashboard"))}
            >
              <div className="nav-item-left">
                <LayoutDashboard size={18} className="nav-icon" />
                <span>Dashboard</span>
              </div>
              <span className="nav-pill-badge">Live</span>
            </button>
          </li>

          {/* Module 2: Inventory */}
          <li>
            <button
              className={`nav-item-btn ${activeModule === "inventory" ? "active" : ""}`}
              onClick={() => handleNavClick(() => setActiveModule("inventory"))}
            >
              <div className="nav-item-left">
                <Layers size={18} className="nav-icon" />
                <span>Inventory</span>
              </div>
              <span className="nav-pill-badge" title="Equivalent ready suits in stock">
                {totalSuitsInStock}
              </span>
            </button>
          </li>

          {/* Module 3: B2B Khata */}
          <li>
            <button
              className={`nav-item-btn ${activeModule === "khata" ? "active" : ""}`}
              onClick={() => handleNavClick(() => setActiveModule("khata"))}
            >
              <div className="nav-item-left">
                <BookOpen size={18} className="nav-icon" />
                <span>B2B Khata</span>
              </div>
              <span 
                className="nav-pill-badge" 
                style={totalPendingAmount > 0 ? { background: "var(--accent-amber)", color: "white" } : {}}
                title={`${clients.length} active wholesale clients`}
              >
                {clients.length}
              </span>
            </button>
          </li>
        </ul>

        {/* Quick Operations Section */}
        <div className="nav-section-title" style={{ marginTop: "24px" }}>QUICK ACTIONS</div>
        <ul className="sidebar-nav-list">
          <li>
            <button 
              className="nav-item-btn"
              onClick={() => handleNavClick(() => {
                setActiveModule("inventory");
                setModalState(prev => ({ ...prev, convertStock: true }));
              })}
            >
              <div className="nav-item-left">
                <Repeat size={17} className="nav-icon" />
                <span>Convert Stock</span>
              </div>
              <ChevronRight size={14} color="var(--text-light)" />
            </button>
          </li>

          <li>
            <button 
              className="nav-item-btn"
              onClick={() => handleNavClick(() => {
                setActiveModule("khata");
                setModalState(prev => ({ ...prev, newSale: true }));
              })}
            >
              <div className="nav-item-left">
                <TrendingUp size={17} className="nav-icon" />
                <span>+ New Wholesale Sale</span>
              </div>
            </button>
          </li>

          <li>
            <button 
              className="nav-item-btn"
              onClick={() => handleNavClick(() => {
                setActiveModule("khata");
                setModalState(prev => ({ ...prev, recordReturn: true }));
              })}
            >
              <div className="nav-item-left">
                <RotateCcw size={17} className="nav-icon" style={{ color: "var(--accent-amber)" }} />
                <span>+ Return Stock / Wapsi</span>
              </div>
            </button>
          </li>

          <li>
            <button 
              className="nav-item-btn"
              onClick={() => handleNavClick(() => {
                setActiveModule("khata");
                setModalState(prev => ({ ...prev, addClient: true }));
              })}
            >
              <div className="nav-item-left">
                <Users size={17} className="nav-icon" />
                <span>+ Add B2B Client</span>
              </div>
            </button>
          </li>
        </ul>

        {/* Shalwar Kameez Fabric Category Quick List */}
        <div className="nav-section-title" style={{ marginTop: "24px" }}>FABRIC COLLECTIONS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "0 6px" }}>
          {categories.map(cat => (
            <div 
              key={cat.id} 
              style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                padding: "6px 10px", 
                borderRadius: "8px",
                fontSize: "12px",
                color: "var(--text-muted)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span 
                  style={{ 
                    width: "10px", 
                    height: "10px", 
                    borderRadius: "3px", 
                    backgroundColor: cat.colorCode,
                    border: `1px solid ${cat.borderCode || "#cbd5e1"}` 
                  }} 
                />
                <span style={{ fontWeight: "500" }}>{cat.shortName}</span>
              </div>
              <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--primary)" }}>
                {cat.pricePerMeter} PKR/m
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Business Card */}
      <div style={{ 
        padding: "16px", 
        borderTop: "1px solid var(--border-light)",
        background: "var(--bg-subtle)"
      }}>
        <div style={{ 
          background: "var(--bg-card)", 
          borderRadius: "var(--radius-md)", 
          padding: "12px",
          border: "1px solid var(--border-card)",
          boxShadow: "var(--shadow-sm)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <Sparkles size={16} color="var(--primary)" />
            <span style={{ fontSize: "12px", fontWeight: "700" }}>Men's Unstitched</span>
          </div>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.4 }}>
            1 Suit = 4 Meters<br />
            1 Thaan = 6 Suits (24m)
          </p>
          <div style={{ 
            marginTop: "8px", 
            paddingTop: "6px", 
            borderTop: "1px dashed var(--border-light)",
            display: "flex", 
            alignItems: "center", 
            gap: "5px", 
            fontSize: "10px", 
            color: "var(--accent-green)",
            fontWeight: "600"
          }}>
            <CheckCircle2 size={12} /> Live Inventory Synced
          </div>
        </div>
      </div>
    </aside>
  );
};
