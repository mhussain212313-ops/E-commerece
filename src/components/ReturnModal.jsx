import React, { useState, useEffect, useMemo, useRef } from "react";
import { RotateCcw, Package, Scissors, Plus, Minus } from "lucide-react";
import { useApp } from "../context/AppContext";
import { FABRIC_CATEGORIES } from "../data/initialData";

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

  const handleSuitQtyChange = (catId, val) => {
    const clean = val === "" ? "" : Math.max(0, parseInt(val, 10) || 0);
    setSuitQuantities(prev => ({ ...prev, [catId]: clean }));
  };

  const stepSuitQty = (catId, delta) => {
    setSuitQuantities(prev => {
      const current = Number(prev[catId]) || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [catId]: next === 0 ? "" : next };
    });
  };

  const handleTpQtyChange = (catId, val) => {
    const clean = val === "" ? "" : Math.max(0, parseFloat(val) || 0);
    setTpQuantities(prev => ({ ...prev, [catId]: clean }));
  };

  const stepTpQty = (catId, delta) => {
    setTpQuantities(prev => {
      const current = Number(prev[catId]) || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [catId]: next === 0 ? "" : next };
    });
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
        tpTotal
      };
    });
  }, [activeCategories, suitQuantities, tpQuantities]);

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
        style={{ maxWidth: "860px", width: "95vw", maxHeight: "95vh", display: "flex", flexDirection: "column" }}
      >
        <div className="modal-header" style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-light)" }}>
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
                  10 Items Return Slip
                </span>
              </div>
              <p style={{ fontSize: "11.5px", color: "var(--text-muted)", margin: 0 }}>
                Restores returned suits and TP cuts directly back to live stock & adjusts Khata
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={handleClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div 
            ref={modalBodyRef}
            className="modal-body" 
            style={{ overflowY: "auto", padding: "14px 18px", display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {/* Client Select & Balance Overview */}
            <div style={{
              background: "var(--bg-subtle)",
              border: "1px solid var(--border-input)",
              borderRadius: "var(--radius-md)",
              padding: "10px 14px",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px"
            }}>
              <div style={{ flex: "1 1 280px" }}>
                <label className="form-label" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>
                  Select B2B Client (Wholesale Account)
                </label>
                <select 
                  className="form-select"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  required
                  style={{ fontWeight: "600", fontSize: "13px", padding: "6px 10px" }}
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
                gap: "12px", 
                background: "var(--bg-card)", 
                padding: "6px 12px", 
                borderRadius: "var(--radius-sm)", 
                border: "1px solid var(--border-light)"
              }}>
                <div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Current Khata Due
                  </div>
                  <div style={{ 
                    fontSize: "13.5px", 
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
                  style={{ padding: "4px 8px", fontSize: "11px", gap: "4px" }}
                  title="Reset inputs"
                >
                  <RotateCcw size={12} />
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
                  padding: "8px 12px",
                  background: "var(--primary-light)",
                  borderBottom: "1px solid var(--primary-border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Package size={15} color="var(--primary)" />
                    <strong style={{ fontSize: "12.5px", color: "var(--primary)" }}>
                      Standard Suits (4m Each) — 5 Colors
                    </strong>
                  </div>
                  <span style={{ fontSize: "11.5px", fontWeight: "700", color: "var(--primary)" }}>
                    {totalSuitQty} Suits Return
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                  {rowCalculations.map((row, idx) => {
                    const isFilled = row.suitQty > 0;
                    return (
                      <div 
                        key={"suit-" + row.category.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "7px 12px",
                          borderBottom: idx < rowCalculations.length - 1 ? "1px solid var(--border-light)" : "none",
                          background: isFilled ? "var(--primary-light)" : "transparent"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "135px" }}>
                          <span 
                            style={{ 
                              width: "13px", height: "13px", borderRadius: "50%", 
                              backgroundColor: row.category.colorCode || "#ccc",
                              border: "1px solid rgba(0,0,0,0.2)",
                              flexShrink: 0
                            }} 
                          />
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <span style={{ 
                                fontSize: "9.5px", fontWeight: "700", textTransform: "uppercase", 
                                background: row.themeTag === "Light" ? "#fef3c7" : row.themeTag === "Dark" ? "#1e293b" : "#e2e8f0",
                                color: row.themeTag === "Dark" ? "#fff" : "#92400e",
                                padding: "1px 4px", borderRadius: "3px"
                              }}>
                                {row.themeTag}
                              </span>
                              <strong style={{ fontSize: "12px", color: "var(--text-main)" }}>
                                {row.category.shortName}
                              </strong>
                            </div>
                            <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                              PKR {row.suitPrice.toLocaleString()} / suit
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ width: "24px", height: "26px", padding: 0, justifyContent: "center" }}
                            onClick={() => stepSuitQty(row.category.id, -1)}
                            disabled={!row.suitQty}
                          >
                            <Minus size={11} />
                          </button>

                          <input 
                            type="number"
                            min="0"
                            placeholder="0"
                            className="form-input"
                            style={{ 
                              width: "46px", height: "26px", padding: "0 2px", 
                              textAlign: "center", fontWeight: "700", fontSize: "12.5px" 
                            }}
                            value={suitQuantities[row.category.id]}
                            onChange={(e) => handleSuitQtyChange(row.category.id, e.target.value)}
                          />

                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ width: "24px", height: "26px", padding: 0, justifyContent: "center" }}
                            onClick={() => stepSuitQty(row.category.id, 1)}
                          >
                            <Plus size={11} />
                          </button>

                          <div style={{ display: "flex", gap: "2px", marginLeft: "2px" }}>
                            {[1, 2, 5].map(n => (
                              <button
                                key={n}
                                type="button"
                                style={{
                                  fontSize: "9.5px", padding: "2px 4px", borderRadius: "3px",
                                  border: "1px solid var(--border-input)", background: "var(--bg-card)",
                                  cursor: "pointer", color: "var(--text-muted)"
                                }}
                                onClick={() => handleSuitQtyChange(row.category.id, n)}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div style={{ textAlign: "right", minWidth: "65px" }}>
                          <div style={{ fontSize: "12.5px", fontWeight: "800", color: isFilled ? "var(--primary)" : "var(--text-light)" }}>
                            PKR {row.suitTotal.toLocaleString()}
                          </div>
                          <div style={{ fontSize: "9.5px", color: "var(--text-muted)" }}>
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
                  padding: "8px 12px",
                  background: "#f0fdf4",
                  borderBottom: "1px solid var(--accent-green-border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Scissors size={15} color="var(--accent-green)" />
                    <strong style={{ fontSize: "12.5px", color: "var(--accent-green)" }}>
                      TP Cuts (Than Piece — Loose Meters) — 5 Colors
                    </strong>
                  </div>
                  <span style={{ fontSize: "11.5px", fontWeight: "700", color: "var(--accent-green)" }}>
                    {totalTpMeters}m TP Return
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                  {rowCalculations.map((row, idx) => {
                    const isFilled = row.tpQty > 0;
                    return (
                      <div 
                        key={"tp-" + row.category.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "7px 12px",
                          borderBottom: idx < rowCalculations.length - 1 ? "1px solid var(--border-light)" : "none",
                          background: isFilled ? "#f0fdf4" : "transparent"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "135px" }}>
                          <span 
                            style={{ 
                              width: "13px", height: "13px", borderRadius: "3px", 
                              backgroundColor: row.category.colorCode || "#ccc",
                              border: "1px solid rgba(0,0,0,0.2)",
                              flexShrink: 0
                            }} 
                          />
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <span style={{ 
                                fontSize: "9.5px", fontWeight: "800", 
                                background: "#dcfce7", color: "#15803d",
                                padding: "1px 5px", borderRadius: "3px"
                              }}>
                                {row.tpAbbr}
                              </span>
                              <strong style={{ fontSize: "12px", color: "var(--text-main)" }}>
                                {row.category.shortName}
                              </strong>
                            </div>
                            <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                              PKR {row.ratePerMeter}/meter
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ width: "24px", height: "26px", padding: 0, justifyContent: "center" }}
                            onClick={() => stepTpQty(row.category.id, -1)}
                            disabled={!row.tpQty}
                          >
                            <Minus size={11} />
                          </button>

                          <input 
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            className="form-input"
                            style={{ 
                              width: "46px", height: "26px", padding: "0 2px", 
                              textAlign: "center", fontWeight: "700", fontSize: "12.5px" 
                            }}
                            value={tpQuantities[row.category.id]}
                            onChange={(e) => handleTpQtyChange(row.category.id, e.target.value)}
                          />

                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ width: "24px", height: "26px", padding: 0, justifyContent: "center" }}
                            onClick={() => stepTpQty(row.category.id, 1)}
                          >
                            <Plus size={11} />
                          </button>

                          <div style={{ display: "flex", gap: "2px", marginLeft: "2px" }}>
                            {[1, 2, 9].map(n => (
                              <button
                                key={n}
                                type="button"
                                style={{
                                  fontSize: "9.5px", padding: "2px 4px", borderRadius: "3px",
                                  border: "1px solid var(--border-input)", background: "var(--bg-card)",
                                  cursor: "pointer", color: "var(--text-muted)"
                                }}
                                onClick={() => handleTpQtyChange(row.category.id, n)}
                              >
                                {n}m
                              </button>
                            ))}
                          </div>
                        </div>

                        <div style={{ textAlign: "right", minWidth: "65px" }}>
                          <div style={{ fontSize: "12.5px", fontWeight: "800", color: isFilled ? "var(--accent-green)" : "var(--text-light)" }}>
                            PKR {row.tpTotal.toLocaleString()}
                          </div>
                          <div style={{ fontSize: "9.5px", color: "var(--text-muted)" }}>
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
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: "700" }}>Total Return Value (Credit):</span>
                <span style={{ fontSize: "16px", fontWeight: "800", color: "var(--accent-amber)" }}>
                  -PKR {totalReturnAmount.toLocaleString()} ({totalSuitQty} Suits + {totalTpMeters}m TP)
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed var(--border-light)", paddingTop: "6px" }}>
                <span style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>Previous Balance (Pichla Baqaya):</span>
                <strong style={{ fontSize: "13.5px" }}>PKR {previousBalance.toLocaleString()}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-light)", paddingTop: "6px" }}>
                <span style={{ fontSize: "13.5px", fontWeight: "800", color: "var(--primary)" }}>New Net Balance After Return:</span>
                <span style={{ fontSize: "17px", fontWeight: "900", color: "var(--primary)" }}>
                  PKR {newBalanceAfterReturn.toLocaleString()}
                </span>
              </div>

              {/* Refund method radio */}
              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "4px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer" }}>
                  <input 
                    type="radio" 
                    name="refundType" 
                    value="khata" 
                    checked={refundType === "khata"} 
                    onChange={() => setRefundType("khata")} 
                  />
                  <span>Adjust in Khata Ledger (Pichla Baqaya Kam Karein)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer" }}>
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
              style={{ fontSize: "12px", padding: "6px 10px" }}
            />
          </div>

          <div className="modal-footer" style={{ padding: "10px 18px" }}>
            <button type="button" className="btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-warning"
              disabled={!hasAtLeastOneItem}
              style={{ minWidth: "250px", justifyContent: "center", fontSize: "13px" }}
            >
              Confirm Return (+{totalSuitMeters + totalTpMeters}m to Stock • PKR {totalReturnAmount.toLocaleString()})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
