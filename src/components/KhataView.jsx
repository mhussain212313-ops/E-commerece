import React, { useState } from "react";
import { 
  Users, UserPlus, ShoppingCart, DollarSign, Clock, 
  ArrowLeft, Search, Phone, MapPin, Store, FileText, 
  Share2, Plus, Calendar, AlertCircle, CheckCircle2, ChevronRight, RotateCcw, Trash2
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { generateInvoicePDF, getWhatsAppShareText, openWhatsAppInvoiceShare } from "../utils/pdfGenerator";

export const KhataView = () => {
  const { 
    clients, selectedClientId, setSelectedClientId, 
    setModalState, addToast, categories, deleteClient 
  } = useApp();

  const [clientSearch, setClientSearch] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [deleteConfirmClient, setDeleteConfirmClient] = useState(null);

  // Selected client object
  const selectedClient = clients.find(c => c.id === selectedClientId) || null;

  // Filter clients list
  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                          c.shopName.toLowerCase().includes(clientSearch.toLowerCase()) ||
                          c.phone.includes(clientSearch);
    const matchesCity = filterCity === "all" || c.city.toLowerCase().includes(filterCity.toLowerCase());
    return matchesSearch && matchesCity;
  });

  // Calculate totals for a client
  const getClientMetrics = (client) => {
    const txs = client.transactions || [];
    const totalBilled = txs.reduce((sum, t) => sum + (Number(t.totalBill) || 0), 0);
    const totalPaid = txs.reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);
    const totalPending = (Number(client.openingBalance) || 0) + (totalBilled - totalPaid);
    
    // Total stock bought in suits & meters
    const totalSuitsBought = txs.filter(t => t.saleType === "suits").reduce((sum, t) => sum + Number(t.quantity || 0), 0);
    const totalMetersBought = txs.reduce((sum, t) => sum + Number(t.meters || 0), 0);

    return { totalBilled, totalPaid, totalPending, totalSuitsBought, totalMetersBought };
  };

  // PDF Download Handler
  const handleDownloadPDF = (tx, client) => {
    const cat = categories.find(c => c.id === tx.categoryId);
    generateInvoicePDF({ invoice: tx, client, category: cat });
    addToast(`PDF invoice ${tx.invoiceNo} downloaded!`, "success");
  };

  // WhatsApp Share Handler
  const handleWhatsAppShare = (tx, client) => {
    const cat = categories.find(c => c.id === tx.categoryId);
    openWhatsAppInvoiceShare({ invoice: tx, client, category: cat, addToast });
  };

  // ==========================================
  // VIEW A: CLIENT PROFILE & DETAILED LEDGER
  // ==========================================
  if (selectedClient) {
    const metrics = getClientMetrics(selectedClient);

    return (
      <div>
        {/* Subheader */}
        <div className="page-subheader">
          <div>
            <div className="breadcrumbs">
              <span 
                style={{ cursor: "pointer", color: "var(--primary)" }} 
                onClick={() => setSelectedClientId(null)}
              >
                &larr; Back to All Clients
              </span>
              <span>&rsaquo;</span>
              <span className="current">{selectedClient.name}</span>
            </div>
            <h1 className="page-title">{selectedClient.shopName}</h1>
            <p className="page-subtitle">
              Proprietor: <strong>{selectedClient.name}</strong> • Phone: {selectedClient.phone} • {selectedClient.city}
            </p>
          </div>

          <div className="subheader-actions">
            <button 
              className="btn-secondary"
              onClick={() => setModalState(prev => ({ 
                ...prev, 
                recordPayment: true, 
                paymentClientId: selectedClient.id 
              }))}
            >
              <DollarSign size={16} />
              <span>Receive Payment</span>
            </button>

            <button 
              className="btn-secondary"
              style={{ borderColor: "var(--accent-amber)", color: "var(--accent-amber)" }}
              onClick={() => setModalState(prev => ({ 
                ...prev, 
                recordReturn: true, 
                returnClientId: selectedClient.id 
              }))}
            >
              <RotateCcw size={16} />
              <span>Record Return / Wapsi</span>
            </button>

            <button 
              className="btn-primary"
              onClick={() => setModalState(prev => ({ 
                ...prev, 
                newSale: true, 
                newSaleClientId: selectedClient.id 
              }))}
            >
              <Plus size={16} />
              <span>+ New Sale to Client</span>
            </button>

            <button 
              className="btn-secondary"
              style={{ borderColor: "rgba(239, 68, 68, 0.4)", color: "#ef4444" }}
              title="Delete this client account"
              onClick={() => setDeleteConfirmClient(selectedClient)}
            >
              <Trash2 size={16} />
              <span>Delete Account</span>
            </button>
          </div>
        </div>

        <div className="main-content">
          {/* Client Financial Ledger Summary Cards */}
          <div className="stat-cards-grid">
            {/* Card 1: Total Billed */}
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-title">Total Billed Purchases</span>
                <div className="stat-icon-circle stat-icon-purple">
                  <ShoppingCart size={18} />
                </div>
              </div>
              <div className="stat-value">PKR {metrics.totalBilled.toLocaleString()}</div>
              <div className="stat-footer">
                <span style={{ color: "var(--text-muted)" }}>
                  {selectedClient.transactions?.length || 0} Total Orders
                </span>
              </div>
            </div>

            {/* Card 2: Total Paid */}
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-title">Total Amount Paid</span>
                <div className="stat-icon-circle stat-icon-green">
                  <DollarSign size={18} />
                </div>
              </div>
              <div className="stat-value" style={{ color: "var(--accent-green)" }}>
                PKR {metrics.totalPaid.toLocaleString()}
              </div>
              <div className="stat-footer">
                <span className="trend-badge trend-up">
                  <CheckCircle2 size={14} /> Cleared Payments
                </span>
              </div>
            </div>

            {/* Card 3: Total Pending Amount */}
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-title">Remaining Khata Balance</span>
                <div className="stat-icon-circle stat-icon-cyan">
                  <Clock size={18} />
                </div>
              </div>
              <div 
                className="stat-value" 
                style={{ color: metrics.totalPending > 0 ? "var(--accent-amber)" : "var(--accent-green)" }}
              >
                PKR {metrics.totalPending.toLocaleString()}
              </div>
              <div className="stat-footer">
                {metrics.totalPending > 0 ? (
                  <span className="trend-badge" style={{ color: "var(--accent-amber)" }}>
                    <AlertCircle size={14} /> Payment Due
                  </span>
                ) : (
                  <span className="trend-badge trend-up">Account Settled</span>
                )}
                {selectedClient.openingBalance > 0 && (
                  <span style={{ color: "var(--text-light)", marginLeft: "6px" }}>
                    (Inc. PKR {selectedClient.openingBalance} Opening)
                  </span>
                )}
              </div>
            </div>

            {/* Card 4: Total Fabric Volume Bought */}
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-title">Total Fabric Supplied</span>
                <div className="stat-icon-circle stat-icon-pink">
                  <Users size={18} />
                </div>
              </div>
              <div className="stat-value">{metrics.totalMetersBought} m</div>
              <div className="stat-footer">
                <span style={{ color: "var(--text-muted)" }}>
                  {metrics.totalSuitsBought} Suits + {metrics.totalMetersBought - (metrics.totalSuitsBought * 4)} Custom Meters
                </span>
              </div>
            </div>
          </div>

          {/* Daily Transactions Log Table */}
          <div className="zeno-card">
            <div className="zeno-card-header">
              <div className="card-title-group">
                <h3 className="card-title">Daily Transactions & Ledger History</h3>
                <p className="card-subtitle">
                  Itemized sales, standard suits vs custom meter cuts, and payment records
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className="btn-secondary"
                  style={{ padding: "6px 12px", fontSize: "12px" }}
                  onClick={() => {
                    if (selectedClient.transactions?.length > 0) {
                      handleDownloadPDF(selectedClient.transactions[0], selectedClient);
                    } else {
                      addToast("No transactions to print yet", "info");
                    }
                  }}
                >
                  <FileText size={14} />
                  <span>Print Latest Slip</span>
                </button>
              </div>
            </div>

            <div className="zeno-table-wrapper">
              <table className="zeno-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Date</th>
                    <th>Fabric Category</th>
                    <th>Sale Type</th>
                    <th>Quantity & Total Meters</th>
                    <th>Rate / Meter</th>
                    <th>Total Bill</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedClient.transactions || []).length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                        No transactions recorded for this client yet. Click "+ New Sale to Client" above to record a wholesale order!
                      </td>
                    </tr>
                  ) : (
                    (selectedClient.transactions || []).map((tx) => {
                      const isPayment = tx.saleType === "payment";
                      const isReturn = tx.saleType === "return";
                      const isPaid = Number(tx.remainingBalance) <= 0;

                      return (
                        <tr key={tx.id}>
                          <td>
                            <span style={{ fontWeight: "700", color: isReturn ? "var(--accent-amber)" : "var(--primary)" }}>
                              {tx.invoiceNo}
                            </span>
                          </td>
                          <td style={{ fontSize: "12.5px" }}>{tx.date}</td>
                          <td>
                            {isReturn ? (
                              <div>
                                <span className="badge" style={{ background: "rgba(245, 158, 11, 0.15)", color: "var(--accent-amber)", border: "1px solid rgba(245, 158, 11, 0.3)", marginBottom: "4px" }}>
                                  Return / Wapsi
                                </span>
                                <div style={{ fontWeight: "600" }}>{tx.categoryName}</div>
                              </div>
                            ) : tx.items && tx.items.length > 1 ? (
                              <div>
                                <span className="badge badge-purple" style={{ marginBottom: "4px" }}>
                                  {tx.items.length} Fabric Colors
                                </span>
                                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                  {tx.items.map(i => `${i.shortName || i.categoryName} (${i.quantity}${i.saleType === "suits" ? "s" : "m"})`).join(", ")}
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontWeight: "600" }}>{tx.categoryName}</span>
                            )}
                          </td>
                          <td>
                            {isPayment ? (
                              <span className="badge badge-paid">Payment / Cash</span>
                            ) : isReturn ? (
                              <span className="badge" style={{ background: "rgba(245, 158, 11, 0.15)", color: "var(--accent-amber)" }}>
                                {tx.returnType === "suits" ? "Returned Suits" : "Returned Meters"}
                              </span>
                            ) : tx.items && tx.items.length > 1 ? (
                              <span className="badge badge-purple">Multi-Cut Order</span>
                            ) : (
                              <span className="badge badge-purple">
                                {tx.saleType === "suits" ? "Standard Suits" : "Custom Meters"}
                              </span>
                            )}
                          </td>
                          <td>
                            {isPayment ? (
                              <span style={{ color: "var(--text-light)" }}>-</span>
                            ) : isReturn ? (
                              <div>
                                <span style={{ fontWeight: "700", color: "var(--accent-green)" }}>
                                  +{tx.meters}m Restocked
                                </span>
                                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                  +{tx.quantity} {tx.returnType === "suits" ? "Suits" : "Meters"}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span style={{ fontWeight: "700" }}>
                                  {tx.meters} Meters Total
                                </span>
                                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                  {tx.items && tx.items.length > 1 ? `${tx.items.length} collections` : `${tx.quantity} ${tx.saleType === "suits" ? "Suits" : "Meters"}`}
                                </div>
                              </div>
                            )}
                          </td>
                          <td>
                            {isPayment ? (
                              <span style={{ color: "var(--text-light)" }}>-</span>
                            ) : tx.items && tx.items.length > 1 ? (
                              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Mixed Rates</span>
                            ) : (
                              <span>PKR {tx.ratePerMeter}</span>
                            )}
                          </td>
                          <td>
                            {isReturn ? (
                              <strong style={{ fontSize: "14px", color: "var(--accent-amber)" }}>
                                -PKR {Math.abs(Number(tx.totalBill || tx.remainingBalance)).toLocaleString()}
                              </strong>
                            ) : (
                              <strong style={{ fontSize: "14px" }}>
                                PKR {Number(tx.totalBill).toLocaleString()}
                              </strong>
                            )}
                          </td>
                          <td>
                            {isReturn ? (
                              <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                                {tx.refundType === "cash" ? "Cash Paid" : "Khata Credit"}
                              </span>
                            ) : (
                              <span style={{ color: "var(--accent-green)", fontWeight: "700" }}>
                                PKR {Number(tx.amountPaid).toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td>
                            <span 
                              style={{ 
                                fontWeight: "700", 
                                color: isReturn 
                                  ? "var(--accent-green)" 
                                  : tx.remainingBalance > 0 
                                    ? "var(--accent-amber)" 
                                    : "var(--accent-green)" 
                              }}
                            >
                              {isReturn ? "-" : ""}PKR {Math.abs(Number(tx.remainingBalance)).toLocaleString()}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {!isPayment && (
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                                <button
                                  className="btn-secondary"
                                  style={{ padding: "6px 8px", borderRadius: "6px" }}
                                  title="Download PDF Bill Slip"
                                  onClick={() => handleDownloadPDF(tx, selectedClient)}
                                >
                                  <FileText size={14} />
                                </button>
                                <button
                                  className="btn-success"
                                  style={{ padding: "6px 8px", borderRadius: "6px" }}
                                  title="Share to WhatsApp"
                                  onClick={() => handleWhatsAppShare(tx, selectedClient)}
                                >
                                  <Share2 size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW B: CLIENT DIRECTORY / PROFILES LIST
  // ==========================================
  return (
    <div>
      {/* Subheader */}
      <div className="page-subheader">
        <div>
          <div className="breadcrumbs">
            <span>Dashboards</span>
            <span>&rsaquo;</span>
            <span className="current">B2B Khata (Ledger)</span>
          </div>
          <h1 className="page-title">Wholesale B2B Khata Directory</h1>
          <p className="page-subtitle">
            Manage regular wholesale buyers, daily credit ledgers, and dynamic sales
          </p>
        </div>

        <div className="subheader-actions">
          <button 
            className="btn-secondary"
            onClick={() => setModalState(prev => ({ ...prev, recordReturn: true }))}
          >
            <RotateCcw size={16} />
            <span>Record Return / Wapsi</span>
          </button>

          <button 
            className="btn-primary"
            onClick={() => setModalState(prev => ({ ...prev, addClient: true }))}
          >
            <UserPlus size={16} />
            <span>+ Add New B2B Client</span>
          </button>
        </div>
      </div>

      <div className="main-content">
        {/* Search & Filter Bar */}
        <div style={{ 
          display: "flex", gap: "16px", marginBottom: "24px", 
          flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" 
        }}>
          <div style={{ position: "relative", width: "360px", maxWidth: "100%" }}>
            <Search size={17} style={{ position: "absolute", left: "14px", top: "12px", color: "var(--text-light)" }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: "40px" }}
              placeholder="Search by client name, shop, or phone..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Market / City:</span>
            <select 
              className="form-select" 
              style={{ width: "160px" }}
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
            >
              <option value="all">All Markets</option>
              <option value="Lahore">Lahore</option>
              <option value="Faisalabad">Faisalabad</option>
              <option value="Karachi">Karachi</option>
              <option value="Rawalpindi">Rawalpindi</option>
              <option value="Peshawar">Peshawar</option>
            </select>
          </div>
        </div>

        {/* Client Profiles Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
          {filteredClients.map((client) => {
            const metrics = getClientMetrics(client);

            return (
              <div 
                key={client.id} 
                className="zeno-card" 
                style={{ 
                  cursor: "pointer", 
                  display: "flex", 
                  flexDirection: "column", 
                  justifyContent: "space-between",
                  transition: "all var(--transition-fast)"
                }}
                onClick={() => setSelectedClientId(client.id)}
              >
                <div>
                  {/* Client Card Header */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ 
                        width: "44px", height: "44px", borderRadius: "12px", 
                        background: "var(--primary-light)", color: "var(--primary)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: "800", fontSize: "17px", border: "1px solid var(--primary-border)"
                      }}>
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <h3 style={{ fontSize: "16px", fontWeight: "700" }}>{client.name}</h3>
                        <div style={{ fontSize: "12.5px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Store size={13} /> {client.shopName}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span className={`badge ${metrics.totalPending > 0 ? "badge-pending" : "badge-paid"}`}>
                        {metrics.totalPending > 0 ? "Pending Due" : "Settled"}
                      </span>
                      <button
                        type="button"
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--text-light)",
                          cursor: "pointer",
                          padding: "4px 6px",
                          borderRadius: "6px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.15s ease"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "#ef4444";
                          e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--text-light)";
                          e.currentTarget.style.background = "transparent";
                        }}
                        title={`Delete ${client.name} Account`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmClient(client);
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div style={{ 
                    display: "flex", flexDirection: "column", gap: "6px", 
                    fontSize: "12px", color: "var(--text-muted)",
                    padding: "10px 12px", background: "var(--bg-subtle)",
                    borderRadius: "var(--radius-sm)", marginBottom: "16px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Phone size={13} color="var(--primary)" /> {client.phone}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <MapPin size={13} color="var(--primary)" /> {client.city}
                    </div>
                  </div>

                  {/* Financial Mini Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-light)" }}>Total Billed</div>
                      <div style={{ fontSize: "15px", fontWeight: "700" }}>
                        PKR {metrics.totalBilled.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-light)" }}>Pending Khata</div>
                      <div 
                        style={{ 
                          fontSize: "15px", fontWeight: "800", 
                          color: metrics.totalPending > 0 ? "var(--accent-amber)" : "var(--accent-green)" 
                        }}
                      >
                        PKR {metrics.totalPending.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Open Ledger CTA Button */}
                <div style={{ 
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  paddingTop: "12px", borderTop: "1px solid var(--border-light)"
                }}>
                  <span style={{ fontSize: "12px", color: "var(--primary)", fontWeight: "600" }}>
                    View Complete Ledger ({client.transactions?.length || 0} bills)
                  </span>
                  <div style={{ 
                    width: "28px", height: "28px", borderRadius: "50%", 
                    background: "var(--primary-light)", color: "var(--primary)",
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Client Confirmation Modal */}
      {deleteConfirmClient && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmClient(null)}>
          <div className="modal-container" style={{ maxWidth: "460px" }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="stat-icon-circle" style={{ width: "38px", height: "38px", background: "rgba(239, 68, 68, 0.12)", color: "#ef4444" }}>
                  <Trash2 size={18} />
                </div>
                <div>
                  <h3 className="modal-title">Delete Client Account</h3>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Permanent removal from B2B Khata & Database
                  </p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setDeleteConfirmClient(null)}>✕</button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: "14px", lineHeight: "1.5", margin: "0 0 16px" }}>
                Are you sure you want to permanently delete <strong>{deleteConfirmClient.name}</strong> ({deleteConfirmClient.shopName})?
              </p>

              {getClientMetrics(deleteConfirmClient).totalPending > 0 ? (
                <div style={{
                  padding: "12px 14px", background: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "var(--radius-md)",
                  fontSize: "12.5px", color: "var(--accent-amber)", display: "flex", gap: "10px", alignItems: "flex-start"
                }}>
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <strong>Outstanding Pending Balance Notice:</strong>
                    <div>This client still has an unpaid pending balance of <strong>PKR {getClientMetrics(deleteConfirmClient).totalPending.toLocaleString()}</strong>. Deleting this account will permanently clear their ledger.</div>
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: "12px 14px", background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "var(--radius-md)",
                  fontSize: "12.5px", color: "var(--accent-green)", display: "flex", gap: "10px", alignItems: "center"
                }}>
                  <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Account Settled:</strong> This client's balance is PKR 0. Safe to remove from active directory.
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setDeleteConfirmClient(null)}>
                Cancel
              </button>
              <button 
                type="button" 
                style={{ 
                  background: "#ef4444", 
                  borderColor: "#ef4444", 
                  color: "#fff", 
                  display: "inline-flex", 
                  alignItems: "center", 
                  gap: "6px",
                  padding: "8px 16px",
                  borderRadius: "var(--radius-md)",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
                onClick={() => {
                  deleteClient(deleteConfirmClient.id);
                  setDeleteConfirmClient(null);
                }}
              >
                <Trash2 size={16} />
                <span>Yes, Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
