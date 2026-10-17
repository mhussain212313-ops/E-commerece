import React, { useState, useEffect } from "react";
import { DollarSign, CheckCircle2 } from "lucide-react";
import { useApp } from "../context/AppContext";

export const PaymentModal = () => {
  const { clients, recordPayment, modalState, setModalState } = useApp();

  const [clientId, setClientId] = useState(modalState.paymentClientId || clients[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (modalState.paymentClientId) {
      setClientId(modalState.paymentClientId);
    }
  }, [modalState.paymentClientId]);

  const selectedClient = clients.find(c => c.id === clientId) || clients[0];

  // Calculate current client pending
  const txs = selectedClient?.transactions || [];
  const billed = txs.reduce((s, t) => s + (Number(t.totalBill) || 0), 0);
  const paid = txs.reduce((s, t) => s + (Number(t.amountPaid) || 0), 0);
  const currentPending = (selectedClient?.openingBalance || 0) + (billed - paid);

  const handleClose = () => {
    setModalState(prev => ({ ...prev, recordPayment: false, paymentClientId: null }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0) return;

    recordPayment({
      clientId,
      amount: num,
      paymentMethod,
      note
    });

    handleClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="stat-icon-circle stat-icon-green" style={{ width: "36px", height: "36px" }}>
              <DollarSign size={18} />
            </div>
            <div>
              <h3 className="modal-title">Receive Payment on Khata</h3>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Credit cash against client's outstanding ledger balance
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={handleClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Client Account</label>
              <select 
                className="form-select"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.shopName})
                  </option>
                ))}
              </select>
            </div>

            {/* Current Khata Balance Box */}
            <div style={{ 
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 16px", background: "var(--bg-subtle)", 
              borderRadius: "var(--radius-md)", border: "1px solid var(--border-input)",
              marginBottom: "18px"
            }}>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Current Pending Due:</div>
                <div style={{ fontSize: "17px", fontWeight: "800", color: currentPending > 0 ? "var(--accent-amber)" : "var(--accent-green)" }}>
                  PKR {currentPending.toLocaleString()}
                </div>
              </div>
              {currentPending > 0 && (
                <button 
                  type="button" 
                  className="btn-secondary"
                  style={{ fontSize: "12px", padding: "6px 10px" }}
                  onClick={() => setAmount(String(currentPending))}
                >
                  Pay Full Balance
                </button>
              )}
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Amount Received (PKR) *</label>
                <input 
                  type="number"
                  min="1"
                  step="any"
                  className="form-input"
                  placeholder="e.g. 15000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select 
                  className="form-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="Cash">Cash at Counter</option>
                  <option value="Bank Transfer">Bank Transfer (Meezan / HBL / MCB)</option>
                  <option value="Raast">Raast Instant Transfer</option>
                  <option value="Cheque">Cross Cheque</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Transaction Reference / Receipt Note</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Cleared via online transfer or cash slip"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn-success">
              Credit Ledger Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
