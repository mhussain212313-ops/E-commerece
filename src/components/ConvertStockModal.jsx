import React, { useState, useEffect } from "react";
import { Repeat, ArrowRight, Package, Scissors, Box, AlertCircle, CheckCircle } from "lucide-react";
import { useApp } from "../context/AppContext";

export const ConvertStockModal = () => {
  const { categories, convertStock, modalState, setModalState } = useApp();

  const [categoryId, setCategoryId] = useState(modalState.convertCategoryId || categories[0]?.id || "");
  const [conversionType, setConversionType] = useState("thaan_to_packet");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (modalState.convertCategoryId) {
      setCategoryId(modalState.convertCategoryId);
    }
  }, [modalState.convertCategoryId]);

  const selectedCategory = categories.find(c => c.id === categoryId) || categories[0];

  const handleClose = () => {
    setModalState(prev => ({ ...prev, convertStock: false, convertCategoryId: null }));
  };

  const handleConvert = (e) => {
    e.preventDefault();
    const success = convertStock({
      categoryId,
      conversionType,
      quantity: Number(quantity)
    });
    if (success) {
      handleClose();
    }
  };

  // Preview Calculations
  const qty = Number(quantity) || 0;
  let deductText = "";
  let addText = "";
  let isAvailable = true;

  if (conversionType === "thaan_to_loose") {
    deductText = `${qty} Thaan Roll${qty > 1 ? "s" : ""}`;
    addText = `${qty * 24} Meters of Loose Fabric`;
    isAvailable = (selectedCategory?.stock?.thaan || 0) >= qty;
  } else if (conversionType === "thaan_to_packet") {
    deductText = `${qty} Thaan Roll${qty > 1 ? "s" : ""}`;
    addText = `${qty * 6} Ready Packet Suits (4m each)`;
    isAvailable = (selectedCategory?.stock?.thaan || 0) >= qty;
  } else if (conversionType === "loose_to_packet") {
    deductText = `${qty * 4} Meters of Loose Fabric`;
    addText = `${qty} Ready Packet Suit${qty > 1 ? "s" : ""}`;
    isAvailable = (selectedCategory?.stock?.looseMeters || 0) >= (qty * 4);
  } else if (conversionType === "packet_to_loose") {
    deductText = `${qty} Packet Suit${qty > 1 ? "s" : ""}`;
    addText = `${qty * 4} Meters of Loose Fabric`;
    isAvailable = (selectedCategory?.stock?.packetSuits || 0) >= qty;
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="stat-icon-circle stat-icon-purple" style={{ width: "36px", height: "36px" }}>
              <Repeat size={18} />
            </div>
            <div>
              <h3 className="modal-title">Stock Conversion Engine</h3>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Convert physical stock between Thaan Rolls, Loose Meters & Packet Suits
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={handleClose}>✕</button>
        </div>

        <form onSubmit={handleConvert}>
          <div className="modal-body">
            {/* 1. Category Selector */}
            <div className="form-group">
              <label className="form-label">Select Fabric Category</label>
              <select 
                className="form-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} (PKR {cat.pricePerMeter}/m)
                  </option>
                ))}
              </select>
            </div>

            {/* Current Stock Snapshot for chosen category */}
            <div style={{ 
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", 
              gap: "8px", background: "var(--bg-subtle)", 
              padding: "12px", borderRadius: "var(--radius-md)",
              marginBottom: "20px", fontSize: "12px", textAlign: "center"
            }}>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Thaan Available:</span>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--primary)" }}>
                  {selectedCategory?.stock?.thaan || 0}
                </div>
              </div>
              <div style={{ borderLeft: "1px solid var(--border-input)", borderRight: "1px solid var(--border-input)" }}>
                <span style={{ color: "var(--text-muted)" }}>Loose Available:</span>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--accent-cyan)" }}>
                  {selectedCategory?.stock?.looseMeters || 0} m
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Packets Available:</span>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--accent-green)" }}>
                  {selectedCategory?.stock?.packetSuits || 0}
                </div>
              </div>
            </div>

            {/* 2. Conversion Mode */}
            <div className="form-group">
              <label className="form-label">Conversion Operation</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ 
                  display: "flex", alignItems: "center", gap: "10px", 
                  padding: "10px 14px", border: "1px solid var(--border-input)", 
                  borderRadius: "8px", cursor: "pointer",
                  background: conversionType === "thaan_to_packet" ? "var(--primary-light)" : "var(--bg-card)"
                }}>
                  <input 
                    type="radio" 
                    name="conversionType"
                    checked={conversionType === "thaan_to_packet"}
                    onChange={() => setConversionType("thaan_to_packet")}
                  />
                  <div>
                    <strong style={{ fontSize: "13.5px" }}>Thaan ➔ Ready Packet Suits</strong>
                    <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                      1 Thaan yields 6 standard 4-meter ready packet suits
                    </div>
                  </div>
                </label>

                <label style={{ 
                  display: "flex", alignItems: "center", gap: "10px", 
                  padding: "10px 14px", border: "1px solid var(--border-input)", 
                  borderRadius: "8px", cursor: "pointer",
                  background: conversionType === "thaan_to_loose" ? "var(--primary-light)" : "var(--bg-card)"
                }}>
                  <input 
                    type="radio" 
                    name="conversionType"
                    checked={conversionType === "thaan_to_loose"}
                    onChange={() => setConversionType("thaan_to_loose")}
                  />
                  <div>
                    <strong style={{ fontSize: "13.5px" }}>Thaan ➔ Loose Stock Meters</strong>
                    <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                      1 Thaan rolls out into 24 uncut meters for custom cuts
                    </div>
                  </div>
                </label>

                <label style={{ 
                  display: "flex", alignItems: "center", gap: "10px", 
                  padding: "10px 14px", border: "1px solid var(--border-input)", 
                  borderRadius: "8px", cursor: "pointer",
                  background: conversionType === "loose_to_packet" ? "var(--primary-light)" : "var(--bg-card)"
                }}>
                  <input 
                    type="radio" 
                    name="conversionType"
                    checked={conversionType === "loose_to_packet"}
                    onChange={() => setConversionType("loose_to_packet")}
                  />
                  <div>
                    <strong style={{ fontSize: "13.5px" }}>Loose Meters ➔ Packet Suits</strong>
                    <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                      Pack 4 meters of loose fabric into 1 standard suit
                    </div>
                  </div>
                </label>

                <label style={{ 
                  display: "flex", alignItems: "center", gap: "10px", 
                  padding: "10px 14px", border: "1px solid var(--border-input)", 
                  borderRadius: "8px", cursor: "pointer",
                  background: conversionType === "packet_to_loose" ? "var(--primary-light)" : "var(--bg-card)"
                }}>
                  <input 
                    type="radio" 
                    name="conversionType"
                    checked={conversionType === "packet_to_loose"}
                    onChange={() => setConversionType("packet_to_loose")}
                  />
                  <div>
                    <strong style={{ fontSize: "13.5px" }}>Packet Suits ➔ Loose Meters</strong>
                    <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                      Unpack 1 suit back into 4 meters of loose uncut fabric
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* 3. Quantity to Convert */}
            <div className="form-group">
              <label className="form-label">
                Quantity to Convert ({conversionType.startsWith("thaan") ? "Thaan Rolls" : conversionType === "loose_to_packet" ? "Suits to Pack" : "Suits to Unpack"})
              </label>
              <input 
                type="number"
                min="1"
                step="1"
                className="form-input"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                required
              />
            </div>

            {/* Live Math Equation Visualization */}
            <div style={{ 
              background: isAvailable ? "var(--accent-green-light)" : "var(--accent-red-light)", 
              border: `1px solid ${isAvailable ? "var(--accent-green-border)" : "var(--accent-red-border)"}`,
              borderRadius: "var(--radius-md)", 
              padding: "14px",
              marginTop: "16px"
            }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: isAvailable ? "var(--accent-green)" : "var(--accent-red)", marginBottom: "6px" }}>
                {isAvailable ? "CONVERSION EQUATION PREVIEW" : "INSUFFICIENT STOCK WARNING"}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13.5px" }}>
                <span style={{ color: "var(--accent-red)", fontWeight: "700" }}>
                  - {deductText}
                </span>
                <ArrowRight size={18} color="var(--text-muted)" />
                <span style={{ color: "var(--accent-green)", fontWeight: "700" }}>
                  + {addText}
                </span>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!isAvailable}>
              Confirm Conversion
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
