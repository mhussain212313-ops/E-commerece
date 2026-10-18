import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Calculates complete Khata metrics for an invoice:
 * - Current Bill
 * - Previous Khata Balance before this transaction
 * - Total Net Payable (Bill + Previous)
 * - Amount Paid / Received
 * - Net Remaining Balance (Remaining Khata Due or Customer Advance)
 */
export const calculateTxKhataMetrics = (client, invoice) => {
  const currentBill = Number(invoice.totalBill) || 0;
  const amountPaid = Number(invoice.amountPaid) || 0;

  // If explicit previousBalance was saved on the invoice transaction
  if (invoice.previousBalance !== undefined) {
    const previousBalance = Number(invoice.previousBalance) || 0;
    const totalPayable = previousBalance + currentBill;
    const netBalance = invoice.netBalance !== undefined 
      ? Number(invoice.netBalance) 
      : (totalPayable - amountPaid);
    return {
      previousBalance,
      totalBill: currentBill,
      totalPayable,
      amountPaid,
      netBalance
    };
  }

  // Otherwise calculate historical previous balance from client ledger
  const openingBalance = Number(client?.openingBalance) || 0;
  const txs = client?.transactions || [];
  const txIdx = txs.findIndex(t => t.id === invoice.id || t.invoiceNo === invoice.invoiceNo);

  let previousBalance = openingBalance;
  if (txIdx !== -1) {
    // Newer transactions come first (index 0). Older transactions are at indices > txIdx
    for (let i = txs.length - 1; i > txIdx; i--) {
      const pastTx = txs[i];
      previousBalance += (Number(pastTx.totalBill) || 0) - (Number(pastTx.amountPaid) || 0);
    }
  } else {
    // If not found in history, use current accumulated balance minus this transaction's net
    const pastBilled = txs.reduce((sum, t) => sum + (Number(t.totalBill) || 0), 0);
    const pastPaid = txs.reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);
    previousBalance = openingBalance + (pastBilled - pastPaid) - (currentBill - amountPaid);
  }

  const totalPayable = previousBalance + currentBill;
  const netBalance = totalPayable - amountPaid;

  return {
    previousBalance,
    totalBill: currentBill,
    totalPayable,
    amountPaid,
    netBalance
  };
};

/**
 * Formats a Pakistani phone number for WhatsApp Web API:
 * 03087687341 -> 923087687341
 * +923087687341 -> 923087687341
 */
export const formatWhatsAppPhone = (rawPhone) => {
  if (!rawPhone) return "";
  let digits = String(rawPhone).replace(/[^0-9]/g, "");
  if (digits.startsWith("0")) {
    digits = "92" + digits.slice(1);
  } else if (!digits.startsWith("92") && digits.length === 10) {
    digits = "92" + digits;
  }
  return digits;
};

/**
 * Opens WhatsApp Web directly with prefilled invoice message
 * and copies the message to clipboard as fallback.
 */
export const openWhatsAppInvoiceShare = ({ invoice, client, category, addToast }) => {
  const text = getWhatsAppShareText({ invoice, client, category });
  const phone = formatWhatsAppPhone(client?.phone);

  // Copy text to clipboard so it's always ready to paste
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  let url = "";

  if (isMobile) {
    url = phone && phone.length >= 10
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  } else {
    // Desktop: Direct WhatsApp Web
    url = phone && phone.length >= 10
      ? `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }

  window.open(url, "_blank", "noopener,noreferrer");

  if (addToast) {
    addToast(`WhatsApp Web opened for ${client?.name || "Client"}! Bill text copied to clipboard.`, "success");
  }
};

export const generateInvoicePDF = ({ invoice, client, category }) => {
  const doc = new jsPDF();
  const km = calculateTxKhataMetrics(client, invoice);

  // Colors matching Zeno theme
  const primaryColor = [112, 71, 235]; // #7047eb
  const darkTextColor = [30, 41, 59];  // #1e293b
  const mutedTextColor = [100, 116, 139]; // #64748b
  const successColor = [34, 197, 94];  // #22c55e

  // 1. Header & Brand Title
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 32, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("SALAHUDDIN FABRICS", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(240, 235, 255);
  doc.text("Men's Unstitched Shalwar Kameez Wholesale & B2B Supply", 14, 25);

  // Right Header Info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("TAX INVOICE / BILL", 196, 16, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(`No: ${invoice.invoiceNo}`, 196, 23, { align: "right" });

  // 2. Invoice Meta Details & Client Info
  doc.setTextColor(...darkTextColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("BILLED TO (CLIENT DETAILS):", 14, 42);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(client.name, 14, 48);

  doc.setFontSize(9.5);
  doc.setTextColor(...mutedTextColor);
  doc.text(`Shop: ${client.shopName || "N/A"}`, 14, 54);
  doc.text(`Location: ${client.city || "Pakistan"}`, 14, 60);
  doc.text(`Contact: ${client.phone || "N/A"}`, 14, 66);

  // Invoice Details right box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(125, 38, 71, 32, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...mutedTextColor);
  doc.text("Invoice Date:", 130, 46);
  doc.text("Payment Status:", 130, 54);
  doc.text("Currency:", 130, 62);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkTextColor);
  doc.text(invoice.date, 190, 46, { align: "right" });

  if (km.netBalance < 0) {
    doc.setTextColor(successColor[0], successColor[1], successColor[2]);
    doc.text("ADVANCE / OVERPAID", 190, 54, { align: "right" });
  } else if (km.netBalance === 0) {
    doc.setTextColor(successColor[0], successColor[1], successColor[2]);
    doc.text("PAID IN FULL", 190, 54, { align: "right" });
  } else {
    doc.setTextColor(217, 119, 6);
    doc.text("PARTIAL / ON KHATA", 190, 54, { align: "right" });
  }

  doc.setTextColor(...darkTextColor);
  doc.text("PKR (Pakistani Rupee)", 190, 62, { align: "right" });

  // 3. Itemized Table
  // Notice: Rate column and (4m each) completely removed as requested
  const items = Array.isArray(invoice.items) && invoice.items.length > 0 
    ? invoice.items 
    : [{
        categoryName: invoice.categoryName || category?.name || "Premium Fabric",
        saleType: invoice.saleType,
        quantity: invoice.quantity,
        meters: invoice.meters,
        ratePerMeter: invoice.ratePerMeter,
        itemTotal: invoice.totalBill
      }];

  const tableRows = items.map((item, idx) => [
    idx + 1,
    item.categoryName,
    item.saleType === "suits" ? "Standard Suits" : "Cut / Uncut Fabric",
    `${item.quantity} ${item.saleType === "suits" ? "Suits" : "Meters"}`,
    `${item.meters} m`,
    `PKR ${Number(item.itemTotal || (item.meters * item.ratePerMeter)).toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: 76,
    head: [["#", "Fabric Category / Color", "Cut / State", "Quantity", "Total Meters", "Amount"]],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9.5
    },
    bodyStyles: {
      fontSize: 9,
      textColor: darkTextColor
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 58 },
      2: { cellWidth: 46 },
      3: { cellWidth: 28, halign: "center" },
      4: { cellWidth: 26, halign: "center" },
      5: { cellWidth: 28, halign: "right" }
    }
  });

  const finalY = doc.lastAutoTable.finalY + 8;

  // 4. Financial Summary Breakdown Box (Detailed Khata Math)
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(105, finalY, 91, 56, 2, 2, "F");

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedTextColor);
  
  // Row 1: Current Bill
  doc.text("Current Bill Amount:", 110, finalY + 8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkTextColor);
  doc.text(`PKR ${km.totalBill.toLocaleString()}`, 190, finalY + 8, { align: "right" });

  // Row 2: Previous Khata Balance (Pichla Baqaya)
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedTextColor);
  doc.text("Previous Balance (Pichla Baqaya):", 110, finalY + 16);
  doc.setFont("helvetica", "bold");
  if (km.previousBalance > 0) {
    doc.setTextColor(217, 119, 6);
    doc.text(`+PKR ${km.previousBalance.toLocaleString()} (Payable)`, 190, finalY + 16, { align: "right" });
  } else if (km.previousBalance < 0) {
    doc.setTextColor(34, 197, 94);
    doc.text(`-PKR ${Math.abs(km.previousBalance).toLocaleString()} (Advance)`, 190, finalY + 16, { align: "right" });
  } else {
    doc.setTextColor(...darkTextColor);
    doc.text("PKR 0 (Nil)", 190, finalY + 16, { align: "right" });
  }

  // Row 3: Total Net Payable (Kul Rakam)
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedTextColor);
  doc.text("Total Net Payable (Kul Rakam):", 110, finalY + 24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text(`PKR ${km.totalPayable.toLocaleString()}`, 190, finalY + 24, { align: "right" });

  // Row 4: Amount Received / Paid Now
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedTextColor);
  doc.text("Amount Received / Paid:", 110, finalY + 32);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(34, 197, 94);
  doc.text(`PKR ${km.amountPaid.toLocaleString()}`, 190, finalY + 32, { align: "right" });

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.line(110, finalY + 36, 191, finalY + 36);

  // Row 5: Net Remaining Balance (Kul Baqaya)
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  if (km.netBalance > 0) {
    doc.setTextColor(220, 38, 38);
    doc.text("Remaining Due (Aapne Dene):", 110, finalY + 44);
    doc.setFontSize(10.5);
    doc.text(`PKR ${km.netBalance.toLocaleString()}`, 190, finalY + 44, { align: "right" });
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mutedTextColor);
    doc.text("* Khata debit balance pending payment", 110, finalY + 51);
  } else if (km.netBalance < 0) {
    doc.setTextColor(34, 197, 94);
    doc.text("Customer Credit (Humne Dene):", 110, finalY + 44);
    doc.setFontSize(10.5);
    doc.text(`-PKR ${Math.abs(km.netBalance).toLocaleString()}`, 190, finalY + 44, { align: "right" });
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mutedTextColor);
    doc.text("* Advance amount available in customer credit", 110, finalY + 51);
  } else {
    doc.setTextColor(34, 197, 94);
    doc.text("Net Remaining Balance:", 110, finalY + 44);
    doc.setFontSize(10.5);
    doc.text("PKR 0", 190, finalY + 44, { align: "right" });
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(34, 197, 94);
    doc.text("✓ Hisab clear / Paid in Full", 110, finalY + 51);
  }

  // 5. Notes & Authorized Signatory
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedTextColor);
  doc.text("Notes / Remarks:", 14, finalY + 10);
  doc.text(invoice.notes || "Standard wholesale delivery. Fabric checked for premium quality.", 14, finalY + 16, { maxWidth: 85 });

  doc.text("Authorized Signature & Stamp:", 14, finalY + 46);
  doc.line(14, finalY + 48, 70, finalY + 48);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(...mutedTextColor);
  doc.text("Salahuddin Fabrics • Fabric Market, Lahore/Faisalabad • Tel: +92-300-1234567 • Generated via Salahuddin Dashboard", 105, 286, { align: "center" });

  // Save / Download PDF
  doc.save(`${invoice.invoiceNo}_${client.name.replace(/\s+/g, "_")}.pdf`);
};

export const getWhatsAppShareText = ({ invoice, client, category }) => {
  const km = calculateTxKhataMetrics(client, invoice);
  const isPaid = km.netBalance <= 0;
  const statusEmoji = km.netBalance < 0 
    ? "💳 *CUSTOMER ADVANCE CREDIT (Humne Dene Hain)*" 
    : isPaid 
      ? "✅ *PAID IN FULL (Hisab Clear)*" 
      : "⏳ *PENDING ON KHATA (Aapne Dene Hain)*";
  
  const items = Array.isArray(invoice.items) && invoice.items.length > 0
    ? invoice.items
    : [{
        categoryName: invoice.categoryName || category?.name || "Premium Fabric",
        saleType: invoice.saleType,
        quantity: invoice.quantity,
        meters: invoice.meters,
        ratePerMeter: invoice.ratePerMeter,
        itemTotal: invoice.totalBill
      }];

  const itemsList = items.map((item, idx) => {
    return `${idx + 1}. *${item.categoryName}*\n   ✂️ ${item.quantity} ${item.saleType === "suits" ? "Suits" : "Meters"} (${item.meters}m) = *PKR ${Number(item.itemTotal || (item.meters * item.ratePerMeter)).toLocaleString()}*`;
  }).join("\n\n");

  const prevBalText = km.previousBalance > 0
    ? `📈 *Previous Khata (Pichla Baqaya):* PKR ${km.previousBalance.toLocaleString()} (Payable)`
    : km.previousBalance < 0
      ? `📉 *Previous Khata (Advance):* -PKR ${Math.abs(km.previousBalance).toLocaleString()}`
      : `✔️ *Previous Khata:* PKR 0 (Nil)`;

  const remBalText = km.netBalance > 0
    ? `🔴 *Net Khata Due (Aapne Dene Hain):* PKR ${km.netBalance.toLocaleString()}`
    : km.netBalance < 0
      ? `🟢 *Advance Credit (Humne Dene Hain):* -PKR ${Math.abs(km.netBalance).toLocaleString()}`
      : `🟢 *Net Balance:* PKR 0 (Hisab Clear)`;

  return `*SALAHUDDIN FABRICS - Men's Unstitched Wholesale* 👔✨
*Invoice:* ${invoice.invoiceNo}
*Date:* ${invoice.date}
----------------------------------------
*Client:* ${client.name}
*Shop:* ${client.shopName || "N/A"}
*City:* ${client.city || "Pakistan"}

*Items Details (${items.length} Fabric Collections):*
${itemsList}

----------------------------------------
🧾 *Current Bill:* PKR ${km.totalBill.toLocaleString()}
${prevBalText}
💰 *Total Payable (Kul Rakam):* PKR ${km.totalPayable.toLocaleString()}
💵 *Amount Paid / Received:* PKR ${km.amountPaid.toLocaleString()}
----------------------------------------
${remBalText}
*Status:* ${statusEmoji}
----------------------------------------
_Shukriya aapke business ka! Salahuddin Fabrics Wholesale._`;
};
