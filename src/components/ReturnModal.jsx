import React, { useState, useEffect, useMemo, useRef } from "react";
import { RotateCcw, Package, Scissors, Plus, Minus } from "lucide-react";
import { useApp } from "../context/AppContext";
import { FABRIC_CATEGORIES, FABRIC_GROUPS } from "../data/initialData";
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

  // Client's purchase history (for reference, but NOT restricting return)
  const clientPurchasedMap = useMemo(() => {
    return calculateClientPurchasedFabrics(selectedClient);
  }, [selectedClient]);

  // Suit Quantity Handlers - Restriction removed so any quantity can be returned
  const handleSuitQtyChange = (cat, val) => {
    if (val === "") {
      setSuitQuantities(prev => ({ ...prev, [cat.id]: "" }));
      return;
    }
    const num = Math.max(0, parseInt(val, 10) || 0);
    setSuitQuantities(prev => ({ ...prev, [cat.id]: num }));
  };

  const stepSuitQty = (cat, delta) => {
    const current = Number(suitQuantities[cat.id]) || 0;
    const next = Math.max(0, current + delta);
    setSuitQuantities(prev => ({ ...prev, [cat.id]: next === 0 ? "" : next }));
  };

  // TP Quantity Handlers - Restriction removed so any quantity can be returned
  const handleTpQtyChange = (cat, val) => {
    if (val === "") {
      setTpQuantities(prev => ({ ...prev, [cat.id]: "" }));
      return;
    }
    const num = Math.max(0, parseFloat(val) || 0);
    setTpQuantities(prev => ({ ...prev, [cat.id]: num }));
  };

  const stepTpQty = (cat, delta) => {
    const current = Number(tpQuantities[cat.id]) || 0;
    const next = Math.max(0, current + delta);
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

  // Grouped Calculations for 3 Lines (Light Boski, Dark Boski, Washing Wear)
  const groupCalculations = useMemo(() => {
    return FABRIC_GROUPS.map(group => {
      const groupCategories = group.categoryIds.map(catId => {
        const cat = activeCategories.find(c => c.id === catId) || FABRIC_CATEGORIES.find(c => c.id === catId);
        const suitQty = Number(suitQuantities[cat.id]) || 0;
        const tpQty = Number(tpQuantities[cat.id]) || 0;
        const ratePerMeter = group.ratePerMeter || Number(cat.pricePerMeter) || 400;
        const suitPrice = group.suitPrice || (ratePerMeter * 4);
        const suitMeters = suitQty * 4;
        const suitTotal = suitQty * suitPrice;
        const tpMeters = tpQty;
        const tpTotal = tpQty * ratePerMeter;
        const holding = clientPurchasedMap[cat.id] || { netSuitsHolding: 0, netTpHolding: 0, totalSuitsBought: 0, totalTpMetersBought: 0 };

        return {
          category: cat,
          suitQty,
          tpQty,
          suitMeters,
          suitPrice,
          suitTotal,
          tpMeters,
          ratePerMeter,
          tpTotal,
          holding,
          isSuitDisabled: false,
          isTpDisabled: false,
          maxSuits: 9999,
          maxTpMeters: 9999
        };
      });

      const suitQty = groupCategories.reduce((sum, c) => sum + c.suitQty, 0);
      const suitMeters = groupCategories.reduce((sum, c) => sum + c.suitMeters, 0);
      const suitTotal = groupCategories.reduce((sum, c) => sum + c.suitTotal, 0);

      const tpQty = groupCategories.reduce((sum, c) => sum + c.tpQty, 0);
      const tpMeters = groupCategories.reduce((sum, c) => sum + c.tpMeters, 0);
      const tpTotal = groupCategories.reduce((sum, c) => sum + c.tpTotal, 0);

      return {
        ...group,
        categories: groupCategories,
        suitQty,
        suitMeters,
        suitTotal,
        tpQty,
        tpMeters,
        tpTotal
      };
    });
  }, [activeCategories, suitQuantities, tpQuantities, clientPurchasedMap]);

  // Flattened active category rows
  const allCategoryRows = useMemo(() => {
    return groupCalculations.flatMap(g => g.categories);
  }, [groupCalculations]);

  const totalSuitQty = groupCalculations.reduce((sum, g) => sum + g.suitQty, 0);
  const totalSuitMeters = groupCalculations.reduce((sum, g) => sum + g.suitMeters, 0);
  const totalSuitAmount = groupCalculations.reduce((sum, g) => sum + g.suitTotal, 0);

  const totalTpMeters = groupCalculations.reduce((sum, g) => sum + g.tpMeters, 0);
  const totalTpAmount = groupCalculations.reduce((sum, g) => sum + g.tpTotal, 0);

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

    const returnItems = [];
    allCategoryRows.forEach(r => {
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

    allCategoryRows.forEach(r => {
      if (r.tpQty > 0) {
        returnItems.push({
          categoryId: r.category.id,
          categoryName: `TP - ${r.category.shortName}`,
          shortName: `${r.category.shortName} TP`,
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
                  Stock Return (Wapsi Allowed)
                </span>
              </div>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>
                Return fabrics to restock inventory and credit client's khata account. Restrictions removed.
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

            {/* 6 Lines Grid (3 Lines Suits, 3 Lines TP) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "10px" }}>
              
              {/* COLUMN 1: 3 LINES SUITS RETURN */}
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
                      Standard Suits (4m Each) — 3 Lines
                    </strong>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--primary)" }}>
                    {totalSuitQty} Suits Return &bull; PKR {totalSuitAmount.toLocaleString()}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                  {groupCalculations.map((group, idx) => {
                    const isFilled = group.suitQty > 0;

                    return (
                      <div 
                        key={"return-suit-" + group.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                          padding: "8px 10px",
                          borderBottom: idx < groupCalculations.length - 1 ? "1px solid var(--border-light)" : "none",
                          background: isFilled ? "rgba(109, 40, 217, 0.05)" : "transparent",
                          transition: "background var(--transition-fast)"
                        }}
                      >
                        {/* Line Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{
                              fontSize: "9px", fontWeight: "700", textTransform: "uppercase",
                              background: group.theme === "Light" ? "#fef3c7" : group.theme === "Dark" ? "#1e293b" : "#e2e8f0",
                              color: group.theme === "Dark" ? "#fff" : "#92400e",
                              padding: "1px 5px", borderRadius: "3px"
                            }}>
                              {group.theme}
                            </span>
                            <strong style={{ fontSize: "12px", color: "var(--text-main)" }}>
                              {group.title}
                            </strong>
                            <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                              ({group.colorsText} &bull; PKR {group.suitPrice.toLocaleString()}/suit)
                            </span>
                          </div>

                          <div style={{ textAlign: "right" }}>
                            <span style={{ 
                              fontSize: "12px", 
                              fontWeight: "800", 
                              color: isFilled ? "var(--primary)" : "var(--text-light)" 
                            }}>
                              {isFilled ? `PKR ${group.suitTotal.toLocaleString()}` : "PKR 0"}
                            </span>
                            {isFilled && (
                              <span style={{ fontSize: "9.5px", color: "var(--text-muted)", marginLeft: "4px" }}>
                                ({group.suitQty} Suits)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Individual Color Counters */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {group.categories.map(catRow => {
                            const cat = catRow.category;
                            const isCatFilled = catRow.suitQty > 0;

                            return (
                              <div 
                                key={"return-suit-sub-" + cat.id}
                                style={{
                                  flex: "1 1 calc(50% - 4px)",
                                  minWidth: "155px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "4px 7px",
                                  background: isCatFilled ? "var(--primary-light)" : "var(--bg-subtle)",
                                  borderRadius: "var(--radius-sm)",
                                  border: isCatFilled ? "1px solid var(--primary-border)" : "1px solid var(--border-light)"
                                }}
                              >
                                {/* Color Button: Click to add 1 suit return */}
                                <button
                                  type="button"
                                  onClick={() => stepSuitQty(cat, 1)}
                                  title={`Click to add 1 ${cat.shortName} suit return`}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    background: "none",
                                    border: "none",
                                    padding: "1px 0",
                                    cursor: "pointer",
                                    textAlign: "left"
                                  }}
                                >
                                  <span style={{
                                    width: "11px",
                                    height: "11px",
                                    borderRadius: "50%",
                                    backgroundColor: cat.colorCode || "#ccc",
                                    border: "1px solid rgba(0,0,0,0.25)",
                                    flexShrink: 0
                                  }} />
                                  <div>
                                    <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-main)", lineHeight: 1.1 }}>
                                      {cat.shortName}
                                    </div>
                                    <div style={{ fontSize: "8.5px", color: "var(--accent-amber)", lineHeight: 1 }}>
                                      Return Wapsi
                                    </div>
                                  </div>
                                </button>

                                {/* Stepper & Input */}
                                <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ width: "20px", height: "22px", padding: 0, justifyContent: "center" }}
                                    onClick={() => stepSuitQty(cat, -1)}
                                    disabled={!catRow.suitQty}
                                  >
                                    <Minus size={9} />
                                  </button>

                                  <input 
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    className="form-input"
                                    style={{ 
                                      width: "38px", height: "22px", padding: "0 2px", 
                                      textAlign: "center", fontWeight: "700", fontSize: "11.5px"
                                    }}
                                    value={suitQuantities[cat.id]}
                                    onChange={(e) => handleSuitQtyChange(cat, e.target.value)}
                                  />

                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ width: "20px", height: "22px", padding: 0, justifyContent: "center" }}
                                    onClick={() => stepSuitQty(cat, 1)}
                                  >
                                    <Plus size={9} />
                                  </button>

                                  {/* Quick chips */}
                                  <div style={{ display: "flex", gap: "2px", marginLeft: "1px" }}>
                                    {[1, 2, 5].map(n => (
                                      <button
                                        key={n}
                                        type="button"
                                        style={{
                                          fontSize: "8px", padding: "1px 3px", borderRadius: "2px",
                                          border: "1px solid var(--border-input)", background: "var(--bg-card)",
                                          cursor: "pointer", color: "var(--text-muted)"
                                        }}
                                        onClick={() => handleSuitQtyChange(cat, n)}
                                      >
                                        +{n}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* COLUMN 2: 3 LINES TP CUTS RETURN */}
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
                      TP Cuts (Than Piece — Loose Meters) — 3 Lines
                    </strong>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--accent-green)" }}>
                    {totalTpMeters}m TP Return &bull; PKR {totalTpAmount.toLocaleString()}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                  {groupCalculations.map((group, idx) => {
                    const isFilled = group.tpQty > 0;

                    return (
                      <div 
                        key={"return-tp-" + group.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                          padding: "8px 10px",
                          borderBottom: idx < groupCalculations.length - 1 ? "1px solid var(--border-light)" : "none",
                          background: isFilled ? "#f0fdf4" : "transparent",
                          transition: "background var(--transition-fast)"
                        }}
                      >
                        {/* Line Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{
                              fontSize: "9px", fontWeight: "800",
                              background: "#dcfce7", color: "#15803d",
                              padding: "1px 5px", borderRadius: "3px"
                            }}>
                              {group.tpAbbr}
                            </span>
                            <strong style={{ fontSize: "12px", color: "var(--text-main)" }}>
                              {group.title}
                            </strong>
                            <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                              ({group.colorsText} &bull; PKR {group.ratePerMeter}/m)
                            </span>
                          </div>

                          <div style={{ textAlign: "right" }}>
                            <span style={{ 
                              fontSize: "12px", 
                              fontWeight: "800", 
                              color: isFilled ? "var(--accent-green)" : "var(--text-light)" 
                            }}>
                              {isFilled ? `PKR ${group.tpTotal.toLocaleString()}` : "PKR 0"}
                            </span>
                            {isFilled && (
                              <span style={{ fontSize: "9.5px", color: "var(--text-muted)", marginLeft: "4px" }}>
                                ({group.tpQty}m TP)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Individual Color Counters */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {group.categories.map(catRow => {
                            const cat = catRow.category;
                            const isCatFilled = catRow.tpQty > 0;

                            return (
                              <div 
                                key={"return-tp-sub-" + cat.id}
                                style={{
                                  flex: "1 1 calc(50% - 4px)",
                                  minWidth: "155px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "4px 7px",
                                  background: isCatFilled ? "rgba(255,255,255,0.85)" : "var(--bg-subtle)",
                                  borderRadius: "var(--radius-sm)",
                                  border: isCatFilled ? "1px solid var(--accent-green-border)" : "1px solid var(--border-light)"
                                }}
                              >
                                {/* Color Button: Click to add 4m */}
                                <button
                                  type="button"
                                  onClick={() => stepTpQty(cat, 4)}
                                  title={`Click to add 4m of ${cat.shortName} return`}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    background: "none",
                                    border: "none",
                                    padding: "1px 0",
                                    cursor: "pointer",
                                    textAlign: "left"
                                  }}
                                >
                                  <span style={{
                                    width: "11px",
                                    height: "11px",
                                    borderRadius: "3px",
                                    backgroundColor: cat.colorCode || "#ccc",
                                    border: "1px solid rgba(0,0,0,0.25)",
                                    flexShrink: 0
                                  }} />
                                  <div>
                                    <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-main)", lineHeight: 1.1 }}>
                                      {cat.shortName}
                                    </div>
                                    <div style={{ fontSize: "8.5px", color: "var(--accent-amber)", lineHeight: 1 }}>
                                      Return Wapsi
                                    </div>
                                  </div>
                                </button>

                                {/* Stepper & Input */}
                                <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ width: "20px", height: "22px", padding: 0, justifyContent: "center" }}
                                    onClick={() => stepTpQty(cat, -1)}
                                    disabled={!catRow.tpQty}
                                  >
                                    <Minus size={9} />
                                  </button>

                                  <input 
                                    type="number"
                                    min="0"
                                    step="any"
                                    placeholder="0"
                                    className="form-input"
                                    style={{ 
                                      width: "38px", height: "22px", padding: "0 2px", 
                                      textAlign: "center", fontWeight: "700", fontSize: "11.5px"
                                    }}
                                    value={tpQuantities[cat.id]}
                                    onChange={(e) => handleTpQtyChange(cat, e.target.value)}
                                  />

                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ width: "20px", height: "22px", padding: 0, justifyContent: "center" }}
                                    onClick={() => stepTpQty(cat, 1)}
                                  >
                                    <Plus size={9} />
                                  </button>

                                  {/* Quick chips */}
                                  <div style={{ display: "flex", gap: "2px", marginLeft: "1px" }}>
                                    {[4, 12, 24].map(n => (
                                      <button
                                        key={n}
                                        type="button"
                                        style={{
                                          fontSize: "8px", padding: "1px 3px", borderRadius: "2px",
                                          border: "1px solid var(--border-input)", background: "var(--bg-card)",
                                          cursor: "pointer", color: "var(--text-muted)"
                                        }}
                                        onClick={() => handleTpQtyChange(cat, n)}
                                      >
                                        {n}m
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
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
