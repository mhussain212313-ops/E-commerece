// ========================================================
// INITIAL DATA & SPECIFICATIONS
// Men's Unstitched Shalwar Kameez Business
// ========================================================

export const FABRIC_CATEGORIES = [
  {
    id: "cat-1",
    name: "Light Theme - Off-White",
    shortName: "Off-White",
    theme: "Light Theme",
    pricePerMeter: 400,
    suitMeters: 4,
    suitPrice: 1600, // 4 * 400
    thaanMeters: 24, // 6 suits * 4m
    thaanSuits: 6,
    colorCode: "#f8f5ee",
    borderCode: "#e2dec9",
    tagColor: "#854d0e",
    tagBg: "#fef9c3",
    description: "Premium cotton blend off-white unstitched fabric for summer and all-season wear.",
    initialStock: {
      thaan: 28,          // 28 rolls = 168 suits = 672m
      looseMeters: 140,   // 140 uncut meters
      packetSuits: 45     // 45 ready-to-deliver suits = 180m
    }
  },
  {
    id: "cat-2",
    name: "Light Theme - Cream",
    shortName: "Cream",
    theme: "Light Theme",
    pricePerMeter: 400,
    suitMeters: 4,
    suitPrice: 1600,
    thaanMeters: 24,
    thaanSuits: 6,
    colorCode: "#fffbf0",
    borderCode: "#f3e8c8",
    tagColor: "#92400e",
    tagBg: "#fef3c7",
    description: "Soft textured cream fabric, classic executive shalwar kameez finish.",
    initialStock: {
      thaan: 20,          // 20 rolls = 120 suits = 480m
      looseMeters: 96,    // 96 uncut meters
      packetSuits: 32     // 32 ready suits = 128m
    }
  },
  {
    id: "cat-3",
    name: "Dark Theme - Black",
    shortName: "Jet Black",
    theme: "Dark Theme",
    pricePerMeter: 450,
    suitMeters: 4,
    suitPrice: 1800, // 4 * 450
    thaanMeters: 24,
    thaanSuits: 6,
    colorCode: "#171717",
    borderCode: "#3f3f46",
    tagColor: "#fafafa",
    tagBg: "#262626",
    description: "Deep jet-black wrinkle-resistant fabric, heavy fall and rich royal shine.",
    initialStock: {
      thaan: 35,          // 35 rolls = 210 suits = 840m
      looseMeters: 180,   // 180 uncut meters
      packetSuits: 65     // 65 ready suits = 260m
    }
  },
  {
    id: "cat-4",
    name: "Dark Theme - Navy Blue",
    shortName: "Navy Blue",
    theme: "Dark Theme",
    pricePerMeter: 450,
    suitMeters: 4,
    suitPrice: 1800,
    thaanMeters: 24,
    thaanSuits: 6,
    colorCode: "#172554",
    borderCode: "#1e3a8a",
    tagColor: "#dbeafe",
    tagBg: "#1e40af",
    description: "Midnight navy blue executive fabric, crisp texture for ceremonial and formal shalwar kameez.",
    initialStock: {
      thaan: 26,          // 26 rolls = 156 suits = 624m
      looseMeters: 112,   // 112 uncut meters
      packetSuits: 40     // 40 ready suits = 160m
    }
  },
  {
    id: "cat-5",
    name: "Washing Wear - Standard",
    shortName: "Washing Wear",
    theme: "Washing Wear",
    pricePerMeter: 425,
    suitMeters: 4,
    suitPrice: 1700, // 4 * 425
    thaanMeters: 24,
    thaanSuits: 6,
    colorCode: "#64748b",
    borderCode: "#94a3b8",
    tagColor: "#0f172a",
    tagBg: "#e2e8f0",
    description: "High durability easy-care washing wear fabric, breathable with high color-fastness.",
    initialStock: {
      thaan: 42,          // 42 rolls = 252 suits = 1008m
      looseMeters: 240,   // 240 uncut meters
      packetSuits: 80     // 80 ready suits = 320m
    }
  }
];

export const INITIAL_CLIENTS = [
  {
    id: "client-1",
    name: "Haji Muhammad Yousuf",
    shopName: "Yousuf & Sons Fabrics",
    phone: "+923004123456",
    city: "Anarkali, Lahore",
    openingBalance: 15000,
    createdDate: "2026-08-15",
    transactions: [
      {
        id: "tx-101",
        invoiceNo: "INV-2026-01",
        date: "2026-09-02",
        categoryId: "cat-3",
        categoryName: "Dark Theme - Black",
        saleType: "suits",
        quantity: 10, // 10 suits = 40m
        meters: 40,
        ratePerMeter: 450,
        totalBill: 18000,
        amountPaid: 12000,
        remainingBalance: 6000,
        notes: "Wholesale delivery for Eid collection preview."
      },
      {
        id: "tx-102",
        invoiceNo: "INV-2026-02",
        date: "2026-09-24",
        categoryId: "cat-1",
        categoryName: "Light Theme - Off-White",
        saleType: "meters",
        quantity: 48, // 48 custom meters
        meters: 48,
        ratePerMeter: 400,
        totalBill: 19200,
        amountPaid: 15000,
        remainingBalance: 4200,
        notes: "Custom cut cloth for tailoring orders."
      }
    ]
  },
  {
    id: "client-2",
    name: "Malik Tariq Mehmood",
    shopName: "Malik Cloth Emporium",
    phone: "+923217654321",
    city: "Rail Bazaar, Faisalabad",
    openingBalance: 0,
    createdDate: "2026-08-20",
    transactions: [
      {
        id: "tx-201",
        invoiceNo: "INV-2026-03",
        date: "2026-09-15",
        categoryId: "cat-5",
        categoryName: "Washing Wear - Standard",
        saleType: "suits",
        quantity: 15,
        meters: 60,
        ratePerMeter: 400,
        totalBill: 24000,
        amountPaid: 24000,
        remainingBalance: 0,
        notes: "Full advance payment via Bank Transfer."
      },
      {
        id: "tx-202",
        invoiceNo: "INV-2026-04",
        date: "2026-10-05",
        categoryId: "cat-4",
        categoryName: "Dark Theme - Navy Blue",
        saleType: "suits",
        quantity: 8,
        meters: 32,
        ratePerMeter: 450,
        totalBill: 14400,
        amountPaid: 8000,
        remainingBalance: 6400,
        notes: "Remaining to be cleared next Monday."
      }
    ]
  },
  {
    id: "client-3",
    name: "Al-Haj Abdul Rasheed",
    shopName: "Rasheed Matching Center",
    phone: "+923339876543",
    city: "Tariq Road, Karachi",
    openingBalance: 8500,
    createdDate: "2026-09-01",
    transactions: [
      {
        id: "tx-301",
        invoiceNo: "INV-2026-05",
        date: "2026-10-02",
        categoryId: "cat-2",
        categoryName: "Light Theme - Cream",
        saleType: "meters",
        quantity: 50,
        meters: 50,
        ratePerMeter: 400,
        totalBill: 20000,
        amountPaid: 10000,
        remainingBalance: 10000,
        notes: "Dispatched via TCS Cargo."
      }
    ]
  },
  {
    id: "client-4",
    name: "Chawla Brothers",
    shopName: "Chawla Traders",
    phone: "+923125544332",
    city: "Raja Bazaar, Rawalpindi",
    openingBalance: 5000,
    createdDate: "2026-09-10",
    transactions: [
      {
        id: "tx-401",
        invoiceNo: "INV-2026-06",
        date: "2026-10-08",
        categoryId: "cat-3",
        categoryName: "Dark Theme - Black",
        saleType: "suits",
        quantity: 12,
        meters: 48,
        ratePerMeter: 450,
        totalBill: 21600,
        amountPaid: 15000,
        remainingBalance: 6600,
        notes: "Ready packet suits delivered."
      }
    ]
  },
  {
    id: "client-5",
    name: "Sardar Alam Khan",
    shopName: "Khyber Men's Wear",
    phone: "+923451122334",
    city: "Karkhano Market, Peshawar",
    openingBalance: 0,
    createdDate: "2026-09-18",
    transactions: [
      {
        id: "tx-501",
        invoiceNo: "INV-2026-07",
        date: "2026-10-10",
        categoryId: "cat-5",
        categoryName: "Washing Wear - Standard",
        saleType: "meters",
        quantity: 72,
        meters: 72,
        ratePerMeter: 400,
        totalBill: 28800,
        amountPaid: 28800,
        remainingBalance: 0,
        notes: "Full payment received in cash."
      }
    ]
  }
];

export const INITIAL_STOCK_LOGS = [
  {
    id: "log-1",
    timestamp: "2026-10-10 14:30",
    categoryId: "cat-3",
    categoryName: "Dark Theme - Black",
    action: "convert",
    details: "Converted 2 Thaan into 12 Packet Suits",
    deductions: "-2 Thaan",
    additions: "+12 Packet Suits"
  },
  {
    id: "log-2",
    timestamp: "2026-10-11 11:15",
    categoryId: "cat-1",
    categoryName: "Light Theme - Off-White",
    action: "convert",
    details: "Converted 1 Thaan into 24 Meters Loose Stock",
    deductions: "-1 Thaan",
    additions: "+24 Meters Loose"
  },
  {
    id: "log-3",
    timestamp: "2026-10-12 16:45",
    categoryId: "cat-5",
    categoryName: "Washing Wear - Standard",
    action: "add",
    details: "Factory shipment received: 10 Thaan fresh stock added",
    deductions: "None",
    additions: "+10 Thaan (240m)"
  }
];
