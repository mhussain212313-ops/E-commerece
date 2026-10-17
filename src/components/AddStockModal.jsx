import React, { useState, useEffect } from "react";
import { Plus, Package, Scissors, Box } from "lucide-react";
import { useApp } from "../context/AppContext";

export const AddStockModal = () => {
  const { categories, addOrUpdateStock, modalState, setModalState } = useApp();

  const [categoryId, setCategoryId] = useState(modalState.addStockCategoryId || categories[0]?.id || "");
  const [thaan, setThaan] = useState("");
  const [looseMeters, setLooseMeters] = useState("");
  const [packetSuits, setPacketSuits] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (modalState.addStockCategoryId) {
      setCategoryId(modalState.addStockCategoryId);
    }
  }, [modalState.addStockCategoryId]);

  const selectedCategory = categories.find(c => c.id === categoryId) || categories[0];

  const handleClose = () => {
    setModalState(prev => ({ ...prev, addStock: false, addStockCategoryId: null }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const t = Number(thaan) || 0;
    const l = Number(looseMeters) || 0;
    const p = Number(packetSuits) || 0;

    if (t === 0 && l === 0 && p === 0) {
      return;
    }

    addOrUpdateStock(categoryId, { thaan: t, looseMeters: l, packetSuits: p }, note);
    handleClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="stat-icon-circle stat-icon-green" style={{ width: "36px", height: "36px" }}>
              <Plus size={18} />
            </div>
            <div>
              <h3 className="modal-title">Add / Adjust Factory Stock</h3>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Add incoming rolls, uncut yardage, or stitched packets
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={handleClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Fabric Category</label>
              <select 
                className="form-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} (Current: {cat.stock.thaan} Thaan, {cat.stock.looseMeters}m Loose, {cat.stock.packetSuits} Packets)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Package size={14} color="var(--primary)" />
                Add Thaan Rolls (1 Thaan = 6 suits / 24m)
              </label>
              <input 
                type="number"
                min="0"
                step="1"
                className="form-input"
                placeholder="e.g. 5"
                value={thaan}
                onChange={(e) => setThaan(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Scissors size={14} color="var(--accent-cyan)" />
                Add Loose Uncut Fabric (Meters)
              </label>
              <input 
                type="number"
                min="0"
                step="0.5"
                className="form-input"
                placeholder="e.g. 40"
                value={looseMeters}
                onChange={(e) => setLooseMeters(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Box size={14} color="var(--accent-green)" />
                Add Ready Packet Suits (4m each)
              </label>
              <input 
                type="number"
                min="0"
                step="1"
                className="form-input"
                placeholder="e.g. 15"
                value={packetSuits}
                onChange={(e) => setPacketSuits(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Shipment Reference / Note (Optional)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Mill delivery Lot #412"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Stock Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
