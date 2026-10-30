import React, { useState, useEffect, useMemo, useRef } from "react";
import { RotateCcw, Package, Scissors, Plus, Minus } from "lucide-react";
import { useApp } from "../context/AppContext";
import { FABRIC_CATEGORIES } from "../data/initialData";
import { calculateClientPurchasedFabrics } from "../utils/clientHistory";

export const ReturnModal = () => {
  const { clients, categories, recordReturn, modalState, setModalState, addToast } = useApp();

  const [clientId, setClientId] = useState(modalState.returnClientId || clients[0]?.id || "");
  const [refundType, setRefundType] = useState("khata"); // "khata" or "cash"
  const [note, setNote] = useState("");
  const modalBodyRef = useRef(null);

  // Guarantee all 5 standard fabric collections are always available
  const activeCategories = useMemo(() => {
    return FABRIC_CATEGORIES.map(defaultCat => {
      const live = (categories || []).find(c => c.id === defaultCat.id || c.shortName?.toLowerCase() === defaultCat.shortName?.toLowerCase());
      return {
        ...defaultCat,
        ...(live || {}),
        stock: (live && live.stock) ? live.stock : { ...(defaultCat.initialStock || {}) }
      };
    });
  }, [categories]);

  // Quantities for 5 Standard Suits (4m each) returned
  const [suitQuantities, setSuitQuantities] = useState(() => {
    const initial = {};
    FABRIC_CATEGORIES.forEach(c => { initial[c.id] = ""; });
    return initial;
  });

  // Quantities for 5 TP Cuts (Loose Meters) returned
  const [tpQuantities, setTpQuantities] = useState(() => {
    const initial = {};
    FABRIC_CATEGORIES.forEach(c => { initial[c.id] = ""; });
    return initial;
  });

  useEffect(() => {
    if (modalState.returnClientId) {
      setClientId(modalState.returnClientId);
    }
  }, [modalState.returnClientId]);

  useEffect(() => {
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTop = 0;
    }
  }, []);

  const selectedClient = clients.find(c => c.id === clientId) || clients[0];

  // Calculate client's purchase history and holding for return eligibility
  const clientPurchasedMap = useMemo(() => {
    return calculateClientPurchasedFabrics(selectedClient);
  }, [selectedClient]);

  // Reset or clamp quantities when client changes
  useEffect(() => {
    setSuitQuantities(prev => {
      const next = { ...prev };
      activeCategories.forEach(cat => {
        const maxAllowed = clientPurchasedMap[cat.id]?.netSuitsHolding || 0;
        if (Number(next[cat.id]) > maxAllowed) {
          next[cat.id] = maxAllowed > 0 ? maxAllowed : "";
        }
      });
      return next;
    });
    setTpQuantities(prev => {
      const next = { ...prev };
      activeCategories.forEach(cat => {
        const maxAllowed = clientPurchasedMap[cat.id]?.netTpHolding || 0;
        if (Number(next[cat.id]) > maxAllowed) {
          next[cat.id] = maxAllowed > 0 ? maxAllowed : "";
        }
      });
      return next;
    });
  }, [clientId, clientPurchasedMap, activeCategories]);

  // Helper for TP abbreviation
  const getTpAbbr = (cat) => {
    const theme = (cat.theme || "").toLowerCase();
    const name = (cat.name || "").toLowerCase();
    if (theme.includes("light") || name.includes("light") || name.includes("off-white") || name.includes("cream")) {
      return "TPL";
    }
    if (theme.includes("dark") || name.includes("dark") || name.includes("black") || name.includes("navy")) {
      return "TPD";
    }
    if (theme.includes("wash") || name.includes("wash")) {
      return "TPW";
    }
    return "TP";
  };

  const getThemeTag = (cat) => {
    const theme = (cat.theme || "").toLowerCase();
    const name = (cat.name || "").toLowerCase();
    if (theme.includes("light") || name.includes("light")) return "Light";
    if (theme.includes("dark") || name.includes("dark")) return "Dark";
    if (theme.includes("wash") || name.includes("wash")) return "Wash";
    return cat.shortName || "Standard";
  };

  const handleSuitQtyChange = (cat, val) => {
    if (val === "") {
      setSuitQuantities(prev => ({ ...prev, [cat.id]: "" }));
      return;
    }
    const num = Math.max(0, parseInt(val, 10) || 0);
    const maxSuits = clientPurchasedMap[cat.id]?.netSuitsHolding || 0;

    if (num > maxSuits) {
      addToast(`Client only bought ${maxSuits} suits of ${cat.shortName} eligible for return!`, "warning");
      setSuitQuantities(prev => ({ ...prev, [cat.id]: maxSuits }));
    } else {
      setSuitQuantities(prev => ({ ...prev, [cat.id]: num }));
    }
  };

  const stepSuitQty = (cat, delta) => {
    const current = Number(suitQuantities[cat.id]) || 0;
    const maxSuits = clientPurchasedMap[cat.id]?.netSuitsHolding || 0;
    const next = Math.max(0, Math.min(maxSuits, current + delta));
    setSuitQuantities(prev => ({ ...prev, [cat.id]: next === 0 ? "" : next }));
  };

  const handleTpQtyChange = (cat, val) => {
    if (val === "") {
      setTpQuantities(prev => ({ ...prev, [cat.id]: "" }));
      return;
    }
    const num = Math.max(0, parseFloat(val) || 0);
    const maxTpMeters = clientPurchasedMap[cat.id]?.netTpHolding || 0;

    if (num > maxTpMeters) {
      addToast(`Client only bought ${maxTpMeters}m of TP ${cat.shortName} eligible for return!`, "warning");
      setTpQuantities(prev => ({ ...prev, [cat.id]: maxTpMeters }));
    } else {
      setTpQuantities(prev => ({ ...prev, [cat.id]: num }));
    }
  };

  const stepTpQty = (cat, delta) => {
    const current = Number(tpQuantities[cat.id]) || 0;
    const maxTpMeters = clientPurchasedMap[cat.id]?.netTpHolding || 0;
    const next = Math.max(0, Math.min(maxTpMeters, current + delta));
    setTpQuantities(prev => ({ ...prev, [cat.id]: next === 0 ? "" : next }));
  };

  const handleResetForm = () => {
    const resetS = {};
    const resetT = {};
    activeCategories.forEach(c => {
      resetS[c.id] = "";
      resetT[c.id] = "";
    });
    setSuitQuantities(resetS);
    setTpQuantities(resetT);
    setNote("");
  };

  const rowCalculations = useMemo(() => {
    return activeCategories.map(cat => {
      const suitQty = Number(suitQuantities[cat.id]) || 0;
      const tpQty = Number(tpQuantities[cat.id]) || 0;
      
      const ratePerMeter = Number(cat.pricePerMeter) || 400;
      const suitPrice = Number(cat.suitPrice) || (ratePerMeter * 4);
      
      const suitMeters = suitQty * 4;
      const suitTotal = suitQty * suitPrice;

      const tpMeters = tpQty;
      const tpTotal = tpQty * ratePerMeter;

      const holding = clientPurchasedMap[cat.id] || { netSuitsHolding: 0, netTpHolding: 0, totalSuitsBought: 0, totalTpMetersBought: 0 };
      const maxSuits = holding.netSuitsHolding || 0;
      const maxTpMeters = holding.netTpHolding || 0;

      return {
        category: cat,
        themeTag: getThemeTag(cat),
        tpAbbr: getTpAbbr(cat),
        suitQty,
        suitMeters,
        suitPrice,
        suitTotal,
        tpQty,
        tpMeters,
        ratePerMeter,
        tpTotal,
        maxSuits,
        maxTpMeters,
        holding,
        isSuitDisabled: maxSuits <= 0,
        isTpDisabled: maxTpMeters <= 0
      };
    });
  }, [activeCategories, suitQuantities, tpQuantities, clientPurchasedMap]);

  const totalSuitQty = rowCalculations.reduce((sum, r) => sum + r.suitQty, 0);
  const totalSuitMeters = rowCalculations.reduce((sum, r) => sum + r.suitMeters, 0);
  const totalSuitAmount = rowCalculations.reduce((sum, r) => sum + r.suitTotal, 0);

  const totalTpMeters = rowCalculations.reduce((sum, r) => sum + r.tpQty, 0);
  const totalTpAmount = rowCalculations.reduce((sum, r) => sum + r.tpTotal, 0);

  const totalReturnAmount = totalSuitAmount + totalTpAmount;

  // Calculate client's previous Khata balance
  const clientPastTxs = selectedClient?.transactions || [];
  const pastBilled = clientPastTxs.reduce((sum, t) => sum + (Number(t.totalBill) || 0), 0);
  const pastPaid = clientPastTxs.reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);
  const previousBalance = (Number(selectedClient?.openingBalance) || 0) + (pastBilled - pastPaid);
  
  const newBalanceAfterReturn = refundType === "khata" 
    ? (previousBalance - totalReturnAmount) 
    : previousBalance;

  const hasAtLeastOneItem = totalSuitQty > 0 || totalTpMeters > 0;

  const handleClose = () => {
    setModalState(prev => ({ ...prev, recordReturn: false, returnClientId: null }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!hasAtLeastOneItem) {
      addToast("Please enter at least 1 suit or TP meter to return.", "error");
      return;
    }

    // Verify all return items against purchased holding
    for (const r of rowCalculations) {
      if (r.suitQty > r.maxSuits) {
        addToast(`Cannot return ${r.suitQty} suits of ${r.category.shortName}! Client only bought ${r.maxSuits}.`, "error");
        return;
      }
      if (r.tpQty > r.maxTpMeters) {
        addToast(`Cannot return ${r.tpQty}m of TP ${r.category.shortName}! Client only bought ${r.maxTpMeters}m.`, "error");
        return;
      }
    }

    const returnItems = [];
    rowCalculations.forEach(r => {
      if (r.suitQty > 0) {
        returnItems.push({
          categoryId: r.category.id,
          categoryName: r.category.name,
          shortName: r.category.shortName,
          returnType: "suits",
          saleType: "suits",
          quantity: r.suitQty,
          meters: r.suitMeters,
          ratePerMeter: r.ratePerMeter,
          itemTotal: r.suitTotal
        });
      }
    });

    rowCalculations.forEach(r => {
      if (r.tpQty > 0) {
        returnItems.push({
          categoryId: r.category.id,
          categoryName: `TP - ${r.category.shortName}`,
          shortName: `${r.tpAbbr} ${r.category.shortName}`,
          returnType: "meters",
          saleType: "meters",
          quantity: r.tpQty,
          meters: r.tpMeters,
          ratePerMeter: r.ratePerMeter,
          itemTotal: r.tpTotal
        });
      }
    });

    const success = recordReturn({
      clientId,
      items: returnItems,
      refundType,
      note
    });

    if (success) {
      handleClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div 
        className="modal-container" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: "880px", width: "96vw", maxHeight: "96vh", display: "flex", flexDirection: "column" }}
      >
        <div className="modal-header" style={{ padding: "12px 18px", borderBottom: "1px solid var(--border-light)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="stat-icon-circle stat-icon-amber" style={{ width: "36px", height: "36px" }}>
              <RotateCcw size={18} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 className="modal-title" style={{ fontSize: "16px", fontWeight: "800" }}>
                  Record Stock Return / Wapsi
                </h3>
                <span className="badge-amber" style={{ fontSize: "10.5px", padding: "1px 7px" }}>
                  Purchase-Restricted (Bought Only)
                </span>
              </div>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>
                Client can ONLY return fabrics they actually bought from you. Non-purchased fabrics are disabled.
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={handleClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div 
            ref={modalBodyRef}
            className="modal-body" 
            style={{ overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {/* Client Select & Balance Overview */}
            <div style={{
              background: "var(--bg-subtle)",
              border: "1px solid var(--border-input)",
              borderRadius: "var(--radius-md)",
              padding: "8px 12px",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px"
            }}>
              <div style={{ flex: "1 1 280px" }}>
                <label className="form-label" style={{ fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
                  Select B2B Client (Wholesale Account)
                </label>
                <select 
                  className="form-select"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  required
                  style={{ fontWeight: "600", fontSize: "12.5px", padding: "5px 8px" }}
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.shopName} ({c.city})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "10px", 
                background: "var(--bg-card)", 
                padding: "5px 10px", 
                borderRadius: "var(--radius-sm)", 
                border: "1px solid var(--border-light)"
              }}>
                <div>
                  <div style={{ fontSize: "9.5px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Current Khata Due
                  </div>
                  <div style={{ 
                    fontSize: "13px", 
                    fontWeight: "800",
                    color: previousBalance > 0 ? "var(--accent-amber)" : "var(--accent-green)"
                  }}>
                    PKR {previousBalance.toLocaleString()}
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={handleResetForm}
                  className="btn-secondary" 
                  style={{ padding: "3px 7px", fontSize: "10.5px", gap: "3px" }}
                  title="Reset inputs"
                >
                  <RotateCcw size={11} />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* 10 Items Side-by-Side Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "10px" }}>
              
              {/* Suits Column */}
              <div style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-input)",
                borderRadius: "var(--radius-md)",
                overflow: "hidden"
              }}>
                <div style={{
                  padding: "7px 10px",
                  background: "var(--primary-light)",
                  borderBottom: "1px solid var(--primary-border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <Package size={14} color="var(--primary)" />
                    <strong style={{ fontSize: "12px", color: "var(--primary)" }}>
                      Standard Suits (4m Each) — 5 Colors
                    </strong>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--primary)" }}>
                    {totalSuitQty} Suits Return
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                  {rowCalculations.map((row, idx) => {
                    const isFilled = row.suitQty > 0;
                    const isDisabled = row.isSuitDisabled;

                    return (
                      <div 
                        key={"suit-" + row.category.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "6px 10px",
                          borderBottom: idx < rowCalculations.length - 1 ? "1px solid var(--border-light)" : "none",
                          background: isFilled ? "var(--primary-light)" : isDisabled ? "var(--bg-subtle)" : "transparent",
                          opacity: isDisabled ? 0.6 : 1
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "7px", minWidth: "140px" }}>
                          <span 
                            style={{ 
                              width: "12px", height: "12px", borderRadius: "50%", 
                              backgroundColor: row.category.colorCode || "#ccc",
                              border: "1px solid rgba(0,0,0,0.2)",
                              flexShrink: 0
                            }} 
                          />
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <span style={{ 
                                fontSize: "9px", fontWeight: "700", textTransform: "uppercase", 
                                background: row.themeTag === "Light" ? "#fef3c7" : row.themeTag === "Dark" ? "#1e293b" : "#e2e8f0",
                                color: row.themeTag === "Dark" ? "#fff" : "#92400e",
                                padding: "1px 4px", borderRadius: "3px"
                              }}>
                                {row.themeTag}
                              </span>
                              <strong style={{ fontSize: "11.5px", color: "var(--text-main)" }}>
                                {row.category.shortName}
                              </strong>
                            </div>
                            <div style={{ fontSize: "9.5px", color: isDisabled ? "var(--accent-red)" : "var(--text-muted)" }}>
                              {row.maxSuits > 0 
                                ? `Bought: ${row.holding.totalSuitsBought} (Max Return: ${row.maxSuits})` 
                                : "0 bought (Cannot return)"}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ width: "22px", height: "24px", padding: 0, justifyContent: "center" }}
                            onClick={() => stepSuitQty(row.category, -1)}
                            disabled={isDisabled || !row.suitQty}
                          >
                            <Minus size={10} />
                          </button>

                          <input 
                            type="number"
                            min="0"
                            max={row.maxSuits}
                            placeholder="0"
                            className="form-input"
                            disabled={isDisabled}
                            style={{ 
                              width: "42px", height: "24px", padding: "0 2px", 
                              textAlign: "center", fontWeight: "700", fontSize: "12px",
                              background: isDisabled ? "var(--bg-subtle)" : "var(--bg-input)"
                            }}
                            value={suitQuantities[row.category.id]}
                            onChange={(e) => handleSuitQtyChange(row.category, e.target.value)}
                          />

                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ width: "22px", height: "24px", padding: 0, justifyContent: "center" }}
                            onClick={() => stepSuitQty(row.category, 1)}
                            disabled={isDisabled || (row.suitQty >= row.maxSuits)}
                            title={row.suitQty >= row.maxSuits ? "Reached maximum return limit" : "Add 1"}
                          >
                            <Plus size={10} />
                          </button>

                          <div style={{ display: "flex", gap: "2px", marginLeft: "2px" }}>
                            {[1, 2, 5].filter(n => n <= row.maxSuits).map(n => (
                              <button
                                key={n}
                                type="button"
                                disabled={isDisabled}
                                style={{
                                  fontSize: "9px", padding: "1px 4px", borderRadius: "3px",
                                  border: "1px solid var(--border-input)", background: "var(--bg-card)",
                                  cursor: isDisabled ? "not-allowed" : "pointer", color: "var(--text-muted)"
                                }}
                                onClick={() => handleSuitQtyChange(row.category, n)}
                              >
                                {n}
                              </button>
                            ))}
                            {row.maxSuits > 0 && (
                              <button
                                type="button"
                                disabled={isDisabled}
                                style={{
                                  fontSize: "8.5px", padding: "1px 4px", borderRadius: "3px",
                                  border: "1px solid var(--accent-amber-border)", background: "var(--accent-amber-light)",
                                  cursor: isDisabled ? "not-allowed" : "pointer", color: "var(--accent-amber)", fontWeight: "700"
                                }}
                                onClick={() => handleSuitQtyChange(row.category, row.maxSuits)}
                                title={`Return all ${row.maxSuits} suits`}
                              >
                                All
                              </button>
                            )}
                          </div>
                        </div>

                        <div style={{ textAlign: "right", minWidth: "60px" }}>
                          <div style={{ fontSize: "11.5px", fontWeight: "800", color: isFilled ? "var(--primary)" : "var(--text-light)" }}>
                            PKR {row.suitTotal.toLocaleString()}
                          </div>
                          <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>
                            {row.suitMeters}m
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* TP Cuts Column */}
              <div style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-input)",
                borderRadius: "var(--radius-md)",
                overflow: "hidden"
              }}>
                <div style={{
                  padding: "7px 10px",
                  background: "#f0fdf4",
                  borderBottom: "1px solid var(--accent-green-border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <Scissors size={14} color="var(--accent-green)" />
                    <strong style={{ fontSize: "12px", color: "var(--accent-green)" }}>
                      TP Cuts (Than Piece — Loose Meters) — 5 Colors
                    </strong>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--accent-green)" }}>
                    {totalTpMeters}m TP Return
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                  {rowCalculations.map((row, idx) => {
                    const isFilled = row.tpQty > 0;
                    const isDisabled = row.isTpDisabled;

                    return (
                      <div 
                        key={"tp-" + row.category.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "6px 10px",
                          borderBottom: idx < rowCalculations.length - 1 ? "1px solid var(--border-light)" : "none",
                          background: isFilled ? "#f0fdf4" : isDisabled ? "var(--bg-subtle)" : "transparent",
                          opacity: isDisabled ? 0.6 : 1
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "7px", minWidth: "140px" }}>
                          <span 
                            style={{ 
                              width: "12px", height: "12px", borderRadius: "3px", 
                              backgroundColor: row.category.colorCode || "#ccc",
                              border: "1px solid rgba(0,0,0,0.2)",
                              flexShrink: 0
                            }} 
                          />
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <span style={{ 
                                fontSize: "9px", fontWeight: "800", 
                                background: "#dcfce7", color: "#15803d",
                                padding: "1px 4px", borderRadius: "3px"
                              }}>
                                {row.tpAbbr}
                              </span>
                              <strong style={{ fontSize: "11.5px", color: "var(--text-main)" }}>
                                {row.category.shortName}
                              </strong>
                            </div>
                            <div style={{ fontSize: "9.5px", color: isDisabled ? "var(--accent-red)" : "var(--text-muted)" }}>
                              {row.maxTpMeters > 0 
                                ? `Bought: ${row.holding.totalTpMetersBought}m (Max: ${row.maxTpMeters}m)` 
                                : "0m bought (Cannot return)"}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ width: "22px", height: "24px", padding: 0, justifyContent: "center" }}
                            onClick={() => stepTpQty(row.category, -1)}
                            disabled={isDisabled || !row.tpQty}
                          >
                            <Minus size={10} />
                          </button>

                          <input 
                            type="number"
                            min="0"
                            max={row.maxTpMeters}
                            step="any"
                            placeholder="0"
                            className="form-input"
                            disabled={isDisabled}
                            style={{ 
                              width: "42px", height: "24px", padding: "0 2px", 
                              textAlign: "center", fontWeight: "700", fontSize: "12px",
                              background: isDisabled ? "var(--bg-subtle)" : "var(--bg-input)"
                            }}
                            value={tpQuantities[row.category.id]}
                            onChange={(e) => handleTpQtyChange(row.category, e.target.value)}
                          />

                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ width: "22px", height: "24px", padding: 0, justifyContent: "center" }}
                            onClick={() => stepTpQty(row.category, 1)}
                            disabled={isDisabled || (row.tpQty >= row.maxTpMeters)}
                            title={row.tpQty >= row.maxTpMeters ? "Reached maximum return limit" : "Add 1m"}
                          >
                            <Plus size={10} />
                          </button>

                          <div style={{ display: "flex", gap: "2px", marginLeft: "2px" }}>
                            {[1, 2, 9].filter(n => n <= row.maxTpMeters).map(n => (
                              <button
                                key={n}
                                type="button"
                                disabled={isDisabled}
                                style={{
                                  fontSize: "9px", padding: "1px 4px", borderRadius: "3px",
                                  border: "1px solid var(--border-input)", background: "var(--bg-card)",
                                  cursor: isDisabled ? "not-allowed" : "pointer", color: "var(--text-muted)"
                                }}
                                onClick={() => handleTpQtyChange(row.category, n)}
                              >
                                {n}m
                              </button>
                            ))}
                            {row.maxTpMeters > 0 && (
                              <button
                                type="button"
                                disabled={isDisabled}
                                style={{
                                  fontSize: "8.5px", padding: "1px 4px", borderRadius: "3px",
                                  border: "1px solid var(--accent-green-border)", background: "var(--accent-green-light)",
                                  cursor: isDisabled ? "not-allowed" : "pointer", color: "var(--accent-green)", fontWeight: "700"
                                }}
                                onClick={() => handleTpQtyChange(row.category, row.maxTpMeters)}
                                title={`Return all ${row.maxTpMeters}m`}
                              >
                                All
                              </button>
                            )}
                          </div>
                        </div>

                        <div style={{ textAlign: "right", minWidth: "60px" }}>
                          <div style={{ fontSize: "11.5px", fontWeight: "800", color: isFilled ? "var(--accent-green)" : "var(--text-light)" }}>
                            PKR {row.tpTotal.toLocaleString()}
                          </div>
                          <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>
                            {row.tpQty || 0}m
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Return Summary Box */}
            <div style={{
              background: "var(--bg-card)",
              border: "2px solid var(--accent-amber-border)",
              borderRadius: "var(--radius-md)",
              padding: "10px 12px",
              display: "flex",
              flexDirection: "column",
              gap: "6px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12.5px", fontWeight: "700" }}>Total Return Value (Credit):</span>
                <span style={{ fontSize: "15px", fontWeight: "800", color: "var(--accent-amber)" }}>
                  -PKR {totalReturnAmount.toLocaleString()} ({totalSuitQty} Suits + {totalTpMeters}m TP)
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed var(--border-light)", paddingTop: "5px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Previous Balance (Pichla Baqaya):</span>
                <strong style={{ fontSize: "13px" }}>PKR {previousBalance.toLocaleString()}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-light)", paddingTop: "5px" }}>
                <span style={{ fontSize: "13px", fontWeight: "800", color: "var(--primary)" }}>New Net Balance After Return:</span>
                <span style={{ fontSize: "16px", fontWeight: "900", color: "var(--primary)" }}>
                  PKR {newBalanceAfterReturn.toLocaleString()}
                </span>
              </div>

              {/* Refund method radio */}
              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "2px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11.5px", cursor: "pointer" }}>
                  <input 
                    type="radio" 
                    name="refundType" 
                    value="khata" 
                    checked={refundType === "khata"} 
                    onChange={() => setRefundType("khata")} 
                  />
                  <span>Adjust in Khata Ledger (Pichla Baqaya Kam Karein)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11.5px", cursor: "pointer" }}>
                  <input 
                    type="radio" 
                    name="refundType" 
                    value="cash" 
                    checked={refundType === "cash"} 
                    onChange={() => setRefundType("cash")} 
                  />
                  <span>Cash Refund to Customer</span>
                </label>
              </div>
            </div>

            {/* Note input */}
            <input 
              type="text" 
              className="form-input" 
              placeholder="Reason for return / defect notes (optional)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ fontSize: "11.5px", padding: "5px 8px" }}
            />
          </div>

          <div className="modal-footer" style={{ padding: "8px 16px" }}>
            <button type="button" className="btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-warning"
              disabled={!hasAtLeastOneItem}
              style={{ minWidth: "250px", justifyContent: "center", fontSize: "12.5px" }}
            >
              Confirm Return (+{totalSuitMeters + totalTpMeters}m to Stock • PKR {totalReturnAmount.toLocaleString()})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
