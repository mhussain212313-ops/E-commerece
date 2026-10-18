import React, { useState } from "react";
import { 
  Layers, Repeat, Plus, Edit2, Box, Scissors, 
  Package, AlertTriangle, CheckCircle, ArrowRight,
  TrendingUp, Info, History
} from "lucide-react";
import { useApp } from "../context/AppContext";

export const InventoryView = () => {
  const { 
    categories, stockLogs, setModalState, 
    getCategoryTotalMeters, getCategoryTotalValue, 
    totalStockValue, totalStockMeters 
  } = useApp();

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");

  const filteredCategories = selectedCategoryFilter === "all" 
    ? categories 
    : categories.filter(c => c.id === selectedCategoryFilter);

  return (
    <div>
      {/* Subheader */}
      <div className="page-subheader">
        <div>
          <div className="breadcrumbs">
            <span>Dashboards</span>
            <span>&rsaquo;</span>
            <span className="current">Fabric Inventory & Rolls</span>
          </div>
          <h1 className="page-title">Inventory Management & Stock Math</h1>
          <p className="page-subtitle">
            3-State Physical Stock Tracking (Thaan Rolls • Loose Meters • Ready Packets)
          </p>
        </div>

        <div className="subheader-actions">
          <button 
            className="btn-secondary"
            onClick={() => setModalState(prev => ({ ...prev, convertStock: true }))}
          >
            <Repeat size={16} />
            <span>Stock Conversion Engine</span>
          </button>

          <button 
            className="btn-primary"
            onClick={() => setModalState(prev => ({ ...prev, addStock: true }))}
          >
            <Plus size={16} />
            <span>+ Add Fresh Factory Stock</span>
          </button>
        </div>
      </div>

      <div className="main-content">
        {/* Critical Math Banner / Rules Bar */}
        <div className="inventory-math-banner" style={{
          background: "linear-gradient(135deg, rgba(112, 71, 235, 0.08), rgba(147, 51, 234, 0.05))",
          border: "1px solid var(--primary-border)",
          borderRadius: "var(--radius-lg)",
          padding: "16px 22px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="stat-icon-circle stat-icon-purple" style={{ width: "40px", height: "40px" }}>
              <Info size={20} />
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--primary)" }}>
                Core Measurement Rules & Conversion Math
              </div>
              <div style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                1 Standard Suit = <strong>4 Meters</strong> • 1 Thaan (Roll) = <strong>6 Suits (24 Meters)</strong> • Ready Packets = <strong>4m Cut Suits</strong>
              </div>
            </div>
          </div>

          <div className="inventory-banner-stats" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: "var(--text-light)", textTransform: "uppercase" }}>Total Inventory Meters</div>
              <div style={{ fontSize: "17px", fontWeight: "800", color: "var(--text-main)" }}>
                {totalStockMeters.toLocaleString()} m (~{Math.floor(totalStockMeters / 4)} Suits)
              </div>
            </div>
            <div style={{ width: "1px", height: "30px", background: "var(--border-input)" }} />
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: "var(--text-light)", textTransform: "uppercase" }}>Total Valuation</div>
              <div style={{ fontSize: "17px", fontWeight: "800", color: "var(--accent-green)" }}>
                PKR {totalStockValue.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* 5 Fabric Category Stock Cards */}
        <div className="inventory-cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "22px", marginBottom: "30px" }}>
          {filteredCategories.map((cat) => {
            const thaan = cat.stock.thaan || 0;
            const loose = cat.stock.looseMeters || 0;
            const packets = cat.stock.packetSuits || 0;

            const thaanEquivalentMeters = thaan * 24;
            const thaanEquivalentSuits = thaan * 6;
            const packetEquivalentMeters = packets * 4;

            const totalMeters = thaanEquivalentMeters + loose + packetEquivalentMeters;
            const totalSuits = Math.floor(totalMeters / 4);
            const totalValue = totalMeters * cat.pricePerMeter;

            return (
              <div key={cat.id} className="zeno-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  {/* Category Header */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span 
                        style={{ 
                          width: "22px", height: "22px", borderRadius: "6px", 
                          backgroundColor: cat.colorCode, border: `2px solid ${cat.borderCode || "#cbd5e1"}` 
                        }} 
                      />
                      <div>
                        <h3 style={{ fontSize: "16px", fontWeight: "800" }}>{cat.name}</h3>
                        <span style={{ 
                          fontSize: "11px", fontWeight: "700", 
                          color: cat.tagColor, background: cat.tagBg, 
                          padding: "2px 8px", borderRadius: "4px" 
                        }}>
                          {cat.theme}
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--primary)" }}>
                        PKR {cat.pricePerMeter} <span style={{ fontSize: "11px", fontWeight: "500", color: "var(--text-light)" }}>/ meter</span>
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        PKR {cat.suitPrice} / suit (4m)
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "18px" }}>
                    {cat.description}
                  </p>

                  {/* 3 Physical States Grid */}
                  <div style={{ 
                    display: "grid", gridTemplateColumns: "repeat(3, 1fr)", 
                    gap: "10px", background: "var(--bg-subtle)", 
                    padding: "14px", borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-light)",
                    marginBottom: "18px"
                  }}>
                    {/* State A: Thaan (Rolls) */}
                    <div style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", color: "var(--primary)", marginBottom: "4px" }}>
                        <Package size={14} />
                        <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}>Thaan (Rolls)</span>
                      </div>
                      <div style={{ fontSize: "18px", fontWeight: "800", color: "var(--text-main)" }}>
                        {thaan}
                      </div>
                      <div style={{ fontSize: "10.5px", color: "var(--text-light)", marginTop: "2px" }}>
                        = {thaanEquivalentSuits} Suits<br />({thaanEquivalentMeters}m)
                      </div>
                    </div>

                    {/* State B: Loose Stock */}
                    <div style={{ textAlign: "center", borderLeft: "1px solid var(--border-input)", borderRight: "1px solid var(--border-input)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", color: "var(--accent-cyan)", marginBottom: "4px" }}>
                        <Scissors size={14} />
                        <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}>Loose Stock</span>
                      </div>
                      <div style={{ fontSize: "18px", fontWeight: "800", color: "var(--text-main)" }}>
                        {loose} <span style={{ fontSize: "11px" }}>m</span>
                      </div>
                      <div style={{ fontSize: "10.5px", color: "var(--text-light)", marginTop: "2px" }}>
                        Uncut Cloth<br />({Math.floor(loose / 4)} Suits + {loose % 4}m)
                      </div>
                    </div>

                    {/* State C: Packet Stock */}
                    <div style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", color: "var(--accent-green)", marginBottom: "4px" }}>
                        <Box size={14} />
                        <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}>Packets</span>
                      </div>
                      <div style={{ fontSize: "18px", fontWeight: "800", color: "var(--text-main)" }}>
                        {packets}
                      </div>
                      <div style={{ fontSize: "10.5px", color: "var(--text-light)", marginTop: "2px" }}>
                        Ready 4m Suits<br />({packetEquivalentMeters}m)
                      </div>
                    </div>
                  </div>

                  {/* Summary Bar for this category */}
                  <div style={{ 
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 14px", background: "var(--bg-card)",
                    border: "1px solid var(--border-card)", borderRadius: "var(--radius-sm)",
                    marginBottom: "18px"
                  }}>
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Total Equivalent Fabric</div>
                      <div style={{ fontSize: "14px", fontWeight: "800" }}>{totalMeters} Meters (~{totalSuits} Suits)</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Stock Valuation</div>
                      <div style={{ fontSize: "14px", fontWeight: "800", color: "var(--primary)" }}>
                        PKR {totalValue.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <button 
                    className="btn-secondary"
                    style={{ justifyContent: "center", padding: "8px" }}
                    onClick={() => setModalState(prev => ({ 
                      ...prev, 
                      convertStock: true, 
                      convertCategoryId: cat.id 
                    }))}
                  >
                    <Repeat size={14} />
                    <span>Convert Roll</span>
                  </button>

                  <button 
                    className="btn-primary"
                    style={{ justifyContent: "center", padding: "8px" }}
                    onClick={() => setModalState(prev => ({ 
                      ...prev, 
                      addStock: true, 
                      addStockCategoryId: cat.id 
                    }))}
                  >
                    <Plus size={14} />
                    <span>Adjust Stock</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stock Activity Log & Conversion Audit Table */}
        <div className="zeno-card">
          <div className="zeno-card-header">
            <div className="card-title-group">
              <h3 className="card-title">Stock History & Conversion Audit Trail</h3>
              <p className="card-subtitle">Real-time log of factory additions, thaan unpackings, and deductions</p>
            </div>
          </div>

          <div className="zeno-table-wrapper">
            <table className="zeno-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Fabric Category</th>
                  <th>Action Type</th>
                  <th>Description / Operation</th>
                  <th>Deductions</th>
                  <th>Additions / Value</th>
                </tr>
              </thead>
              <tbody>
                {stockLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>{log.timestamp}</td>
                    <td style={{ fontWeight: "600" }}>{log.categoryName}</td>
                    <td>
                      <span className={`badge ${
                        log.action === "convert" ? "badge-purple" : 
                        log.action === "sale" ? "badge-partial" : "badge-paid"
                      }`}>
                        {log.action.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontSize: "13px" }}>{log.details}</td>
                    <td style={{ color: "var(--accent-red)", fontWeight: "600", fontSize: "12.5px" }}>
                      {log.deductions}
                    </td>
                    <td style={{ color: "var(--accent-green)", fontWeight: "600", fontSize: "12.5px" }}>
                      {log.additions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
