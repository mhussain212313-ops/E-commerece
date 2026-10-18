import React, { useState } from "react";
import { 
  ShoppingBag, DollarSign, Clock, Layers, ArrowUpRight, 
  ArrowDownRight, Calendar, Download, Plus, FileText, 
  Share2, ChevronRight, CheckCircle2, AlertCircle, RefreshCw
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { generateInvoicePDF, getWhatsAppShareText, openWhatsAppInvoiceShare } from "../utils/pdfGenerator";

export const DashboardView = () => {
  const { 
    totalStockValue, totalCashReceived, totalPendingAmount, 
    totalStockMeters, categories, clients, stockLogs,
    setActiveModule, setModalState, addToast
  } = useApp();

  const [chartTimeframe, setChartTimeframe] = useState("Weekly");

  // Calculate total equivalent suits in stock
  const totalEquivalentSuits = Math.floor(totalStockMeters / 4);

  // Flatten all transactions for recent orders table
  const allTransactions = clients.flatMap(client => 
    (client.transactions || []).map(tx => ({
      ...tx,
      clientName: client.name,
      shopName: client.shopName,
      clientPhone: client.phone,
      clientCity: client.city
    }))
  ).sort((a, b) => new Date(b.date) - new Date(a.date));

  // State distribution calculation
  const totalThaanMeters = categories.reduce((sum, c) => sum + (c.stock.thaan * 24), 0);
  const totalLooseMeters = categories.reduce((sum, c) => sum + (c.stock.looseMeters || 0), 0);
  const totalPacketMeters = categories.reduce((sum, c) => sum + (c.stock.packetSuits * 4), 0);
  const totalAllMeters = totalThaanMeters + totalLooseMeters + totalPacketMeters || 1;

  const thaanPercent = Math.round((totalThaanMeters / totalAllMeters) * 100);
  const loosePercent = Math.round((totalLooseMeters / totalAllMeters) * 100);
  const packetPercent = 100 - thaanPercent - loosePercent;

  // Handle PDF Export
  const handleDownloadPDF = (tx) => {
    const client = clients.find(c => c.name === tx.clientName) || {
      name: tx.clientName,
      shopName: tx.shopName,
      phone: tx.clientPhone,
      city: tx.clientCity
    };
    const cat = categories.find(c => c.id === tx.categoryId);
    generateInvoicePDF({ invoice: tx, client, category: cat });
    addToast(`PDF invoice ${tx.invoiceNo} downloaded successfully!`, "success");
  };

  // Handle WhatsApp Share
  const handleWhatsAppShare = (tx) => {
    const client = clients.find(c => c.name === tx.clientName) || {
      name: tx.clientName,
      shopName: tx.shopName,
      phone: tx.clientPhone,
      city: tx.clientCity
    };
    const cat = categories.find(c => c.id === tx.categoryId);
    openWhatsAppInvoiceShare({ invoice: tx, client, category: cat, addToast });
  };

  return (
    <div>
      {/* Top Page Subheader matching reference screenshots */}
      <div className="page-subheader">
        <div>
          <div className="breadcrumbs">
            <span>Dashboards</span>
            <span>&rsaquo;</span>
            <span className="current">Ecommerce & Wholesale</span>
          </div>
          <h1 className="page-title">Hey, Jack Miller 👋</h1>
          <p className="page-subtitle">
            Live Inventory Management and B2B Khata for Men's Unstitched Shalwar Kameez
          </p>
        </div>

        <div className="subheader-actions">
          <div className="date-pill">
            <Calendar size={15} color="var(--primary)" />
            <span>15/10/2026 - 15/11/2026</span>
          </div>

          <button 
            className="btn-secondary"
            onClick={() => {
              if (allTransactions.length > 0) {
                handleDownloadPDF(allTransactions[0]);
              } else {
                addToast("No transactions available to export yet.", "info");
              }
            }}
          >
            <Download size={15} />
            <span>Export report</span>
          </button>

          <button 
            className="btn-primary"
            onClick={() => {
              setActiveModule("khata");
              setModalState(prev => ({ ...prev, newSale: true }));
            }}
          >
            <Plus size={16} />
            <span>+ New Sale</span>
          </button>
        </div>
      </div>

      <div className="main-content">
        {/* 4 Top Metric Cards (Replicating exact Zeno aesthetic) */}
        <div className="stat-cards-grid">
          {/* Card 1: Total Stock Value */}
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-title">Total Stock Value</span>
              <div className="stat-icon-circle stat-icon-purple">
                <Layers size={20} />
              </div>
            </div>
            <div className="stat-value">PKR {totalStockValue.toLocaleString()}</div>
            <div className="stat-footer">
              <span className="trend-badge trend-up">
                <ArrowUpRight size={15} /> +12.5%
              </span>
              <span style={{ color: "var(--text-light)" }}>across 5 fabric categories</span>
            </div>
            {/* Sparkline curve */}
            <svg className="stat-sparkline" viewBox="0 0 100 28" fill="none">
              <defs>
                <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7047eb" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#7047eb" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0 24 Q 20 5, 40 18 T 80 8 T 100 12 L 100 28 L 0 28 Z" fill="url(#purpleGrad)" />
              <path d="M0 24 Q 20 5, 40 18 T 80 8 T 100 12" stroke="#7047eb" strokeWidth="2.5" fill="none" />
            </svg>
          </div>

          {/* Card 2: Total Cash Received */}
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-title">Total Cash Received</span>
              <div className="stat-icon-circle stat-icon-green">
                <DollarSign size={20} />
              </div>
            </div>
            <div className="stat-value">PKR {totalCashReceived.toLocaleString()}</div>
            <div className="stat-footer">
              <span className="trend-badge trend-up">
                <ArrowUpRight size={15} /> +18.2%
              </span>
              <span style={{ color: "var(--text-light)" }}>from B2B client payments</span>
            </div>
            {/* Sparkline curve */}
            <svg className="stat-sparkline" viewBox="0 0 100 28" fill="none">
              <defs>
                <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0 20 Q 25 25, 50 12 T 80 6 T 100 4 L 100 28 L 0 28 Z" fill="url(#greenGrad)" />
              <path d="M0 20 Q 25 25, 50 12 T 80 6 T 100 4" stroke="#22c55e" strokeWidth="2.5" fill="none" />
            </svg>
          </div>

          {/* Card 3: Total Pending Amount */}
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-title">Total Pending Khata</span>
              <div className="stat-icon-circle stat-icon-cyan">
                <Clock size={20} />
              </div>
            </div>
            <div className="stat-value" style={{ color: totalPendingAmount > 0 ? "var(--accent-amber)" : "var(--text-main)" }}>
              PKR {totalPendingAmount.toLocaleString()}
            </div>
            <div className="stat-footer">
              <span className="trend-badge" style={{ color: "var(--accent-amber)" }}>
                {clients.filter(c => {
                  const b = (c.transactions || []).reduce((s, t) => s + (t.totalBill || 0), 0);
                  const p = (c.transactions || []).reduce((s, t) => s + (t.amountPaid || 0), 0);
                  return (c.openingBalance || 0) + (b - p) > 0;
                }).length} Clients
              </span>
              <span style={{ color: "var(--text-light)" }}>awaiting settlement</span>
            </div>
            {/* Sparkline curve */}
            <svg className="stat-sparkline" viewBox="0 0 100 28" fill="none">
              <defs>
                <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0 10 Q 30 22, 60 12 T 85 18 T 100 14 L 100 28 L 0 28 Z" fill="url(#cyanGrad)" />
              <path d="M0 10 Q 30 22, 60 12 T 85 18 T 100 14" stroke="#06b6d4" strokeWidth="2.5" fill="none" />
            </svg>
          </div>

          {/* Card 4: Total Fabric Stock in Meters */}
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-title">Total Fabric in Stock</span>
              <div className="stat-icon-circle stat-icon-pink">
                <ShoppingBag size={20} />
              </div>
            </div>
            <div className="stat-value">{totalStockMeters.toLocaleString()} m</div>
            <div className="stat-footer">
              <span className="trend-badge trend-up">
                <ArrowUpRight size={15} /> ~{totalEquivalentSuits} Suits
              </span>
              <span style={{ color: "var(--text-light)" }}>4m per standard suit</span>
            </div>
            {/* Sparkline curve */}
            <svg className="stat-sparkline" viewBox="0 0 100 28" fill="none">
              <defs>
                <linearGradient id="pinkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0 18 Q 25 8, 50 15 T 80 10 T 100 8 L 100 28 L 0 28 Z" fill="url(#pinkGrad)" />
              <path d="M0 18 Q 25 8, 50 15 T 80 10 T 100 8" stroke="#ec4899" strokeWidth="2.5" fill="none" />
            </svg>
          </div>
        </div>

        {/* Dashboard 2-Column Grid (Main Chart & Radial/Donut Overview) */}
        <div className="dashboard-grid-2-1">
          {/* Left: Order Status & Khata Cash Flow Chart */}
          <div className="zeno-card">
            <div className="zeno-card-header">
              <div className="card-title-group">
                <h3 className="card-title">Order Status & Khata Cash Flow</h3>
                <p className="card-subtitle">Monthly breakdown of billed sales vs received cash (PKR)</p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {/* Legend matching reference image */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12.5px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#7047eb" }} />
                    <span style={{ color: "var(--text-muted)" }}>Paid</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#f59e0b" }} />
                    <span style={{ color: "var(--text-muted)" }}>Pending</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#22c55e" }} />
                    <span style={{ color: "var(--text-muted)" }}>Stock In</span>
                  </div>
                </div>

                {/* Timeframe pill tabs */}
                <div className="tab-pill-group">
                  {["Today", "Weekly", "Yearly"].map(t => (
                    <button
                      key={t}
                      className={`tab-pill-btn ${chartTimeframe === t ? "active" : ""}`}
                      onClick={() => setChartTimeframe(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom SVG Bar & Trend Chart mimicking Zeno screenshot */}
            <div style={{ height: "230px", width: "100%", position: "relative", marginTop: "10px" }}>
              <svg width="100%" height="100%" viewBox="0 0 700 200" preserveAspectRatio="none">
                {/* Grid lines */}
                <line x1="40" y1="30" x2="680" y2="30" stroke="var(--border-light)" strokeDasharray="3 3" />
                <line x1="40" y1="80" x2="680" y2="80" stroke="var(--border-light)" strokeDasharray="3 3" />
                <line x1="40" y1="130" x2="680" y2="130" stroke="var(--border-light)" strokeDasharray="3 3" />
                <line x1="40" y1="170" x2="680" y2="170" stroke="var(--border-input)" />

                {/* Y-Axis Labels */}
                <text x="25" y="35" fontSize="10" fill="var(--text-light)" textAnchor="end">80k</text>
                <text x="25" y="85" fontSize="10" fill="var(--text-light)" textAnchor="end">50k</text>
                <text x="25" y="135" fontSize="10" fill="var(--text-light)" textAnchor="end">20k</text>
                <text x="25" y="174" fontSize="10" fill="var(--text-light)" textAnchor="end">0</text>

                {/* Monthly Bars & Dots */}
                {[
                  { month: "Jan", paid: 90, pend: 30, x: 70 },
                  { month: "Feb", paid: 120, pend: 45, x: 122 },
                  { month: "Mar", paid: 85, pend: 25, x: 174 },
                  { month: "Apr", paid: 140, pend: 40, x: 226 },
                  { month: "May", paid: 110, pend: 50, x: 278 },
                  { month: "Jun", paid: 155, pend: 35, x: 330 },
                  { month: "Jul", paid: 130, pend: 60, x: 382 },
                  { month: "Aug", paid: 170, pend: 45, x: 434 },
                  { month: "Sep", paid: 145, pend: 30, x: 486 },
                  { month: "Oct", paid: 160, pend: 55, x: 538 },
                  { month: "Nov", paid: 125, pend: 40, x: 590 },
                  { month: "Dec", paid: 180, pend: 50, x: 642 }
                ].map((item, idx) => (
                  <g key={idx}>
                    {/* Paid Column */}
                    <rect 
                      x={item.x - 7} 
                      y={170 - (item.paid * 0.75)} 
                      width="6" 
                      height={item.paid * 0.75} 
                      rx="3" 
                      fill="#7047eb" 
                      opacity="0.85" 
                    />
                    {/* Pending Column */}
                    <rect 
                      x={item.x + 1} 
                      y={170 - (item.pend * 0.75)} 
                      width="6" 
                      height={item.pend * 0.75} 
                      rx="3" 
                      fill="#f59e0b" 
                      opacity="0.75" 
                    />
                    {/* Month Label */}
                    <text x={item.x} y="190" fontSize="11" fill="var(--text-muted)" textAnchor="middle">
                      {item.month}
                    </text>
                  </g>
                ))}

                {/* Curved Trend Line */}
                <path 
                  d="M 70 115 Q 122 80, 174 120 T 278 70 T 382 100 T 486 60 T 590 85 T 642 50" 
                  fill="none" 
                  stroke="#22c55e" 
                  strokeWidth="2.5" 
                  strokeDasharray="4 2"
                />
              </svg>
            </div>
          </div>

          {/* Right: Radial Donut Chart (Inventory Breakdown by State) */}
          <div className="zeno-card">
            <div className="zeno-card-header">
              <div className="card-title-group">
                <h3 className="card-title">Physical Stock States</h3>
                <p className="card-subtitle">Thaan vs Loose vs Packets</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 0" }}>
              {/* Radial Progress Gauge matching Reference Image 1 & 2 */}
              <div style={{ position: "relative", width: "170px", height: "170px" }}>
                <svg width="170" height="170" viewBox="0 0 100 100">
                  {/* Background Circle */}
                  <circle cx="50" cy="50" r="40" stroke="var(--border-input)" strokeWidth="11" fill="none" opacity="0.4" />
                  
                  {/* Thaan Rolls (Purple) */}
                  <circle 
                    cx="50" cy="50" r="40" 
                    stroke="#7047eb" 
                    strokeWidth="11" 
                    fill="none" 
                    strokeDasharray={`${thaanPercent * 2.51} 251`}
                    strokeDashoffset="0"
                    transform="rotate(-90 50 50)"
                    strokeLinecap="round"
                  />

                  {/* Packet Suits (Green) */}
                  <circle 
                    cx="50" cy="50" r="40" 
                    stroke="#22c55e" 
                    strokeWidth="11" 
                    fill="none" 
                    strokeDasharray={`${packetPercent * 2.51} 251`}
                    strokeDashoffset={`-${thaanPercent * 2.51}`}
                    transform="rotate(-90 50 50)"
                  />

                  {/* Loose Meters (Cyan) */}
                  <circle 
                    cx="50" cy="50" r="40" 
                    stroke="#06b6d4" 
                    strokeWidth="11" 
                    fill="none" 
                    strokeDasharray={`${loosePercent * 2.51} 251`}
                    strokeDashoffset={`-${(thaanPercent + packetPercent) * 2.51}`}
                    transform="rotate(-90 50 50)"
                  />
                </svg>

                <div style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-main)" }}>
                    {thaanPercent}%
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>
                    In Rolls
                  </div>
                </div>
              </div>

              {/* Legend with Meters & Counts */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", marginTop: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12.5px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "3px", background: "#7047eb" }} />
                    <span>Thaan Rolls (24m each)</span>
                  </div>
                  <span style={{ fontWeight: "700" }}>{totalThaanMeters} m ({thaanPercent}%)</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12.5px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "3px", background: "#22c55e" }} />
                    <span>Packet Suits (4m each)</span>
                  </div>
                  <span style={{ fontWeight: "700" }}>{totalPacketMeters} m ({packetPercent}%)</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12.5px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "3px", background: "#06b6d4" }} />
                    <span>Loose Stock (Uncut)</span>
                  </div>
                  <span style={{ fontWeight: "700" }}>{totalLooseMeters} m ({loosePercent}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Lower 2-Column Grid: Recent Orders & Top Fabric Categories */}
        <div className="dashboard-grid-2-1">
          {/* Left: Recent Khata Transactions Table */}
          <div className="zeno-card">
            <div className="zeno-card-header">
              <div className="card-title-group">
                <h3 className="card-title">Recent Khata Sales & Transactions</h3>
                <p className="card-subtitle">Live orders with instant inventory deduction and exports</p>
              </div>

              <button 
                className="btn-secondary" 
                style={{ padding: "6px 12px", fontSize: "12px" }}
                onClick={() => setActiveModule("khata")}
              >
                View Full Khata &rsaquo;
              </button>
            </div>

            <div className="zeno-table-wrapper">
              <table className="zeno-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th>Fabric & Cut</th>
                    <th>Total Bill</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allTransactions.slice(0, 5).map((tx) => {
                    const isFullyPaid = Number(tx.remainingBalance) <= 0;
                    return (
                      <tr key={tx.id}>
                        <td>
                          <span style={{ fontWeight: "700", color: "var(--primary)" }}>{tx.invoiceNo}</span>
                          <div style={{ fontSize: "11px", color: "var(--text-light)" }}>{tx.date}</div>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ 
                              width: "32px", height: "32px", borderRadius: "50%", 
                              background: "var(--primary-light)", color: "var(--primary)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontWeight: "700", fontSize: "12px" 
                            }}>
                              {tx.clientName?.charAt(0) || "C"}
                            </div>
                            <div>
                              <div style={{ fontWeight: "600" }}>{tx.clientName}</div>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{tx.shopName}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: "500" }}>
                            {tx.items && tx.items.length > 1 ? (
                              <span className="badge badge-purple" style={{ marginBottom: "2px" }}>
                                {tx.items.length} Colors Order
                              </span>
                            ) : null}
                            <div style={{ fontSize: "13px", fontWeight: "600" }}>{tx.categoryName}</div>
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                            {tx.items && tx.items.length > 1 
                              ? `${tx.items.length} collections • ${tx.meters}m total fabric`
                              : `${tx.quantity} ${tx.saleType === "suits" ? "Suits" : "Meters"} (${tx.meters}m total)`}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: "700" }}>PKR {Number(tx.totalBill).toLocaleString()}</div>
                          <div style={{ fontSize: "11px", color: "var(--accent-green)" }}>
                            Paid: PKR {Number(tx.amountPaid).toLocaleString()}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${isFullyPaid ? "badge-paid" : "badge-pending"}`}>
                            {isFullyPaid ? "Paid" : `Pending PKR ${Number(tx.remainingBalance).toLocaleString()}`}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                            <button
                              className="btn-secondary"
                              style={{ padding: "6px 8px", borderRadius: "6px" }}
                              title="Download PDF Bill"
                              onClick={() => handleDownloadPDF(tx)}
                            >
                              <FileText size={14} />
                            </button>
                            <button
                              className="btn-success"
                              style={{ padding: "6px 8px", borderRadius: "6px" }}
                              title="Share Bill on WhatsApp"
                              onClick={() => handleWhatsAppShare(tx)}
                            >
                              <Share2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Category Stock Health Bars & Activity */}
          <div className="zeno-card">
            <div className="zeno-card-header">
              <div className="card-title-group">
                <h3 className="card-title">Live Category Stock Levels</h3>
                <p className="card-subtitle">Available fabric meters & value</p>
              </div>
              <button 
                className="btn-secondary" 
                style={{ padding: "4px 10px", fontSize: "11.5px" }}
                onClick={() => setActiveModule("inventory")}
              >
                Manage
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {categories.map(cat => {
                const meters = (cat.stock.thaan * 24) + (cat.stock.looseMeters || 0) + (cat.stock.packetSuits * 4);
                const percent = Math.min(100, Math.round((meters / 1500) * 100));

                return (
                  <div key={cat.id} style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span 
                          style={{ 
                            width: "12px", height: "12px", borderRadius: "3px", 
                            background: cat.colorCode, border: `1px solid ${cat.borderCode || "#cbd5e1"}` 
                          }} 
                        />
                        <span style={{ fontWeight: "600" }}>{cat.shortName}</span>
                      </div>
                      <span style={{ fontWeight: "700", color: "var(--primary)" }}>
                        {meters} m
                      </span>
                    </div>

                    <div style={{ 
                      width: "100%", height: "7px", background: "var(--bg-subtle)", 
                      borderRadius: "999px", overflow: "hidden" 
                    }}>
                      <div 
                        style={{ 
                          width: `${percent}%`, 
                          height: "100%", 
                          background: percent < 30 ? "var(--accent-red)" : "linear-gradient(90deg, #7047eb, #9333ea)",
                          borderRadius: "999px" 
                        }} 
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-light)" }}>
                      <span>{cat.stock.thaan} Thaan • {cat.stock.packetSuits} Packets</span>
                      <span>PKR {(meters * cat.pricePerMeter).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Stock Converter Promotion Button */}
            <div style={{ 
              marginTop: "20px", padding: "14px", 
              background: "var(--primary-light)", 
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--primary-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div>
                <div style={{ fontSize: "12.5px", fontWeight: "700", color: "var(--primary)" }}>
                  Need more packet suits?
                </div>
                <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                  Convert Thaan into 6 suits instantly.
                </div>
              </div>
              <button
                className="btn-primary"
                style={{ padding: "6px 12px", fontSize: "12px" }}
                onClick={() => {
                  setActiveModule("inventory");
                  setModalState(prev => ({ ...prev, convertStock: true }));
                }}
              >
                Convert
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
