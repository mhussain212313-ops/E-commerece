import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generateInvoicePDF = ({ invoice, client, category }) => {
  const doc = new jsPDF();

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

  const isFullPaid = Number(invoice.remainingBalance) <= 0;
  doc.setTextColor(isFullPaid ? successColor[0] : 217, isFullPaid ? successColor[1] : 119, isFullPaid ? successColor[2] : 6);
  doc.text(isFullPaid ? "PAID IN FULL" : "PARTIAL / ON KHATA", 190, 54, { align: "right" });

  doc.setTextColor(...darkTextColor);
  doc.text("PKR (Pakistani Rupee)", 190, 62, { align: "right" });

  // 3. Itemized Table (Supports Multi-Fabric / Multi-Color Line Items)
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
    item.saleType === "suits" ? "Standard Ready Suits (4m each)" : "Custom Cut Uncut Fabric",
    `${item.quantity} ${item.saleType === "suits" ? "Suits" : "Meters"}`,
    `${item.meters} m`,
    `PKR ${Number(item.ratePerMeter).toLocaleString()} / m`,
    `PKR ${Number(item.itemTotal || (item.meters * item.ratePerMeter)).toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: 76,
    head: [["#", "Fabric Category / Color", "Cut / State", "Quantity", "Total Meters", "Rate / Meter", "Amount"]],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9
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
      1: { cellWidth: 45 },
      2: { cellWidth: 42 },
      3: { cellWidth: 24, halign: "center" },
      4: { cellWidth: 22, halign: "center" },
      5: { cellWidth: 26, halign: "right" },
      6: { cellWidth: 25, halign: "right" }
    }
  });

  const finalY = doc.lastAutoTable.finalY + 10;

  // 4. Financial Summary Breakdown Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(115, finalY, 81, 38, 2, 2, "F");

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedTextColor);
  doc.text("Total Billed Amount:", 120, finalY + 9);
  doc.text("Amount Received / Paid:", 120, finalY + 19);
  doc.text("Remaining Balance (Khata):", 120, finalY + 29);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkTextColor);
  doc.text(`PKR ${Number(invoice.totalBill).toLocaleString()}`, 190, finalY + 9, { align: "right" });

  doc.setTextColor(34, 197, 94);
  doc.text(`PKR ${Number(invoice.amountPaid).toLocaleString()}`, 190, finalY + 19, { align: "right" });

  const remBal = Number(invoice.remainingBalance);
  doc.setTextColor(remBal > 0 ? 220 : 34, remBal > 0 ? 38 : 197, remBal > 0 ? 38 : 94);
  doc.text(`PKR ${remBal.toLocaleString()}`, 190, finalY + 29, { align: "right" });

  // 5. Notes & Authorized Signatory
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedTextColor);
  doc.text("Notes / Remarks:", 14, finalY + 10);
  doc.text(invoice.notes || "Standard wholesale delivery. Fabric checked for premium quality.", 14, finalY + 16, { maxWidth: 90 });

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
  const isPaid = Number(invoice.remainingBalance) <= 0;
  const statusEmoji = isPaid ? "✅ *PAID IN FULL*" : "⏳ *PENDING ON KHATA*";
  
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
    return `${idx + 1}. *${item.categoryName}*\n   ✂️ ${item.quantity} ${item.saleType === "suits" ? "Suits (4m each)" : "Meters"} (${item.meters}m) @ PKR ${item.ratePerMeter}/m = *PKR ${Number(item.itemTotal || (item.meters * item.ratePerMeter)).toLocaleString()}*`;
  }).join("\n\n");

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
💵 *Total Bill:* PKR ${Number(invoice.totalBill).toLocaleString()}
🟢 *Amount Paid:* PKR ${Number(invoice.amountPaid).toLocaleString()}
🔴 *Remaining Balance:* PKR ${Number(invoice.remainingBalance).toLocaleString()}
*Status:* ${statusEmoji}
----------------------------------------
_Shukriya aapke business ka! Salahuddin Fabrics Wholesale._`;
};
