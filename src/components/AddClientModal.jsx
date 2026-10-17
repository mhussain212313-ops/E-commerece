import React, { useState } from "react";
import { UserPlus, User, Store, Phone, MapPin, DollarSign } from "lucide-react";
import { useApp } from "../context/AppContext";

export const AddClientModal = () => {
  const { addClient, modalState, setModalState } = useApp();

  const [name, setName] = useState("");
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Lahore");
  const [openingBalance, setOpeningBalance] = useState("0");

  const handleClose = () => {
    setModalState(prev => ({ ...prev, addClient: false }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    addClient({
      name,
      shopName,
      phone,
      city,
      openingBalance: Number(openingBalance) || 0
    });

    handleClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="stat-icon-circle stat-icon-purple" style={{ width: "36px", height: "36px" }}>
              <UserPlus size={18} />
            </div>
            <div>
              <h3 className="modal-title">Add New B2B Khata Client</h3>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Create a dedicated ledger account for regular wholesale buyers
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={handleClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Client / Proprietor Name *</label>
              <div style={{ position: "relative" }}>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. Haji Muhammad Tariq"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Shop / Business Name</label>
              <div style={{ position: "relative" }}>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. Tariq Cloth Merchants"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">WhatsApp / Phone Number</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. +923001234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">City / Wholesale Market</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. Anarkali, Lahore"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Previous Opening Balance (PKR)</label>
              <input 
                type="number"
                min="0"
                step="any"
                className="form-input"
                placeholder="0"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
              />
              <div className="form-hint">
                Enter any existing pending ledger amount prior to system setup.
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Client Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
