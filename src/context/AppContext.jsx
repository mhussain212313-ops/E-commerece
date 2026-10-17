import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { FABRIC_CATEGORIES, INITIAL_CLIENTS, INITIAL_STOCK_LOGS } from "../data/initialData";
import { db, app, analytics } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Theme state: 'light' or 'dark'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("zeno_theme") || "light";
  });

  // Current active navigation module: 'dashboard' | 'inventory' | 'khata'
  const [activeModule, setActiveModule] = useState("dashboard");

  // Global search query
  const [searchQuery, setSearchQuery] = useState("");

  // Sidebar toggle state
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Categories & Live Stock State
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem("zeno_categories");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return FABRIC_CATEGORIES.map(cat => ({
      ...cat,
      stock: { ...cat.initialStock }
    }));
  });

  // Clients & Khata Ledger State
  const [clients, setClients] = useState(() => {
    const saved = localStorage.getItem("zeno_clients");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_CLIENTS;
  });

  // Selected client for detailed ledger view
  const [selectedClientId, setSelectedClientId] = useState(null);

  // Stock audit logs
  const [stockLogs, setStockLogs] = useState(() => {
    const saved = localStorage.getItem("zeno_stock_logs");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_STOCK_LOGS;
  });

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  // Active modals
  const [modalState, setModalState] = useState({
    newSale: false,
    newSaleClientId: null,
    convertStock: false,
    convertCategoryId: null,
    addStock: false,
    addStockCategoryId: null,
    addClient: false,
    recordPayment: false,
    paymentClientId: null,
    recordReturn: false,
    returnClientId: null,
    viewInvoice: false,
    currentInvoice: null,
    whatsAppShare: false,
    whatsAppData: null,
  });

  // Update HTML data-theme on change
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("zeno_theme", theme);
  }, [theme]);

  const isLoadedFromFirebase = useRef(false);

  // Load from Cloud Firestore on mount (falls back to localStorage)
  useEffect(() => {
    const loadFirebaseData = async () => {
      try {
        if (!db) return;
        const [catSnap, clientSnap, logsSnap] = await Promise.all([
          getDoc(doc(db, "zeno_store", "categories")),
          getDoc(doc(db, "zeno_store", "clients")),
          getDoc(doc(db, "zeno_store", "stockLogs")),
        ]);

        if (catSnap.exists() && Array.isArray(catSnap.data().list) && catSnap.data().list.length > 0) {
          setCategories(catSnap.data().list);
        } else {
          setDoc(doc(db, "zeno_store", "categories"), { list: categories }).catch(() => {});
        }

        if (clientSnap.exists() && Array.isArray(clientSnap.data().list) && clientSnap.data().list.length > 0) {
          setClients(clientSnap.data().list);
        } else {
          setDoc(doc(db, "zeno_store", "clients"), { list: clients }).catch(() => {});
        }

        if (logsSnap.exists() && Array.isArray(logsSnap.data().list) && logsSnap.data().list.length > 0) {
          setStockLogs(logsSnap.data().list);
        } else {
          setDoc(doc(db, "zeno_store", "stockLogs"), { list: stockLogs }).catch(() => {});
        }
      } catch (err) {
        console.warn("Firebase sync note (using local cache):", err);
      } finally {
        isLoadedFromFirebase.current = true;
      }
    };

    loadFirebaseData();
  }, []);

  // Sync to localStorage & Firebase Firestore
  useEffect(() => {
    localStorage.setItem("zeno_categories", JSON.stringify(categories));
    if (isLoadedFromFirebase.current && db) {
      setDoc(doc(db, "zeno_store", "categories"), { list: categories }).catch(err => {
        console.error("Firebase sync error (categories):", err);
      });
    }
  }, [categories]);

  useEffect(() => {
    localStorage.setItem("zeno_clients", JSON.stringify(clients));
    if (isLoadedFromFirebase.current && db) {
      setDoc(doc(db, "zeno_store", "clients"), { list: clients }).catch(err => {
        console.error("Firebase sync error (clients):", err);
      });
    }
  }, [clients]);

  useEffect(() => {
    localStorage.setItem("zeno_stock_logs", JSON.stringify(stockLogs));
    if (isLoadedFromFirebase.current && db) {
      setDoc(doc(db, "zeno_store", "stockLogs"), { list: stockLogs }).catch(err => {
        console.error("Firebase sync error (stockLogs):", err);
      });
    }
  }, [stockLogs]);

  // Toast Helper
  const addToast = (message, type = "success") => {
    const id = Date.now() + Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  // Helper calculations for any category
  const getCategoryTotalMeters = (cat) => {
    const thaanMeters = (cat.stock.thaan || 0) * 24;
    const looseMeters = cat.stock.looseMeters || 0;
    const packetMeters = (cat.stock.packetSuits || 0) * 4;
    return thaanMeters + looseMeters + packetMeters;
  };

  const getCategoryTotalValue = (cat) => {
    return getCategoryTotalMeters(cat) * cat.pricePerMeter;
  };

  // 1. BUSINESS AGGREGATE METRICS (Live Calculation for Task 4)
  const totalStockValue = categories.reduce((sum, cat) => sum + getCategoryTotalValue(cat), 0);

  const totalStockMeters = categories.reduce((sum, cat) => sum + getCategoryTotalMeters(cat), 0);

  const totalCashReceived = clients.reduce((sum, client) => {
    const clientPaid = (client.transactions || []).reduce((tSum, tx) => tSum + (Number(tx.amountPaid) || 0), 0);
    return sum + clientPaid;
  }, 0);

  const totalPendingAmount = clients.reduce((sum, client) => {
    const clientBilled = (client.transactions || []).reduce((tSum, tx) => tSum + (Number(tx.totalBill) || 0), 0);
    const clientPaid = (client.transactions || []).reduce((tSum, tx) => tSum + (Number(tx.amountPaid) || 0), 0);
    const clientPending = (client.openingBalance || 0) + (clientBilled - clientPaid);
    return sum + (clientPending > 0 ? clientPending : 0);
  }, 0);

  const totalClientsCount = clients.length;

  // 2. INVENTORY ACTIONS (Task 2)
  const addOrUpdateStock = (categoryId, { thaan = 0, looseMeters = 0, packetSuits = 0 }, note = "") => {
    setCategories(prev => prev.map(cat => {
      if (cat.id !== categoryId) return cat;
      const newStock = {
        thaan: Math.max(0, (cat.stock.thaan || 0) + Number(thaan)),
        looseMeters: Math.max(0, (cat.stock.looseMeters || 0) + Number(looseMeters)),
        packetSuits: Math.max(0, (cat.stock.packetSuits || 0) + Number(packetSuits)),
      };
      return { ...cat, stock: newStock };
    }));

    const cat = categories.find(c => c.id === categoryId);
    const newLog = {
      id: "log-" + Date.now(),
      timestamp: new Date().toLocaleString(),
      categoryId,
      categoryName: cat?.name || "Fabric",
      action: "add",
      details: note || `Stock updated: +${thaan} Thaan, +${looseMeters}m Loose, +${packetSuits} Packets`,
      deductions: "None",
      additions: `+${thaan} Thaan, +${looseMeters}m Loose, +${packetSuits} Packets`
    };
    setStockLogs(prev => [newLog, ...prev]);
    addToast(`Stock added successfully for ${cat?.shortName || "Fabric"}!`, "success");
  };

  const convertStock = ({ categoryId, conversionType, quantity }) => {
    const num = Number(quantity);
    if (!num || num <= 0) {
      addToast("Please enter a valid quantity to convert.", "error");
      return false;
    }

    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return false;

    let updated = false;

    setCategories(prev => prev.map(item => {
      if (item.id !== categoryId) return item;
      const current = { ...item.stock };

      // Conversion Types:
      // A) thaan_to_loose: 1 Thaan -> 24 Loose Meters
      if (conversionType === "thaan_to_loose") {
        if (current.thaan < num) {
          addToast(`Insufficient Thaan rolls! You have ${current.thaan} available.`, "error");
          return item;
        }
        current.thaan -= num;
        current.looseMeters += num * 24;
        updated = true;
      }
      // B) thaan_to_packet: 1 Thaan -> 6 Packet Suits
      else if (conversionType === "thaan_to_packet") {
        if (current.thaan < num) {
          addToast(`Insufficient Thaan rolls! You have ${current.thaan} available.`, "error");
          return item;
        }
        current.thaan -= num;
        current.packetSuits += num * 6;
        updated = true;
      }
      // C) loose_to_packet: 4 Meters Loose -> 1 Packet Suit
      else if (conversionType === "loose_to_packet") {
        const metersNeeded = num * 4;
        if (current.looseMeters < metersNeeded) {
          addToast(`Insufficient loose meters! Need ${metersNeeded}m, but only ${current.looseMeters}m available.`, "error");
          return item;
        }
        current.looseMeters -= metersNeeded;
        current.packetSuits += num;
        updated = true;
      }
      // D) packet_to_loose: 1 Packet Suit -> 4 Meters Loose
      else if (conversionType === "packet_to_loose") {
        if (current.packetSuits < num) {
          addToast(`Insufficient Packet suits! You have ${current.packetSuits} available.`, "error");
          return item;
        }
        current.packetSuits -= num;
        current.looseMeters += num * 4;
        updated = true;
      }

      return { ...item, stock: current };
    }));

    if (updated) {
      let desc = "";
      let ded = "";
      let add = "";
      if (conversionType === "thaan_to_loose") {
        desc = `Converted ${num} Thaan into ${num * 24} Meters of Loose Stock`;
        ded = `-${num} Thaan`;
        add = `+${num * 24} Meters Loose`;
      } else if (conversionType === "thaan_to_packet") {
        desc = `Converted ${num} Thaan into ${num * 6} Ready Packet Suits`;
        ded = `-${num} Thaan`;
        add = `+${num * 6} Packet Suits`;
      } else if (conversionType === "loose_to_packet") {
        desc = `Packed ${num * 4}m loose fabric into ${num} Standard Suits`;
        ded = `-${num * 4} Meters Loose`;
        add = `+${num} Packet Suits`;
      } else if (conversionType === "packet_to_loose") {
        desc = `Unpacked ${num} Suits into ${num * 4} Meters Loose Stock`;
        ded = `-${num} Packet Suits`;
        add = `+${num * 4} Meters Loose`;
      }

      const newLog = {
        id: "log-" + Date.now(),
        timestamp: new Date().toLocaleString(),
        categoryId,
        categoryName: cat.name,
        action: "convert",
        details: desc,
        deductions: ded,
        additions: add
      };
      setStockLogs(prev => [newLog, ...prev]);
      addToast(desc, "success");
      return true;
    }
    return false;
  };

  // 3. B2B KHATA ACTIONS (Task 3)
  const addClient = ({ name, shopName, phone, city, openingBalance = 0 }) => {
    if (!name.trim()) {
      addToast("Client Name is required", "error");
      return false;
    }

    const newClient = {
      id: "client-" + Date.now(),
      name: name.trim(),
      shopName: shopName.trim() || name.trim() + " Cloth Store",
      phone: phone.trim() || "+923000000000",
      city: city.trim() || "Pakistan",
      openingBalance: Number(openingBalance) || 0,
      createdDate: new Date().toISOString().split("T")[0],
      transactions: []
    };

    setClients(prev => [newClient, ...prev]);
    addToast(`Client "${newClient.name}" added to B2B Khata!`, "success");
    return newClient;
  };

  const deleteClient = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return false;

    setClients(prev => prev.filter(c => c.id !== clientId));
    if (selectedClientId === clientId) {
      setSelectedClientId(null);
    }
    addToast(`Client "${client.name}" (${client.shopName}) deleted from B2B Khata.`, "info");
    return true;
  };

  // Helper to deduct stock from category when sale is made (Task 4 Linkage)
  const deductStockForSale = (categoryId, saleType, quantity, totalMeters) => {
    let deductionReport = "";
    setCategories(prev => prev.map(cat => {
      if (cat.id !== categoryId) return cat;
      const current = { ...cat.stock };

      if (saleType === "suits") {
        const suitsNeeded = Number(quantity);
        if (current.packetSuits >= suitsNeeded) {
          current.packetSuits -= suitsNeeded;
          deductionReport = `Deducted ${suitsNeeded} Packet Suits from stock`;
        } else {
          // Deduct whatever packet suits are available
          const availablePackets = current.packetSuits;
          const remainingSuits = suitsNeeded - availablePackets;
          current.packetSuits = 0;
          const metersNeeded = remainingSuits * 4;

          if (current.looseMeters >= metersNeeded) {
            current.looseMeters -= metersNeeded;
            deductionReport = `Deducted ${availablePackets} Packets & ${metersNeeded}m from Loose Stock`;
          } else {
            // Deduct available loose meters and convert thaan
            const avMeters = current.looseMeters;
            current.looseMeters = 0;
            const diffMeters = metersNeeded - avMeters;
            const thaanToDeduct = Math.ceil(diffMeters / 24);
            current.thaan = Math.max(0, current.thaan - thaanToDeduct);
            // Remaining meters after thaan conversion returned to loose
            const surplusMeters = (thaanToDeduct * 24) - diffMeters;
            current.looseMeters += Math.max(0, surplusMeters);
            deductionReport = `Deducted ${availablePackets} Packets, ${avMeters}m Loose & converted ${thaanToDeduct} Thaan`;
          }
        }
      } else {
        // Custom meters sale
        const metersNeeded = Number(totalMeters);
        if (current.looseMeters >= metersNeeded) {
          current.looseMeters -= metersNeeded;
          deductionReport = `Deducted ${metersNeeded}m from Loose Stock`;
        } else {
          const avLoose = current.looseMeters;
          const remainingMeters = metersNeeded - avLoose;
          current.looseMeters = 0;

          // Try packet suits
          const packetsNeeded = Math.ceil(remainingMeters / 4);
          if (current.packetSuits >= packetsNeeded) {
            current.packetSuits -= packetsNeeded;
            const surplusMeters = (packetsNeeded * 4) - remainingMeters;
            current.looseMeters += surplusMeters;
            deductionReport = `Deducted ${avLoose}m Loose & ${packetsNeeded} Packets (${surplusMeters}m surplus to Loose)`;
          } else {
            // Deduct thaan
            const thaanNeeded = Math.ceil(remainingMeters / 24);
            current.thaan = Math.max(0, current.thaan - thaanNeeded);
            const surplusMeters = (thaanNeeded * 24) - remainingMeters;
            current.looseMeters += Math.max(0, surplusMeters);
            deductionReport = `Deducted ${avLoose}m Loose & opened ${thaanNeeded} Thaan`;
          }
        }
      }

      return { ...cat, stock: current };
    }));

    return deductionReport;
  };

  // 4. RECORD SALE (Dynamic Multi-Item / Multi-Color Selling Logic with Instant Inventory Deduction)
  const recordSale = ({
    clientId,
    items = [], // Array of { categoryId, categoryName, shortName, saleType, quantity, meters, ratePerMeter, itemTotal }
    categoryId,
    saleType = "suits",
    quantity = 1,
    ratePerMeter,
    totalBill,
    amountPaid = 0,
    remainingBalance = 0,
    notes = ""
  }) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) {
      addToast("Invalid client selection", "error");
      return null;
    }

    // Normalize items array
    let saleItems = Array.isArray(items) && items.length > 0 ? items : [];
    if (saleItems.length === 0) {
      const cat = categories.find(c => c.id === categoryId);
      if (!cat) {
        addToast("Please select a fabric category", "error");
        return null;
      }
      const qty = Number(quantity);
      const totalM = saleType === "suits" ? qty * 4 : qty;
      const rate = Number(ratePerMeter) || cat.pricePerMeter;
      saleItems = [{
        categoryId: cat.id,
        categoryName: cat.name,
        shortName: cat.shortName,
        saleType,
        quantity: qty,
        meters: totalM,
        ratePerMeter: rate,
        itemTotal: totalM * rate
      }];
    }

    // Verify stock availability for ALL items before deducting
    for (const item of saleItems) {
      const cat = categories.find(c => c.id === item.categoryId);
      if (!cat) {
        addToast(`Invalid fabric category for item`, "error");
        return null;
      }
      const availableCategoryMeters = getCategoryTotalMeters(cat);
      if (item.meters > availableCategoryMeters) {
        addToast(`Cannot sell ${item.meters}m of ${cat.shortName}! Only ${availableCategoryMeters}m available in total stock.`, "error");
        return null;
      }
    }

    // Deduct exact stock for each item from live inventory (Task 4)
    const deductionLogs = [];
    for (const item of saleItems) {
      const deductionNote = deductStockForSale(item.categoryId, item.saleType, item.quantity, item.meters);
      deductionLogs.push(`${item.shortName || item.categoryName} (${item.quantity} ${item.saleType === "suits" ? "Suits" : "m"}): ${deductionNote}`);
    }

    const calculatedTotalBill = Number(totalBill) || saleItems.reduce((sum, i) => sum + (Number(i.itemTotal) || 0), 0);
    const paid = Number(amountPaid);
    const balance = Number(remainingBalance);
    const invoiceNo = `INV-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const totalMetersAll = saleItems.reduce((sum, i) => sum + Number(i.meters || 0), 0);

    const newTx = {
      id: "tx-" + Date.now(),
      invoiceNo,
      date: new Date().toISOString().split("T")[0],
      items: saleItems,
      // Backwards compatible fields:
      categoryId: saleItems[0]?.categoryId,
      categoryName: saleItems.map(i => `${i.shortName || i.categoryName} (${i.quantity} ${i.saleType === "suits" ? "Suits" : "m"})`).join(", "),
      saleType: saleItems.length === 1 ? saleItems[0].saleType : "multi",
      quantity: saleItems.reduce((sum, i) => sum + Number(i.quantity || 0), 0),
      meters: totalMetersAll,
      ratePerMeter: saleItems[0]?.ratePerMeter || 400,
      totalBill: calculatedTotalBill,
      amountPaid: paid,
      remainingBalance: balance,
      notes: notes || `Wholesale sale: ${saleItems.length} fabric types (${totalMetersAll}m total)`
    };

    // Update Client Ledger
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      return {
        ...c,
        transactions: [newTx, ...(c.transactions || [])]
      };
    }));

    // Log to stock history
    const newLog = {
      id: "log-" + Date.now(),
      timestamp: new Date().toLocaleString(),
      categoryId: saleItems[0]?.categoryId,
      categoryName: `${saleItems.length} Fabric Collections`,
      action: "sale",
      details: `Sale to ${client.name} (${invoiceNo}): ${deductionLogs.join("; ")}`,
      deductions: `-${totalMetersAll}m across ${saleItems.length} fabrics`,
      additions: `+PKR ${calculatedTotalBill.toLocaleString()} (Paid: PKR ${paid.toLocaleString()})`
    };
    setStockLogs(prev => [newLog, ...prev]);

    addToast(`Sale recorded! Invoice ${invoiceNo} generated with ${saleItems.length} fabric item${saleItems.length > 1 ? "s" : ""}.`, "success");

    return {
      tx: newTx,
      client,
      items: saleItems,
      category: categories.find(c => c.id === saleItems[0]?.categoryId)
    };
  };

  // 5. RECORD PAYMENT (Collecting cash on existing khata balance)
  const recordPayment = ({ clientId, amount, paymentMethod = "Cash", note = "" }) => {
    const num = Number(amount);
    if (!num || num <= 0) {
      addToast("Please enter a valid payment amount", "error");
      return false;
    }

    const client = clients.find(c => c.id === clientId);
    if (!client) return false;

    const receiptNo = `REC-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const newPaymentTx = {
      id: "tx-" + Date.now(),
      invoiceNo: receiptNo,
      date: new Date().toISOString().split("T")[0],
      categoryId: "payment",
      categoryName: "Cash Received / Ledger Payment",
      saleType: "payment",
      quantity: 0,
      meters: 0,
      ratePerMeter: 0,
      totalBill: 0,
      amountPaid: num,
      remainingBalance: -num, // Reduces ledger balance
      notes: `${paymentMethod} payment received. ${note}`
    };

    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      return {
        ...c,
        transactions: [newPaymentTx, ...(c.transactions || [])]
      };
    }));

    addToast(`Received PKR ${num.toLocaleString()} from ${client.name}! Ledger updated.`, "success");
    return true;
  };

  // 6. RECORD STOCK RETURN / WAPSI (Task: Sales Return with automatic restock & ledger balance adjustment)
  const recordReturn = ({
    clientId,
    categoryId,
    returnType = "suits", // 'suits' (4m standard suit) or 'meters'
    quantity = 1,
    ratePerMeter,
    refundType = "khata", // 'khata' (credit note / deduct pending) or 'cash' (cash refunded)
    note = ""
  }) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) {
      addToast("Please select a valid client", "error");
      return false;
    }
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) {
      addToast("Please select a fabric category", "error");
      return false;
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      addToast("Please enter a valid return quantity", "error");
      return false;
    }

    const rate = Number(ratePerMeter) || cat.pricePerMeter;
    const totalMeters = returnType === "suits" ? qty * 4 : qty;
    const returnAmount = totalMeters * rate;
    const returnSlipNo = `RET-${String(Math.floor(Math.random() * 9000) + 1000)}`;

    // 1. ADD RETURNED FABRIC BACK TO INVENTORY STOCK
    setCategories(prev => prev.map(c => {
      if (c.id !== categoryId) return c;
      const currentStock = { ...c.stock };
      if (returnType === "suits") {
        currentStock.packetSuits = (currentStock.packetSuits || 0) + qty;
      } else {
        currentStock.looseMeters = (currentStock.looseMeters || 0) + qty;
      }
      return { ...c, stock: currentStock };
    }));

    // 2. CREATE RETURN TRANSACTION IN CLIENT'S KHATA LEDGER
    const newReturnTx = {
      id: "tx-" + Date.now(),
      invoiceNo: returnSlipNo,
      date: new Date().toISOString().split("T")[0],
      categoryId: cat.id,
      categoryName: `${cat.name}`,
      shortName: cat.shortName,
      saleType: "return",
      returnType,
      quantity: qty,
      meters: totalMeters,
      ratePerMeter: rate,
      totalBill: refundType === "khata" ? -returnAmount : 0,
      amountPaid: 0,
      remainingBalance: refundType === "khata" ? -returnAmount : 0,
      refundType,
      notes: note || `Stock Return: ${qty} ${returnType === "suits" ? "Packet Suits" : "Loose Meters"} (${totalMeters}m) returned back to stock. ${refundType === "khata" ? "Khata Credited" : "Cash Refunded"}.`
    };

    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      return {
        ...c,
        transactions: [newReturnTx, ...(c.transactions || [])]
      };
    }));

    // 3. LOG TO INVENTORY STOCK AUDIT HISTORY
    const newLog = {
      id: "log-" + Date.now(),
      timestamp: new Date().toLocaleString(),
      categoryId: cat.id,
      categoryName: cat.name,
      action: "return",
      details: `Return from ${client.name} (${returnSlipNo}): +${qty} ${returnType === "suits" ? "Packet Suits" : "Loose Meters"} restored to live stock`,
      deductions: refundType === "khata" ? `Khata Credited: -PKR ${returnAmount.toLocaleString()}` : "Cash Refunded to Client",
      additions: `+${qty} ${returnType === "suits" ? "Packet Suits" : "Loose Meters"} (${totalMeters}m)`
    };
    setStockLogs(prev => [newLog, ...prev]);

    addToast(`Stock Return accepted! +${qty} ${returnType === "suits" ? "Suits" : "Meters"} restored to ${cat.shortName} & Khata adjusted!`, "success");
    return true;
  };

  // Reset to default demo data
  const resetToDemo = () => {
    localStorage.removeItem("zeno_categories");
    localStorage.removeItem("zeno_clients");
    localStorage.removeItem("zeno_stock_logs");
    setCategories(FABRIC_CATEGORIES.map(cat => ({
      ...cat,
      stock: { ...cat.initialStock }
    })));
    setClients(INITIAL_CLIENTS);
    setStockLogs(INITIAL_STOCK_LOGS);
    addToast("Reset to pristine factory demo data successfully!", "success");
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        activeModule,
        setActiveModule,
        searchQuery,
        setSearchQuery,
        sidebarOpen,
        setSidebarOpen,
        categories,
        clients,
        stockLogs,
        selectedClientId,
        setSelectedClientId,
        toasts,
        addToast,
        removeToast,
        modalState,
        setModalState,
        // Aggregates
        totalStockValue,
        totalStockMeters,
        totalCashReceived,
        totalPendingAmount,
        totalClientsCount,
        getCategoryTotalMeters,
        getCategoryTotalValue,
        // Actions
        addOrUpdateStock,
        convertStock,
        addClient,
        deleteClient,
        recordSale,
        recordPayment,
        recordReturn,
        resetToDemo,
        // Firebase references
        db,
        app,
        analytics
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
