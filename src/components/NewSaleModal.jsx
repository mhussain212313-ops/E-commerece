import React, { useState, useEffect } from "react";
import { 
  TrendingUp, Scissors, Package, DollarSign, Calculator, 
  CheckCircle2, FileText, Share2, AlertCircle, Plus, Trash2, 
  Palette, ArrowRight
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { generateInvoicePDF, getWhatsAppShareText } from "../utils/pdfGenerator";

export const NewSaleModal = () => {
  const { 
    clients, categories, recordSale, modalState, 
    setModalState, addToast, getCategoryTotalMeters 
  } = useApp();

  const [clientId, setClientId] = useState(modalState.newSaleClientId || clients[0]?.id || "");
  
  // Multi-item state: each item is a fabric color/category line item
  const [items, setItems] = useState([
    {
      id: "item-1",
      categoryId: categories[0]?.id || "",
      saleType: "suits", // 'suits' or 'meters'
      quantity: 1
    }
  ]);

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

  const selectedClient = clients.find(c => c.id === clientId) || clients[0];

  // Add another fabric / color row
  const handleAddItem = () => {
    // Pick next category that hasn't been added yet, or default to first
    const usedCatIds = items.map(i => i.categoryId);
    const nextCat = categories.find(c => !usedCatIds.includes(c.id)) || categories[0];

    const newItem = {
      id: "item-" + Date.now(),
      categoryId: nextCat?.id || categories[0]?.id || "",
      saleType: "suits",
      quantity: 1
    };
    setItems(prev => [...prev, newItem]);
    addToast("Added another fabric row to the sale!", "info");
  };

  // Remove a fabric row
  const handleRemoveItem = (id) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  // Update item field
  const handleUpdateItem = (id, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      return { ...item, [field]: value };
    }));
  };

  // Calculate detailed items list with pricing & meters
  const calculatedItems = items.map(item => {
    const cat = categories.find(c => c.id === item.categoryId) || categories[0];
    const qty = Number(item.quantity) || 0;
    const rate = cat?.pricePerMeter || 400;
    const totalMeters = item.saleType === "suits" ? qty * 4 : qty;
    const itemTotal = totalMeters * rate;
    const availableMeters = cat ? getCategoryTotalMeters(cat) : 0;
    const hasEnough = totalMeters <= availableMeters;

    return {
      ...item,
      category: cat,
      categoryName: cat?.name || "Fabric",
      shortName: cat?.shortName || "Fabric",
      ratePerMeter: rate,
      meters: totalMeters,
      itemTotal,
      availableMeters,
      hasEnough
    };
  });

  // Grand Totals across all fabric items
  const grandTotalMeters = calculatedItems.reduce((sum, i) => sum + i.meters, 0);
  const grandSubtotal = calculatedItems.reduce((sum, i) => sum + i.itemTotal, 0);
  const totalBill = Math.max(0, grandSubtotal - (Number(discount) || 0));

  // If user hasn't typed an amount paid, default to totalBill
  const paid = amountPaid === "" ? totalBill : Number(amountPaid);
  const remainingBalance = Math.max(0, totalBill - paid);

  // Check if all items have enough stock
  const allItemsHaveStock = calculatedItems.every(i => i.hasEnough);
  const allItemsValid = calculatedItems.every(i => Number(i.quantity) > 0);

  const handleClose = () => {
    setModalState(prev => ({ ...prev, newSale: false, newSaleClientId: null }));
    setCompletedSale(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!allItemsHaveStock) {
      addToast("One or more fabric colors exceed available stock! Please review stock levels.", "error");
      return;
    }

    if (!allItemsValid) {
      addToast("Please enter valid quantities for all fabrics.", "error");
      return;
    }

    const payloadItems = calculatedItems.map(i => ({
      categoryId: i.categoryId,
      categoryName: i.categoryName,
      shortName: i.shortName,
      saleType: i.saleType,
      quantity: Number(i.quantity),
      meters: i.meters,
      ratePerMeter: i.ratePerMeter,
      itemTotal: i.itemTotal
    }));

    const result = recordSale({
      clientId,
      items: payloadItems,
      totalBill,
      amountPaid: paid,
      remainingBalance,
      notes
    });

    if (result) {
      setCompletedSale(result);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: "680px" }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="stat-icon-circle stat-icon-purple" style={{ width: "36px", height: "36px" }}>
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="modal-title">Record Wholesale Sale (B2B Khata)</h3>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Multi-color wholesale invoice with dynamic pricing & live inventory deduction
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={handleClose}>✕</button>
        </div>

        {completedSale ? (
          /* Success Screen with 1-Click Export Actions */
          <div className="modal-body" style={{ textAlign: "center", padding: "28px 24px" }}>
            <div style={{ 
              width: "56px", height: "56px", borderRadius: "50%", 
              background: "var(--accent-green-light)", color: "var(--accent-green)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 14px auto" 
            }}>
              <CheckCircle2 size={32} />
            </div>

            <h3 style={{ fontSize: "20px", fontWeight: "800", marginBottom: "6px" }}>
              Sale Successfully Recorded!
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "18px" }}>
              Invoice <strong>{completedSale.tx.invoiceNo}</strong> generated for{" "}
              <strong>{completedSale.client.name}</strong> ({completedSale.client.shopName}).
              Exact fabric stocks deducted automatically.
            </p>

            {/* Itemized Sold Fabrics Summary */}
            <div style={{ 
              background: "var(--bg-subtle)", padding: "14px", borderRadius: "var(--radius-md)", 
              border: "1px solid var(--border-light)", textAlign: "left", marginBottom: "20px",
              display: "flex", flexDirection: "column", gap: "8px", fontSize: "12.5px"
            }}>
              <div style={{ fontWeight: "700", color: "var(--primary)", borderBottom: "1px solid var(--border-light)", paddingBottom: "6px" }}>
                Items on Bill ({completedSale.items.length} Fabric Collections):
              </div>

              {completedSale.items.map((it, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>
                    {idx + 1}. <strong>{it.categoryName}</strong> &bull; {it.quantity} {it.saleType === "suits" ? "Suits (4m)" : "Meters"} ({it.meters}m)
                  </span>
                  <span style={{ fontWeight: "700" }}>PKR {it.itemTotal.toLocaleString()}</span>
                </div>
              ))}

              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed var(--border-input)", paddingTop: "8px", marginTop: "4px" }}>
                <span style={{ fontWeight: "700" }}>Grand Total Bill:</span>
                <strong style={{ fontSize: "14px" }}>PKR {completedSale.tx.totalBill.toLocaleString()}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Amount Paid:</span>
                <strong style={{ color: "var(--accent-green)" }}>PKR {completedSale.tx.amountPaid.toLocaleString()}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Remaining Balance:</span>
                <strong style={{ color: completedSale.tx.remainingBalance > 0 ? "var(--accent-amber)" : "var(--accent-green)" }}>
                  PKR {completedSale.tx.remainingBalance.toLocaleString()}
                </strong>
              </div>
            </div>

            {/* Export Buttons */}
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
                  const text = getWhatsAppShareText({
                    invoice: completedSale.tx,
                    client: completedSale.client,
                    category: completedSale.category
                  });
                  const cleanPhone = (completedSale.client.phone || "").replace(/[^0-9]/g, "");
                  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
                  window.open(url, "_blank");
                  addToast("Opening WhatsApp...", "info");
                }}
              >
                <Share2 size={16} />
                <span>Share to WhatsApp</span>
              </button>
            </div>

            <div style={{ marginTop: "20px" }}>
              <button className="btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={handleClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Multi-Item Sale Form */
          <form onSubmit={handleSubmit}>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Client Selection */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Select B2B Client</label>
                <select 
                  className="form-select"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  required
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.shopName} ({c.city})
                    </option>
                  ))}
                </select>
              </div>

              {/* Multi-Item Section Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Palette size={16} color="var(--primary)" />
                  <strong style={{ fontSize: "13.5px" }}>Fabrics & Colors on this Bill ({items.length})</strong>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: "5px 12px", fontSize: "12px", gap: "6px" }}
                  onClick={handleAddItem}
                >
                  <Plus size={14} />
                  <span>+ Add Another Fabric / Color</span>
                </button>
              </div>

              {/* Items List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {calculatedItems.map((item, index) => (
                  <div 
                    key={item.id}
                    style={{
                      background: "var(--bg-subtle)",
                      border: "1px solid var(--border-input)",
                      borderRadius: "var(--radius-md)",
                      padding: "14px",
                      position: "relative"
                    }}
                  >
                    {/* Item Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span 
                          style={{ 
                            width: "12px", height: "12px", borderRadius: "3px", 
                            backgroundColor: item.category?.colorCode || "#ccc",
                            border: "1px solid rgba(0,0,0,0.15)"
                          }} 
                        />
                        <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--primary)" }}>
                          Fabric #{index + 1}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          ({item.availableMeters}m available in stock)
                        </span>
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          style={{
                            background: "transparent", border: "none", cursor: "pointer",
                            color: "var(--accent-red)", padding: "2px 6px", borderRadius: "4px",
                            display: "flex", alignItems: "center", gap: "4px", fontSize: "11.5px"
                          }}
                          title="Remove this fabric"
                        >
                          <Trash2 size={14} />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    {/* Category Selector & Mode Toggle */}
                    <div className="form-row-2" style={{ marginBottom: "10px" }}>
                      <div>
                        <label className="form-label" style={{ fontSize: "12px", marginBottom: "4px" }}>
                          Fabric Color / Category
                        </label>
                        <select 
                          className="form-select"
                          value={item.categoryId}
                          onChange={(e) => handleUpdateItem(item.id, "categoryId", e.target.value)}
                        >
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name} — PKR {cat.pricePerMeter}/m
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="form-label" style={{ fontSize: "12px", marginBottom: "4px" }}>
                          Measurement Cut Mode
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                          <button
                            type="button"
                            style={{
                              padding: "7px 8px",
                              borderRadius: "6px",
                              border: item.saleType === "suits" ? "2px solid var(--primary)" : "1px solid var(--border-input)",
                              background: item.saleType === "suits" ? "var(--primary-light)" : "var(--bg-card)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "4px",
                              fontSize: "11.5px",
                              fontWeight: "600",
                              color: item.saleType === "suits" ? "var(--primary)" : "var(--text-main)"
                            }}
                            onClick={() => {
                              handleUpdateItem(item.id, "saleType", "suits");
                              handleUpdateItem(item.id, "quantity", Math.max(1, Math.round(Number(item.quantity) || 1)));
                            }}
                          >
                            <Package size={13} />
                            <span>Suits (4m)</span>
                          </button>

                          <button
                            type="button"
                            style={{
                              padding: "7px 8px",
                              borderRadius: "6px",
                              border: item.saleType === "meters" ? "2px solid var(--primary)" : "1px solid var(--border-input)",
                              background: item.saleType === "meters" ? "var(--primary-light)" : "var(--bg-card)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "4px",
                              fontSize: "11.5px",
                              fontWeight: "600",
                              color: item.saleType === "meters" ? "var(--primary)" : "var(--text-main)"
                            }}
                            onClick={() => handleUpdateItem(item.id, "saleType", "meters")}
                          >
                            <Scissors size={13} />
                            <span>Custom Meters</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Quantity & Item Subtotal */}
                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.2fr", gap: "10px", alignItems: "center" }}>
                      <div>
                        <label className="form-label" style={{ fontSize: "11.5px", marginBottom: "4px" }}>
                          {item.saleType === "suits" ? "Number of Suits (1, 2, 3...)" : "Length in Meters (e.g. 1, 1.5, 2.5)"}
                        </label>
                        <input 
                          type="number"
                          min={item.saleType === "suits" ? "1" : "0.1"}
                          step={item.saleType === "suits" ? "1" : "any"}
                          className="form-input"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, "quantity", e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <label className="form-label" style={{ fontSize: "11.5px", marginBottom: "4px" }}>
                          Rate / Meter
                        </label>
                        <input 
                          type="text"
                          className="form-input"
                          value={`PKR ${item.ratePerMeter}`}
                          disabled
                        />
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          {item.meters}m total
                        </div>
                        <div style={{ fontSize: "15px", fontWeight: "800", color: "var(--primary)" }}>
                          PKR {item.itemTotal.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Stock Alert if exceeded */}
                    {!item.hasEnough && (
                      <div style={{ 
                        marginTop: "8px", fontSize: "11px", color: "var(--accent-red)", 
                        display: "flex", alignItems: "center", gap: "4px", fontWeight: "600" 
                      }}>
                        <AlertCircle size={13} />
                        Only {item.availableMeters}m available in stock! Please adjust quantity.
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Another Fabric Prominent Button */}
              <button
                type="button"
                className="btn-secondary"
                style={{ 
                  width: "100%", justifyContent: "center", padding: "10px", 
                  borderStyle: "dashed", borderWidth: "2px" 
                }}
                onClick={handleAddItem}
              >
                <Plus size={16} />
                <span>+ Add Another Fabric / Color to this Bill</span>
              </button>

              {/* Grand Total & Payment Panel */}
              <div style={{ 
                background: "var(--bg-card)", 
                border: "2px solid var(--primary-border)", 
                borderRadius: "var(--radius-md)", 
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                boxShadow: "var(--shadow-sm)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "800", color: "var(--primary)" }}>
                    <Calculator size={16} /> WHOLESALE BILL SUMMARY
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {items.length} Fabric{items.length > 1 ? "s" : ""} &bull; {grandTotalMeters} Meters Total
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid var(--border-light)", paddingBottom: "10px" }}>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-main)" }}>Grand Total Bill:</span>
                  <span style={{ fontSize: "22px", fontWeight: "800", color: "var(--primary)" }}>
                    PKR {totalBill.toLocaleString()}
                  </span>
                </div>

                {/* Amount Paid Field & Quick Buttons */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Amount Paid / Received (PKR)</label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        style={{
                          fontSize: "11px", padding: "3px 10px", borderRadius: "4px",
                          border: "1px solid var(--accent-green-border)", background: "var(--accent-green-light)",
                          color: "var(--accent-green)", fontWeight: "600", cursor: "pointer"
                        }}
                        onClick={() => setAmountPaid(String(totalBill))}
                      >
                        Full Cash
                      </button>
                      <button
                        type="button"
                        style={{
                          fontSize: "11px", padding: "3px 10px", borderRadius: "4px",
                          border: "1px solid var(--accent-amber-border)", background: "var(--accent-amber-light)",
                          color: "var(--accent-amber)", fontWeight: "600", cursor: "pointer"
                        }}
                        onClick={() => setAmountPaid("0")}
                      >
                        All on Khata
                      </button>
                    </div>
                  </div>

                  <input 
                    type="number"
                    min="0"
                    max={totalBill}
                    className="form-input"
                    placeholder={`e.g. ${totalBill}`}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    style={{ fontWeight: "700", color: "var(--accent-green)", fontSize: "15px" }}
                  />
                </div>

                {/* Live Remaining Balance */}
                <div style={{ 
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 14px", 
                  background: remainingBalance > 0 ? "var(--accent-amber-light)" : "var(--accent-green-light)",
                  border: `1px solid ${remainingBalance > 0 ? "var(--accent-amber-border)" : "var(--accent-green-border)"}`,
                  borderRadius: "8px"
                }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: remainingBalance > 0 ? "var(--accent-amber)" : "var(--accent-green)" }}>
                    {remainingBalance > 0 ? "Remaining Balance (Client Khata Due):" : "Payment Status:"}
                  </span>
                  <span style={{ fontSize: "16px", fontWeight: "800", color: remainingBalance > 0 ? "var(--accent-amber)" : "var(--accent-green)" }}>
                    {remainingBalance > 0 ? `PKR ${remainingBalance.toLocaleString()}` : "Fully Paid (Settled)"}
                  </span>
                </div>
              </div>

              {/* Order Notes / Cargo */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Optional delivery notes / cargo receipt # (e.g. TCS, Bilal Cargo, Counter delivery)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Inventory Deduction Alert */}
              <div style={{ 
                display: "flex", alignItems: "center", gap: "6px", 
                fontSize: "11.5px", color: "var(--text-muted)" 
              }}>
                <CheckCircle2 size={14} color="var(--accent-green)" />
                <span>
                  <strong>Task 4 Automation:</strong> Total {grandTotalMeters}m fabric across all {items.length} selected colors will be deducted from live inventory instantly upon confirmation.
                </span>
              </div>
            </div>

            {/* Pinned Sticky Footer */}
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={handleClose}>
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={!allItemsHaveStock || !allItemsValid}
                style={{ minWidth: "220px", justifyContent: "center" }}
              >
                Confirm Sale ({items.length} Fabrics • PKR {totalBill.toLocaleString()})
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
