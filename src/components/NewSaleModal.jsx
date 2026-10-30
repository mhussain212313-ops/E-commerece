import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  TrendingUp, Scissors, Package, Calculator, 
  CheckCircle2, FileText, Share2, Plus, Minus, 
  RotateCcw
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { generateInvoicePDF, openWhatsAppInvoiceShare } from "../utils/pdfGenerator";
import { FABRIC_CATEGORIES } from "../data/initialData";
import { calculateClientPurchasedFabrics } from "../utils/clientHistory";

export const NewSaleModal = () => {
  const { 
    clients, categories, recordSale, recordReturn, modalState, 
    setModalState, addToast, getCategoryTotalMeters 
  } = useApp();

  const [clientId, setClientId] = useState(modalState.newSaleClientId || clients[0]?.id || "");
  const [orderMode, setOrderMode] = useState("sale"); // "sale" (New Stock) or "return" (Return Stock)
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

  // Quantities for 5 Standard Suits (4m each) keyed by categoryId
  const [suitQuantities, setSuitQuantities] = useState(() => {
    const initial = {};
    FABRIC_CATEGORIES.forEach(c => { initial[c.id] = ""; });
    return initial;
  });

  // Quantities for 5 TP Cuts (Loose Meters) keyed by categoryId
  const [tpQuantities, setTpQuantities] = useState(() => {
    const initial = {};
    FABRIC_CATEGORIES.forEach(c => { initial[c.id] = ""; });
    return initial;
  });

  const [discount, setDiscount] = useState(0);
  const [amountPaid, setAmountPaid] = useState("");
  const [notes, setNotes] = useState("");

  // Post-sale completion state for 1-click PDF/WhatsApp export
  const [completedSale, setCompletedSale] = useState(null);

  useEffect(() => {
    if (modalState.newSaleClientId) {
      setClientId(modalState.newSaleClientId);
    }
  }, [modalState.newSaleClientId]);

  // Ensure scroll is at the top on mount
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

  // Reset or clamp quantities when switching mode or client
  useEffect(() => {
    if (orderMode === "return") {
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
    }
  }, [orderMode, clientId, clientPurchasedMap, activeCategories]);

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

  // Helper for Theme Tag
  const getThemeTag = (cat) => {
    const theme = (cat.theme || "").toLowerCase();
    const name = (cat.name || "").toLowerCase();
    if (theme.includes("light") || name.includes("light")) return "Light";
    if (theme.includes("dark") || name.includes("dark")) return "Dark";
    if (theme.includes("wash") || name.includes("wash")) return "Wash";
    return cat.shortName || "Standard";
  };

  // Helper to get max limits for a category row
  const getRowLimits = (cat, currentSuitQty, currentTpQty) => {
    const totalAvailMeters = getCategoryTotalMeters ? getCategoryTotalMeters(cat) : 0;
    const holding = clientPurchasedMap[cat.id] || { netSuitsHolding: 0, netTpHolding: 0, totalSuitsBought: 0, totalTpMetersBought: 0 };

    if (orderMode === "sale") {
      // INVENTORY STOCK LIMITATION:
      // Can only buy what is in stock!
      const availForSuits = Math.max(0, totalAvailMeters - (Number(currentTpQty) || 0));
      const maxSuits = Math.floor(availForSuits / 4);

      const availForTp = Math.max(0, totalAvailMeters - ((Number(currentSuitQty) || 0) * 4));
      const maxTpMeters = availForTp;

      return {
        maxSuits,
        maxTpMeters,
        totalAvailMeters,
        holding,
        isSuitDisabled: maxSuits <= 0 && (!currentSuitQty || Number(currentSuitQty) === 0),
        isTpDisabled: maxTpMeters <= 0 && (!currentTpQty || Number(currentTpQty) === 0),
      };
    } else {
      // RETURN LIMITATION:
      // Can ONLY return what this specific client has actually bought and still holds!
      const maxSuits = holding.netSuitsHolding || 0;
      const maxTpMeters = holding.netTpHolding || 0;

      return {
        maxSuits,
        maxTpMeters,
        totalAvailMeters,
        holding,
        isSuitDisabled: maxSuits <= 0,
        isTpDisabled: maxTpMeters <= 0,
      };
    }
  };

  // Suit Quantity Handlers with strict stock/purchase clamp
  const handleSuitQtyChange = (cat, val) => {
    if (val === "") {
      setSuitQuantities(prev => ({ ...prev, [cat.id]: "" }));
      return;
    }
    const num = Math.max(0, parseInt(val, 10) || 0);
    const { maxSuits } = getRowLimits(cat, num, tpQuantities[cat.id]);

    if (num > maxSuits) {
      if (orderMode === "sale") {
        addToast(`Only ${maxSuits} suits available in stock for ${cat.shortName}!`, "warning");
      } else {
        addToast(`Client only bought ${maxSuits} suits of ${cat.shortName} eligible for return!`, "warning");
      }
      setSuitQuantities(prev => ({ ...prev, [cat.id]: maxSuits }));
    } else {
      setSuitQuantities(prev => ({ ...prev, [cat.id]: num }));
    }
  };

  const stepSuitQty = (cat, delta) => {
    const current = Number(suitQuantities[cat.id]) || 0;
    const { maxSuits } = getRowLimits(cat, current, tpQuantities[cat.id]);
    const next = Math.max(0, Math.min(maxSuits, current + delta));
    setSuitQuantities(prev => ({ ...prev, [cat.id]: next === 0 ? "" : next }));
  };

  // TP Quantity Handlers with strict stock/purchase clamp
  const handleTpQtyChange = (cat, val) => {
    if (val === "") {
      setTpQuantities(prev => ({ ...prev, [cat.id]: "" }));
      return;
    }
    const num = Math.max(0, parseFloat(val) || 0);
    const { maxTpMeters } = getRowLimits(cat, suitQuantities[cat.id], num);

    if (num > maxTpMeters) {
      if (orderMode === "sale") {
        addToast(`Only ${maxTpMeters}m available in stock for TP ${cat.shortName}!`, "warning");
      } else {
        addToast(`Client only bought ${maxTpMeters}m of TP ${cat.shortName} eligible for return!`, "warning");
      }
      setTpQuantities(prev => ({ ...prev, [cat.id]: maxTpMeters }));
    } else {
      setTpQuantities(prev => ({ ...prev, [cat.id]: num }));
    }
  };

  const stepTpQty = (cat, delta) => {
    const current = Number(tpQuantities[cat.id]) || 0;
    const { maxTpMeters } = getRowLimits(cat, suitQuantities[cat.id], current);
    const next = Math.max(0, Math.min(maxTpMeters, current + delta));
    setTpQuantities(prev => ({ ...prev, [cat.id]: next === 0 ? "" : next }));
  };

  // Reset form
  const handleResetForm = () => {
    const resetS = {};
    const resetT = {};
    activeCategories.forEach(c => {
      resetS[c.id] = "";
      resetT[c.id] = "";
    });
    setSuitQuantities(resetS);
    setTpQuantities(resetT);
    setAmountPaid("");
    setDiscount(0);
    setNotes("");
  };

  // Calculate detailed row metrics for all 10 items
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

      const limits = getRowLimits(cat, suitQty, tpQty);

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
        ...limits
      };
    });
  }, [activeCategories, suitQuantities, tpQuantities, getCategoryTotalMeters, orderMode, clientPurchasedMap]);

  // Grand Totals across all 10 lines
  const totalSuitQty = rowCalculations.reduce((sum, r) => sum + r.suitQty, 0);
  const totalSuitMeters = rowCalculations.reduce((sum, r) => sum + r.suitMeters, 0);
  const totalSuitAmount = rowCalculations.reduce((sum, r) => sum + r.suitTotal, 0);

  const totalTpMeters = rowCalculations.reduce((sum, r) => sum + r.tpQty, 0);
  const totalTpAmount = rowCalculations.reduce((sum, r) => sum + r.tpTotal, 0); // TP Jamah

  const grandSubtotal = totalSuitAmount + totalTpAmount;
  const todayTotalAmount = Math.max(0, grandSubtotal - (Number(discount) || 0)); // Today Total Amount

  // Calculate client's previous Khata balance (Pervs Amount)
  const clientPastTxs = selectedClient?.transactions || [];
  const pastBilled = clientPastTxs.reduce((sum, t) => sum + (Number(t.totalBill) || 0), 0);
  const pastPaid = clientPastTxs.reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);
  const previousBalance = (Number(selectedClient?.openingBalance) || 0) + (pastBilled - pastPaid);
  
  // Total Sum (Grand Total Payable)
  const totalSum = orderMode === "sale" 
    ? (previousBalance + todayTotalAmount) 
    : (previousBalance - todayTotalAmount);

  // Paid and Net Remaining
  const paid = amountPaid === "" ? (orderMode === "sale" ? todayTotalAmount : 0) : Number(amountPaid);
  const netRemainingBalance = orderMode === "sale" ? (totalSum - paid) : totalSum;

  const hasAtLeastOneItem = totalSuitQty > 0 || totalTpMeters > 0;

  const handleClose = () => {
    setModalState(prev => ({ ...prev, newSale: false, newSaleClientId: null }));
    setCompletedSale(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!hasAtLeastOneItem) {
      addToast("Please enter at least 1 suit or TP meter before confirming.", "error");
      return;
    }

    if (orderMode === "sale") {
      // Validate inventory stock again
      for (const r of rowCalculations) {
        const totalNeeded = r.suitMeters + r.tpMeters;
        if (totalNeeded > r.totalAvailMeters) {
          addToast(`Cannot sell ${r.category.shortName}! Need ${totalNeeded}m but only ${r.totalAvailMeters}m available in stock.`, "error");
          return;
        }
      }

      // Record Sale
      const payloadItems = [];
      rowCalculations.forEach(r => {
        if (r.suitQty > 0) {
          payloadItems.push({
            categoryId: r.category.id,
            categoryName: r.category.name,
            shortName: r.category.shortName,
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
          payloadItems.push({
            categoryId: r.category.id,
            categoryName: `TP - ${r.category.shortName}`,
            shortName: `${r.tpAbbr} ${r.category.shortName}`,
            saleType: "meters",
            quantity: r.tpQty,
            meters: r.tpMeters,
            ratePerMeter: r.ratePerMeter,
            itemTotal: r.tpTotal
          });
        }
      });

      const result = recordSale({
        clientId,
        items: payloadItems,
        totalBill: todayTotalAmount,
        previousBalance,
        amountPaid: paid,
        remainingBalance: netRemainingBalance,
        notes: notes || `Wholesale order: ${totalSuitQty} Suits + ${totalTpMeters}m TP`
      });

      if (result) {
        setCompletedSale(result);
        addToast("Sale recorded successfully in Khata & live stock deducted!", "success");
      }
    } else {
      // Validate return eligibility against purchase history
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

      // Record Return (Wapsi)
      const returnPayload = [];
      rowCalculations.forEach(r => {
        if (r.suitQty > 0) {
          returnPayload.push({
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
          returnPayload.push({
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

      const ok = recordReturn({
        clientId,
        items: returnPayload,
        refundType: "khata",
        note: notes || `Wholesale return: ${totalSuitQty} Suits + ${totalTpMeters}m TP returned`
      });

      if (ok) {
        handleClose();
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div 
        className="modal-container" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: "880px", width: "96vw", maxHeight: "96vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header with Mode Switch (New Stock vs Return Stock) */}
        <div className="modal-header" style={{ padding: "12px 18px", borderBottom: "1px solid var(--border-light)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className={`stat-icon-circle ${orderMode === "sale" ? "stat-icon-purple" : "stat-icon-amber"}`} style={{ width: "36px", height: "36px" }}>
              <TrendingUp size={18} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 className="modal-title" style={{ fontSize: "16px", fontWeight: "800" }}>
                  {orderMode === "sale" ? "New Stock Sale & Daily Khata" : "Return Stock (Wapsi Voucher)"}
                </h3>
                <span className={orderMode === "sale" ? "badge-purple" : "badge-amber"} style={{ fontSize: "10.5px", padding: "1px 7px" }}>
                  {orderMode === "sale" ? "Stock-Limited (Max Clamped)" : "Purchase-Restricted (Bought Only)"}
                </span>
              </div>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>
                {orderMode === "sale" 
                  ? "Quantities cannot exceed inventory stock available. Zero stock is disabled."
                  : "Client can only return fabrics they actually purchased. Unpurchased fabrics are disabled."}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Mode Switch Toggle: New Stock vs Return Stock matching handwritten note */}
            <div style={{ 
              display: "flex", 
              background: "var(--bg-subtle)", 
              borderRadius: "var(--radius-pill)", 
              padding: "2px", 
              border: "1px solid var(--border-input)" 
            }}>
              <button
                type="button"
                onClick={() => setOrderMode("sale")}
                style={{
                  padding: "5px 12px",
                  fontSize: "11.5px",
                  fontWeight: "700",
                  borderRadius: "var(--radius-pill)",
                  border: "none",
                  cursor: "pointer",
                  background: orderMode === "sale" ? "var(--primary)" : "transparent",
                  color: orderMode === "sale" ? "#fff" : "var(--text-muted)",
                  transition: "all var(--transition-fast)"
                }}
              >
                New Stock (Sale)
              </button>
              <button
                type="button"
                onClick={() => setOrderMode("return")}
                style={{
                  padding: "5px 12px",
                  fontSize: "11.5px",
                  fontWeight: "700",
                  borderRadius: "var(--radius-pill)",
                  border: "none",
                  cursor: "pointer",
                  background: orderMode === "return" ? "var(--accent-amber)" : "transparent",
                  color: orderMode === "return" ? "#fff" : "var(--text-muted)",
                  transition: "all var(--transition-fast)"
                }}
              >
                Return Stock (Wapsi)
              </button>
            </div>

            <button className="modal-close-btn" onClick={handleClose}>✕</button>
          </div>
        </div>

        {completedSale ? (
          /* Post-Sale Completion & Export Screen */
          <div className="modal-body" style={{ textAlign: "center", padding: "24px 20px" }}>
            <div style={{ 
              width: "56px", height: "56px", borderRadius: "50%", 
              background: "var(--accent-green-light)", color: "var(--accent-green)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 12px auto" 
            }}>
              <CheckCircle2 size={32} />
            </div>

            <h3 style={{ fontSize: "20px", fontWeight: "800", marginBottom: "4px" }}>
              Sale Successfully Recorded!
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px" }}>
              Invoice <strong>{completedSale.tx.invoiceNo}</strong> recorded for{" "}
              <strong>{completedSale.client.name}</strong> ({completedSale.client.shopName}).
              Exact stock deducted automatically.
            </p>

            {/* Itemized Sold Summary */}
            <div style={{ 
              background: "var(--bg-subtle)", padding: "14px", borderRadius: "var(--radius-md)", 
              border: "1px solid var(--border-light)", textAlign: "left", marginBottom: "18px",
              display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px"
            }}>
              <div style={{ fontWeight: "700", color: "var(--primary)", borderBottom: "1px solid var(--border-light)", paddingBottom: "6px" }}>
                Invoice Items ({completedSale.items.length} Lines):
              </div>

              {completedSale.items.map((it, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12.5px" }}>
                  <span>
                    {idx + 1}. <strong>{it.categoryName}</strong> &bull; {it.quantity} {it.saleType === "suits" ? "Suits" : "m"} ({it.meters}m)
                  </span>
                  <span style={{ fontWeight: "700" }}>PKR {it.itemTotal.toLocaleString()}</span>
                </div>
              ))}

              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed var(--border-input)", paddingTop: "8px", marginTop: "4px" }}>
                <span style={{ fontWeight: "600", color: "var(--text-main)" }}>Today Total Amount:</span>
                <strong style={{ fontSize: "14px" }}>PKR {completedSale.tx.totalBill.toLocaleString()}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Pervs Amount (Previous Khata):</span>
                <strong style={{ color: (completedSale.previousBalance || 0) > 0 ? "var(--accent-amber)" : (completedSale.previousBalance || 0) < 0 ? "var(--accent-green)" : "var(--text-muted)" }}>
                  {(completedSale.previousBalance || 0) > 0 
                    ? `+PKR ${(completedSale.previousBalance || 0).toLocaleString()} (Payable)` 
                    : (completedSale.previousBalance || 0) < 0 
                      ? `-PKR ${Math.abs(completedSale.previousBalance || 0).toLocaleString()} (Advance)` 
                      : "PKR 0 (Nil)"}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: "700", color: "var(--primary)" }}>Total Sum (Kul Rakam):</span>
                <strong style={{ color: "var(--primary)", fontSize: "15px" }}>
                  PKR {(completedSale.totalPayable || (completedSale.tx.totalBill + (completedSale.previousBalance || 0))).toLocaleString()}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Cash Received:</span>
                <strong style={{ color: "var(--accent-green)" }}>PKR {completedSale.tx.amountPaid.toLocaleString()}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-light)", paddingTop: "6px" }}>
                <span style={{ fontWeight: "700" }}>
                  {(completedSale.netBalance ?? completedSale.tx.remainingBalance) > 0 
                    ? "Net Khata Due (Aapne Dene Hain):" 
                    : "Net Balance:"}
                </span>
                <strong style={{ 
                  color: (completedSale.netBalance ?? completedSale.tx.remainingBalance) > 0 
                    ? "var(--accent-amber)" 
                    : "var(--accent-green)",
                  fontSize: "15px"
                }}>
                  PKR {(completedSale.netBalance ?? completedSale.tx.remainingBalance ?? 0).toLocaleString()}
                </strong>
              </div>
            </div>

            {/* Export Action Buttons */}
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button 
                className="btn-secondary"
                style={{ padding: "10px 18px" }}
                onClick={() => {
                  generateInvoicePDF({
                    invoice: completedSale.tx,
                    client: completedSale.client,
                    category: completedSale.category
                  });
                  addToast("PDF Invoice downloaded!", "success");
                }}
              >
                <FileText size={16} />
                <span>Download PDF Bill</span>
              </button>

              <button 
                className="btn-success"
                style={{ padding: "10px 18px" }}
                onClick={() => {
                  openWhatsAppInvoiceShare({
                    invoice: completedSale.tx,
                    client: completedSale.client,
                    category: completedSale.category,
                    addToast
                  });
                }}
              >
                <Share2 size={16} />
                <span>Share to WhatsApp Web</span>
              </button>
            </div>

            <div style={{ marginTop: "18px" }}>
              <button className="btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={handleClose}>
                Done & Close
              </button>
            </div>
          </div>
        ) : (
          /* Main Fast Order Entry Form matching Handwritten Slip */
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
            <div 
              ref={modalBodyRef}
              className="modal-body" 
              style={{ overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "10px" }}
            >
              
              {/* Client Selection Card with Khata Overview */}
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
                    Select B2B Client / Khata Account
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
                      Pervs Amount (Pichla Baqaya)
                    </div>
                    <div style={{ 
                      fontSize: "13px", 
                      fontWeight: "800",
                      color: previousBalance > 0 ? "var(--accent-amber)" : previousBalance < 0 ? "var(--accent-green)" : "var(--text-muted)"
                    }}>
                      {previousBalance > 0 
                        ? `PKR ${previousBalance.toLocaleString()}` 
                        : previousBalance < 0 
                          ? `-PKR ${Math.abs(previousBalance).toLocaleString()}` 
                          : "PKR 0 (Clear)"}
                    </div>
                  </div>

                  <button 
                    type="button" 
                    onClick={handleResetForm}
                    className="btn-secondary" 
                    style={{ padding: "3px 7px", fontSize: "10.5px", gap: "3px", height: "fit-content" }}
                    title="Clear all quantity inputs"
                  >
                    <RotateCcw size={11} />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* ========================================================
                  THE 10 ITEMS WHOLESALE SLIP (Side-by-Side 2 Columns):
                  Column 1: 5 Standard Suits (Light, Dark, Wash)
                  Column 2: 5 TP Cuts (TPL, TPD, TPW)
                  ======================================================== */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "10px" }}>
                
                {/* COLUMN 1: 5 STANDARD SUITS (4M EACH) */}
                <div style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-input)",
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                  boxShadow: "var(--shadow-sm)"
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
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--primary)" }}>
                      {totalSuitQty} Suits &bull; PKR {totalSuitAmount.toLocaleString()}
                    </div>
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
                            opacity: isDisabled ? 0.6 : 1,
                            transition: "background var(--transition-fast)"
                          }}
                        >
                          {/* Color Name & Swatch */}
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
                                {orderMode === "sale" 
                                  ? (row.maxSuits > 0 ? `Max Stock: ${row.maxSuits} Suits` : "0 in stock (Sold out)")
                                  : (row.maxSuits > 0 ? `Bought: ${row.holding.totalSuitsBought} (Max: ${row.maxSuits})` : "0 bought (Cannot return)")}
                              </div>
                            </div>
                          </div>

                          {/* Stepper & Controls */}
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
                              title={row.suitQty >= row.maxSuits ? "Reached maximum available limit" : "Add 1"}
                            >
                              <Plus size={10} />
                            </button>

                            {/* Preset Buttons */}
                            <div style={{ display: "flex", gap: "2px", marginLeft: "2px" }}>
                              {[2, 5].filter(n => n <= row.maxSuits).map(n => (
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
                                    border: "1px solid var(--primary-border)", background: "var(--primary-light)",
                                    cursor: isDisabled ? "not-allowed" : "pointer", color: "var(--primary)", fontWeight: "700"
                                  }}
                                  onClick={() => handleSuitQtyChange(row.category, row.maxSuits)}
                                  title={`Select all available ${row.maxSuits} suits`}
                                >
                                  Max
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Row Total */}
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

                {/* COLUMN 2: 5 TP CUTS (THAN PIECE - PER METER) */}
                <div style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-input)",
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                  boxShadow: "var(--shadow-sm)"
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
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--accent-green)" }}>
                      {totalTpMeters}m TP &bull; PKR {totalTpAmount.toLocaleString()}
                    </div>
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
                            opacity: isDisabled ? 0.6 : 1,
                            transition: "background var(--transition-fast)"
                          }}
                        >
                          {/* TP Abbreviation & Color Name */}
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
                                {orderMode === "sale" 
                                  ? (row.maxTpMeters > 0 ? `Max Stock: ${row.maxTpMeters}m` : "0m in stock")
                                  : (row.maxTpMeters > 0 ? `Bought: ${row.holding.totalTpMetersBought}m (Max: ${row.maxTpMeters}m)` : "0m bought (Cannot return)")}
                              </div>
                            </div>
                          </div>

                          {/* Stepper & Controls */}
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
                              title={row.tpQty >= row.maxTpMeters ? "Reached maximum available limit" : "Add 1m"}
                            >
                              <Plus size={10} />
                            </button>

                            {/* Preset Buttons */}
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
                                  title={`Select all available ${row.maxTpMeters}m`}
                                >
                                  Max
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Row Total */}
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

              {/* ========================================================
                  SECTION 3: SUMMARY BREAKDOWN (Exact match to Handwritten Slip)
                  Total suit
                  Today Total Amount
                  TP Jamah =
                  Pervs Amount
                  Total sum
                  ======================================================== */}
              <div style={{
                background: "var(--bg-card)",
                border: "2px solid var(--primary-border)",
                borderRadius: "var(--radius-md)",
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                boxShadow: "var(--shadow-sm)"
              }}>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  borderBottom: "1px solid var(--border-light)",
                  paddingBottom: "5px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", fontWeight: "800", color: "var(--primary)" }}>
                    <Calculator size={14} /> WHOLESALE SLIP SUMMARY & KHATA CALCULATION
                  </div>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                    {orderMode === "sale" ? "Daily Order Ledger" : "Return / Wapsi Adjustment"}
                  </span>
                </div>

                {/* Line 1: Total suit */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-main)" }}>
                    Total suit (Kul Suits):
                  </span>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "13.5px", fontWeight: "800", color: "var(--primary)" }}>
                      {totalSuitQty} Suits
                    </span>
                    <span style={{ fontSize: "10.5px", color: "var(--text-muted)", marginLeft: "6px" }}>
                      ({totalSuitMeters}m &bull; PKR {totalSuitAmount.toLocaleString()})
                    </span>
                  </div>
                </div>

                {/* Line 2: TP Jamah (Total TP Amount) */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--accent-green)" }}>
                    TP Jamah = (Total TP Meter Cuts):
                  </span>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "13.5px", fontWeight: "800", color: "var(--accent-green)" }}>
                      PKR {totalTpAmount.toLocaleString()}
                    </span>
                    <span style={{ fontSize: "10.5px", color: "var(--text-muted)", marginLeft: "6px" }}>
                      ({totalTpMeters}m cut)
                    </span>
                  </div>
                </div>

                {/* Line 3: Today Total Amount */}
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  background: "var(--bg-subtle)",
                  padding: "5px 8px",
                  borderRadius: "5px"
                }}>
                  <div>
                    <span style={{ fontSize: "12.5px", fontWeight: "800", color: "var(--text-main)" }}>
                      {orderMode === "sale" ? "Today Total Amount (Aaj Ka Bill):" : "Return Total Credit:"}
                    </span>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                      Suits (PKR {totalSuitAmount.toLocaleString()}) + TP (PKR {totalTpAmount.toLocaleString()})
                    </div>
                  </div>
                  <span style={{ fontSize: "15px", fontWeight: "800", color: "var(--text-main)" }}>
                    PKR {todayTotalAmount.toLocaleString()}
                  </span>
                </div>

                {/* Line 4: Pervs Amount (Previous Khata Balance) */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)" }}>
                      Pervs Amount (Previous Balance / Pichla Baqaya):
                    </span>
                  </div>
                  <span style={{ 
                    fontSize: "13px", 
                    fontWeight: "800", 
                    color: previousBalance > 0 ? "var(--accent-amber)" : previousBalance < 0 ? "var(--accent-green)" : "var(--text-muted)" 
                  }}>
                    {previousBalance > 0 
                      ? `+PKR ${previousBalance.toLocaleString()} (Payable)` 
                      : previousBalance < 0 
                        ? `-PKR ${Math.abs(previousBalance).toLocaleString()} (Advance)` 
                        : "PKR 0 (Nil)"}
                  </span>
                </div>

                {/* Line 5: Total sum (Grand Total Net Payable) */}
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "baseline", 
                  borderTop: "2px dashed var(--primary-border)", 
                  paddingTop: "6px",
                  marginTop: "2px"
                }}>
                  <div>
                    <span style={{ fontSize: "13.5px", fontWeight: "800", color: "var(--primary)" }}>
                      Total sum (Kul Rakam):
                    </span>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                      {orderMode === "sale" ? "Today's Bill + Previous Amount" : "Previous Amount - Return Credit"}
                    </div>
                  </div>
                  <span style={{ fontSize: "18px", fontWeight: "900", color: "var(--primary)" }}>
                    PKR {totalSum.toLocaleString()}
                  </span>
                </div>

                {orderMode === "sale" && (
                  <>
                    {/* Cash Received / Amount Paid Input */}
                    <div style={{ 
                      borderTop: "1px solid var(--border-light)", 
                      paddingTop: "6px", 
                      marginTop: "2px" 
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", flexWrap: "wrap", gap: "4px" }}>
                        <label className="form-label" style={{ marginBottom: 0, fontSize: "11px", fontWeight: "700" }}>
                          Amount Received Today / Paid (PKR)
                        </label>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button
                            type="button"
                            style={{
                              fontSize: "9.5px", padding: "1px 5px", borderRadius: "3px",
                              border: "1px solid var(--accent-green-border)", background: "var(--accent-green-light)",
                              color: "var(--accent-green)", fontWeight: "600", cursor: "pointer"
                            }}
                            onClick={() => setAmountPaid(String(todayTotalAmount))}
                          >
                            Bill Cash
                          </button>
                          {previousBalance > 0 && (
                            <button
                              type="button"
                              style={{
                                fontSize: "9.5px", padding: "1px 5px", borderRadius: "3px",
                                border: "1px solid var(--primary-border)", background: "var(--primary-light)",
                                color: "var(--primary)", fontWeight: "600", cursor: "pointer"
                              }}
                              onClick={() => setAmountPaid(String(Math.max(0, totalSum)))}
                            >
                              Clear Total
                            </button>
                          )}
                          <button
                            type="button"
                            style={{
                              fontSize: "9.5px", padding: "1px 5px", borderRadius: "3px",
                              border: "1px solid var(--accent-amber-border)", background: "var(--accent-amber-light)",
                              color: "var(--accent-amber)", fontWeight: "600", cursor: "pointer"
                            }}
                            onClick={() => setAmountPaid("0")}
                          >
                            All on Khata (0)
                          </button>
                        </div>
                      </div>

                      <input 
                        type="number"
                        min="0"
                        className="form-input"
                        placeholder={`e.g. ${todayTotalAmount}`}
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        style={{ fontWeight: "800", color: "var(--accent-green)", fontSize: "13.5px", height: "30px" }}
                      />
                    </div>

                    {/* Net Remaining Khata Status */}
                    <div style={{ 
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "5px 8px", 
                      background: netRemainingBalance > 0 ? "var(--accent-amber-light)" : "var(--accent-green-light)",
                      border: `1px solid ${netRemainingBalance > 0 ? "var(--accent-amber-border)" : "var(--accent-green-border)"}`,
                      borderRadius: "5px"
                    }}>
                      <span style={{ fontSize: "11.5px", fontWeight: "700", color: netRemainingBalance > 0 ? "var(--accent-amber)" : "var(--accent-green)" }}>
                        {netRemainingBalance > 0 
                          ? "Net Khata Due (Aapne Dene Hain):" 
                          : netRemainingBalance < 0 
                            ? "Advance Credit (Humne Dene Hain):" 
                            : "Khata Status:"}
                      </span>
                      <span style={{ fontSize: "14px", fontWeight: "800", color: netRemainingBalance > 0 ? "var(--accent-amber)" : "var(--accent-green)" }}>
                        {netRemainingBalance > 0 
                          ? `PKR ${netRemainingBalance.toLocaleString()}` 
                          : netRemainingBalance < 0 
                            ? `-PKR ${Math.abs(netRemainingBalance).toLocaleString()}` 
                            : "Fully Cleared (Hisab Nil)"}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Delivery / Cargo Note */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Optional delivery notes / cargo receipt # (e.g. Counter delivery, Bilal Cargo, etc.)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ fontSize: "11.5px", padding: "5px 8px" }}
                />
              </div>

            </div>

            {/* Sticky Footer Action Bar */}
            <div className="modal-footer" style={{ padding: "8px 16px" }}>
              <button type="button" className="btn-secondary" onClick={handleClose}>
                Cancel
              </button>
              
              <button 
                type="submit" 
                className={orderMode === "sale" ? "btn-primary" : "btn-warning"} 
                disabled={!hasAtLeastOneItem}
                style={{ minWidth: "250px", justifyContent: "center", fontSize: "12.5px" }}
              >
                {orderMode === "sale" 
                  ? `Confirm Sale (${totalSuitQty} Suits + ${totalTpMeters}m TP • PKR ${todayTotalAmount.toLocaleString()})`
                  : `Confirm Return (${totalSuitQty} Suits + ${totalTpMeters}m TP • -PKR ${todayTotalAmount.toLocaleString()})`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
