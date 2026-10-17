import React, { useState, useEffect, useMemo } from "react";
import { RotateCcw, Package, Scissors, DollarSign, AlertCircle, CheckCircle2, Info, ArrowRight } from "lucide-react";
import { useApp } from "../context/AppContext";

export const ReturnModal = () => {
  const { clients, categories, recordReturn, modalState, setModalState } = useApp();

  const [clientId, setClientId] = useState(modalState.returnClientId || clients[0]?.id || "");
  const [categoryId, setCategoryId] = useState("");
  const [returnType, setReturnType] = useState("suits"); // "suits" or "meters"
  const [quantity, setQuantity] = useState(1);
  const [ratePerMeter, setRatePerMeter] = useState(400);
  const [refundType, setRefundType] = useState("khata"); // "khata" or "cash"
  const [note, setNote] = useState("");

  useEffect(() => {
    if (modalState.returnClientId) {
      setClientId(modalState.returnClientId);
    }
  }, [modalState.returnClientId]);

  const selectedClient = clients.find(c => c.id === clientId) || clients[0];

  // 1. Calculate the fabrics that THIS selected client has ACTUALLY purchased
  const clientPurchasedFabrics = useMemo(() => {
    if (!selectedClient) return {};

    const map = {};
    const txs = selectedClient.transactions || [];

    txs.forEach(tx => {
      // Regular Wholesale Sales
      if (tx.saleType !== "payment" && tx.saleType !== "return") {
        if (Array.isArray(tx.items) && tx.items.length > 0) {
          tx.items.forEach(item => {
            const catId = item.categoryId;
            if (!map[catId]) {
              map[catId] = {
                categoryId: catId,
                categoryName: item.categoryName,
                shortName: item.shortName,
                totalSuitsBought: 0,
                totalMetersBought: 0,
                totalSuitsReturned: 0,
                totalMetersReturned: 0,
                lastRate: Number(item.ratePerMeter) || 400
              };
            }
            if (item.saleType === "suits") {
              map[catId].totalSuitsBought += Number(item.quantity || 0);
              map[catId].totalMetersBought += Number(item.meters || (item.quantity * 4) || 0);
            } else {
              map[catId].totalMetersBought += Number(item.meters || item.quantity || 0);
              map[catId].totalSuitsBought += Math.floor(Number(item.meters || item.quantity || 0) / 4);
            }
            if (item.ratePerMeter) {
              map[catId].lastRate = Number(item.ratePerMeter);
            }
          });
        } else if (tx.categoryId) {
          const catId = tx.categoryId;
          if (!map[catId]) {
            map[catId] = {
              categoryId: catId,
              categoryName: tx.categoryName,
              shortName: tx.shortName || tx.categoryName,
              totalSuitsBought: 0,
              totalMetersBought: 0,
              totalSuitsReturned: 0,
              totalMetersReturned: 0,
              lastRate: Number(tx.ratePerMeter) || 400
            };
          }
          if (tx.saleType === "suits") {
            map[catId].totalSuitsBought += Number(tx.quantity || 0);
            map[catId].totalMetersBought += Number(tx.meters || (tx.quantity * 4) || 0);
          } else {
            map[catId].totalMetersBought += Number(tx.meters || tx.quantity || 0);
            map[catId].totalSuitsBought += Math.floor(Number(tx.meters || tx.quantity || 0) / 4);
          }
          if (tx.ratePerMeter) {
            map[catId].lastRate = Number(tx.ratePerMeter);
          }
        }
      }

      // Previous Returns (subtract already returned goods)
      if (tx.saleType === "return" && tx.categoryId) {
        const catId = tx.categoryId;
        if (!map[catId]) {
          map[catId] = {
            categoryId: catId,
            categoryName: tx.categoryName,
            shortName: tx.shortName || tx.categoryName,
            totalSuitsBought: 0,
            totalMetersBought: 0,
            totalSuitsReturned: 0,
            totalMetersReturned: 0,
            lastRate: Number(tx.ratePerMeter) || 400
          };
        }
        if (tx.returnType === "suits") {
          map[catId].totalSuitsReturned += Number(tx.quantity || 0);
          map[catId].totalMetersReturned += Number(tx.meters || (tx.quantity * 4) || 0);
        } else {
          map[catId].totalMetersReturned += Number(tx.meters || tx.quantity || 0);
          map[catId].totalSuitsReturned += Math.floor(Number(tx.meters || tx.quantity || 0) / 4);
        }
      }
    });

    // Net remaining in client's possession
    Object.keys(map).forEach(catId => {
      map[catId].netSuitsHolding = Math.max(0, map[catId].totalSuitsBought - map[catId].totalSuitsReturned);
      map[catId].netMetersHolding = Math.max(0, map[catId].totalMetersBought - map[catId].totalMetersReturned);
    });

    return map;
  }, [selectedClient]);

  // Filter categories to ONLY those the client actually purchased
  const eligibleCategories = useMemo(() => {
    return categories.filter(cat => {
      const purchaseInfo = clientPurchasedFabrics[cat.id];
      return purchaseInfo && purchaseInfo.totalMetersBought > 0;
    });
  }, [categories, clientPurchasedFabrics]);

  // When client changes or eligibleCategories change, select the first eligible fabric
  useEffect(() => {
    if (eligibleCategories.length > 0) {
      // If current categoryId is not eligible, switch to first eligible
      if (!eligibleCategories.some(c => c.id === categoryId)) {
        const first = eligibleCategories[0];
        setCategoryId(first.id);
        const purchaseData = clientPurchasedFabrics[first.id];
        setRatePerMeter(purchaseData?.lastRate || first.pricePerMeter);
      }
    } else {
      setCategoryId("");
    }
  }, [eligibleCategories, categoryId, clientPurchasedFabrics]);

  // When category changes, update default rate to the rate client actually paid
  const handleCategoryChange = (newCatId) => {
    setCategoryId(newCatId);
    const purchaseData = clientPurchasedFabrics[newCatId];
    const cat = categories.find(c => c.id === newCatId);
    if (purchaseData?.lastRate) {
      setRatePerMeter(purchaseData.lastRate);
    } else if (cat) {
      setRatePerMeter(cat.pricePerMeter);
    }
  };

  const selectedCat = categories.find(c => c.id === categoryId);
  const currentPurchaseData = clientPurchasedFabrics[categoryId] || null;

  // Calculate current client pending
  const txs = selectedClient?.transactions || [];
  const billed = txs.reduce((s, t) => s + (Number(t.totalBill) || 0), 0);
  const paid = txs.reduce((s, t) => s + (Number(t.amountPaid) || 0), 0);
  const currentPending = (Number(selectedClient?.openingBalance) || 0) + (billed - paid);

  // Calculations
  const qtyNum = Number(quantity) || 0;
  const rateNum = Number(ratePerMeter) || 0;
  const totalMeters = returnType === "suits" ? qtyNum * 4 : qtyNum;
  const totalReturnCredit = totalMeters * rateNum;

  // Max returnable validation
  const maxSuitsReturnable = currentPurchaseData ? currentPurchaseData.netSuitsHolding : 0;
  const maxMetersReturnable = currentPurchaseData ? currentPurchaseData.netMetersHolding : 0;
  const isOverReturn = returnType === "suits" ? qtyNum > maxSuitsReturnable : qtyNum > maxMetersReturnable;

  const handleClose = () => {
    setModalState(prev => ({ ...prev, recordReturn: false, returnClientId: null }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!qtyNum || qtyNum <= 0) return;
    if (isOverReturn) return;

    const success = recordReturn({
      clientId,
      categoryId,
      returnType,
      quantity: qtyNum,
      ratePerMeter: rateNum,
      refundType,
      note
    });

    if (success) {
      handleClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" style={{ maxWidth: "560px" }} onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="stat-icon-circle stat-icon-amber" style={{ width: "38px", height: "38px" }}>
              <RotateCcw size={18} />
            </div>
            <div>
              <h3 className="modal-title">Record Stock Return (Wapsi)</h3>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Restock returned fabric back to inventory & adjust client Khata
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={handleClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: "75vh", overflowY: "auto" }}>
            {/* Client Account Selector */}
            <div className="form-group">
              <label className="form-label">Client Account</label>
              <select 
                className="form-select"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.shopName}) - {c.city}
                  </option>
                ))}
              </select>
            </div>

            {/* Current Client Ledger Status Box */}
            <div style={{ 
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 14px", background: "var(--bg-subtle)", 
              borderRadius: "var(--radius-md)", border: "1px solid var(--border-input)",
              marginBottom: "16px"
            }}>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600" }}>
                  Client Current Khata Balance:
                </div>
                <div style={{ fontSize: "16px", fontWeight: "800", color: currentPending > 0 ? "var(--accent-amber)" : "var(--accent-green)" }}>
                  PKR {currentPending.toLocaleString()} {currentPending > 0 ? "(Pending Due)" : "(Settled)"}
                </div>
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "right" }}>
                <span>Phone: {selectedClient?.phone}</span>
              </div>
            </div>

            {/* If Client hasn't purchased ANY fabric yet */}
            {eligibleCategories.length === 0 ? (
              <div style={{
                padding: "20px", textAlign: "center", background: "var(--bg-subtle)",
                borderRadius: "var(--radius-md)", border: "1px dashed var(--border-input)",
                marginBottom: "16px"
              }}>
                <Info size={32} color="var(--accent-amber)" style={{ margin: "0 auto 8px" }} />
                <h4 style={{ fontSize: "15px", marginBottom: "4px" }}>No Purchased Fabric on Record</h4>
                <p style={{ fontSize: "12.5px", color: "var(--text-muted)", margin: 0 }}>
                  <strong>{selectedClient?.name}</strong> has not made any fabric purchases yet. 
                  Returns can only be recorded for fabrics that the client has previously bought.
                </p>
              </div>
            ) : (
              <>
                {/* Fabric Category Selector - ONLY ELIGIBLE PURCHASED FABRICS */}
                <div className="form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      Purchased Fabric to Return *
                    </label>
                    <span style={{ fontSize: "11px", color: "var(--primary)", fontWeight: "600" }}>
                      Showing only fabrics {selectedClient?.name} purchased
                    </span>
                  </div>
                  <select 
                    className="form-select"
                    value={categoryId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    required
                  >
                    {eligibleCategories.map(cat => {
                      const p = clientPurchasedFabrics[cat.id];
                      return (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} ({cat.shortName}) — Bought: {p?.totalSuitsBought} Suits | In Possession: {p?.netSuitsHolding} Suits
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Live Client Possession Breakdown Card */}
                {currentPurchaseData && (
                  <div style={{
                    padding: "12px 14px", background: "var(--bg-subtle)",
                    border: "1px solid var(--border-input)", borderRadius: "var(--radius-md)",
                    marginBottom: "16px"
                  }}>
                    <div style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                      Fabric Purchase & Return History for {selectedCat?.shortName}:
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", textAlign: "center" }}>
                      <div style={{ background: "var(--bg-card)", padding: "8px", borderRadius: "6px" }}>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Total Bought</div>
                        <div style={{ fontSize: "14px", fontWeight: "800", color: "var(--primary)" }}>
                          {currentPurchaseData.totalSuitsBought} Suits
                        </div>
                        <div style={{ fontSize: "10.5px", color: "var(--text-light)" }}>
                          ({currentPurchaseData.totalMetersBought}m)
                        </div>
                      </div>

                      <div style={{ background: "var(--bg-card)", padding: "8px", borderRadius: "6px" }}>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Already Returned</div>
                        <div style={{ fontSize: "14px", fontWeight: "800", color: "var(--accent-amber)" }}>
                          {currentPurchaseData.totalSuitsReturned} Suits
                        </div>
                        <div style={{ fontSize: "10.5px", color: "var(--text-light)" }}>
                          ({currentPurchaseData.totalMetersReturned}m)
                        </div>
                      </div>

                      <div style={{ background: "var(--bg-card)", padding: "8px", borderRadius: "6px" }}>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Currently With Client</div>
                        <div style={{ fontSize: "14px", fontWeight: "800", color: "var(--accent-green)" }}>
                          {currentPurchaseData.netSuitsHolding} Suits
                        </div>
                        <div style={{ fontSize: "10.5px", color: "var(--text-light)" }}>
                          ({currentPurchaseData.netMetersHolding}m Max)
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Return Format: Standard Suits vs Custom Meters */}
                <div className="form-group">
                  <label className="form-label">Return Format</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <button
                      type="button"
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                        padding: "10px", borderRadius: "var(--radius-md)", cursor: "pointer",
                        border: `1.5px solid ${returnType === "suits" ? "var(--primary)" : "var(--border-input)"}`,
                        background: returnType === "suits" ? "var(--primary-subtle)" : "var(--bg-card)",
                        color: returnType === "suits" ? "var(--primary)" : "var(--text-main)",
                        fontWeight: returnType === "suits" ? "700" : "500"
                      }}
                      onClick={() => setReturnType("suits")}
                    >
                      <Package size={16} />
                      <span>Standard Suits (4m)</span>
                    </button>

                    <button
                      type="button"
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                        padding: "10px", borderRadius: "var(--radius-md)", cursor: "pointer",
                        border: `1.5px solid ${returnType === "meters" ? "var(--primary)" : "var(--border-input)"}`,
                        background: returnType === "meters" ? "var(--primary-subtle)" : "var(--bg-card)",
                        color: returnType === "meters" ? "var(--primary)" : "var(--text-main)",
                        fontWeight: returnType === "meters" ? "700" : "500"
                      }}
                      onClick={() => setReturnType("meters")}
                    >
                      <Scissors size={16} />
                      <span>Loose Fabric (Meters)</span>
                    </button>
                  </div>
                </div>

                {/* Quantity and Rate Input */}
                <div className="form-row-2">
                  <div className="form-group">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <label className="form-label" style={{ margin: 0 }}>
                        {returnType === "suits" ? "Number of Suits Returned *" : "Total Meters Returned *"}
                      </label>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        Max: {returnType === "suits" ? `${maxSuitsReturnable} Suits` : `${maxMetersReturnable}m`}
                      </span>
                    </div>
                    <input 
                      type="number"
                      min="0.1"
                      max={returnType === "suits" ? maxSuitsReturnable : maxMetersReturnable}
                      step="any"
                      className="form-input"
                      placeholder="e.g. 2"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Return Rate (PKR / Meter)</label>
                    <input 
                      type="number"
                      min="1"
                      step="any"
                      className="form-input"
                      value={ratePerMeter}
                      onChange={(e) => setRatePerMeter(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Over-return Warning */}
                {isOverReturn && (
                  <div style={{
                    padding: "10px 14px", background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "var(--radius-md)",
                    marginBottom: "16px", color: "#ef4444", fontSize: "12.5px", display: "flex", alignItems: "center", gap: "8px"
                  }}>
                    <AlertCircle size={16} />
                    <span>
                      <strong>Excess Return:</strong> {selectedClient?.name} only holds{" "}
                      <strong>{returnType === "suits" ? `${maxSuitsReturnable} suits` : `${maxMetersReturnable} meters`}</strong>. You cannot return more than they bought!
                    </span>
                  </div>
                )}

                {/* Return Credit Calculation Banner */}
                <div style={{
                  background: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.04) 100%)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 16px",
                  marginBottom: "16px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>
                        Total Return Value to Credit:
                      </div>
                      <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--accent-amber)" }}>
                        PKR {totalReturnCredit.toLocaleString()}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: "12px" }}>
                      <div style={{ fontWeight: "600", color: "var(--text-main)" }}>
                        {totalMeters} Meters Total
                      </div>
                      <div style={{ color: "var(--text-muted)" }}>
                        {qtyNum} {returnType === "suits" ? "Packet Suit(s)" : "Meters"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Settlement Mode Selection */}
                <div className="form-group">
                  <label className="form-label">Refund / Khata Adjustment Method</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label style={{ 
                      display: "flex", alignItems: "center", gap: "10px", 
                      padding: "10px 14px", borderRadius: "8px", cursor: "pointer",
                      border: `1.5px solid ${refundType === "khata" ? "var(--primary)" : "var(--border-input)"}`,
                      background: refundType === "khata" ? "var(--primary-subtle)" : "transparent"
                    }}>
                      <input 
                        type="radio" 
                        name="refundType" 
                        value="khata" 
                        checked={refundType === "khata"}
                        onChange={() => setRefundType("khata")} 
                      />
                      <div>
                        <strong style={{ fontSize: "13px", display: "block" }}>
                          Deduct from Khata / Outstanding Balance (Credit Note)
                        </strong>
                        <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                          Client's pending balance will be reduced by PKR {totalReturnCredit.toLocaleString()}
                        </span>
                      </div>
                    </label>

                    <label style={{ 
                      display: "flex", alignItems: "center", gap: "10px", 
                      padding: "10px 14px", borderRadius: "8px", cursor: "pointer",
                      border: `1.5px solid ${refundType === "cash" ? "var(--primary)" : "var(--border-input)"}`,
                      background: refundType === "cash" ? "var(--primary-subtle)" : "transparent"
                    }}>
                      <input 
                        type="radio" 
                        name="refundType" 
                        value="cash" 
                        checked={refundType === "cash"}
                        onChange={() => setRefundType("cash")} 
                      />
                      <div>
                        <strong style={{ fontSize: "13px", display: "block" }}>
                          Cash / Online Refund to Client
                        </strong>
                        <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                          Cash returned to client directly (No change to client's remaining Khata balance)
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Return Reason / Note */}
                <div className="form-group">
                  <label className="form-label">Return Reason / Note (Optional)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Excess stock returned, defect exchange, color change"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>

                {/* Inventory Restock Confirmation Notice */}
                <div style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "10px 12px", background: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: "8px",
                  fontSize: "12px", color: "var(--accent-green)"
                }}>
                  <CheckCircle2 size={16} />
                  <span>
                    <strong>Automatic Restock:</strong> +{qtyNum} {returnType === "suits" ? "Suits" : "Meters"} will be automatically added back to <strong>{selectedCat?.name}</strong> inventory & Firebase!
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={eligibleCategories.length === 0 || isOverReturn || !qtyNum || qtyNum <= 0}
              style={{ 
                background: "var(--accent-amber)", 
                borderColor: "var(--accent-amber)", 
                color: "#fff",
                opacity: (eligibleCategories.length === 0 || isOverReturn) ? 0.5 : 1,
                cursor: (eligibleCategories.length === 0 || isOverReturn) ? "not-allowed" : "pointer"
              }}
            >
              <RotateCcw size={16} style={{ marginRight: "6px" }} />
              Accept Return & Restock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
