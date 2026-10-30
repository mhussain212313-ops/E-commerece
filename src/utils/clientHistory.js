/**
 * Utility to calculate exactly what a B2B client has purchased,
 * what they have already returned, and what they currently hold
 * (eligible for return).
 */
export const calculateClientPurchasedFabrics = (client) => {
  if (!client) return {};
  const map = {};
  const txs = client.transactions || [];

  txs.forEach(tx => {
    // 1. Regular Wholesale Sales
    if (tx.saleType !== "payment" && tx.saleType !== "return") {
      if (Array.isArray(tx.items) && tx.items.length > 0) {
        tx.items.forEach(item => {
          const catId = item.categoryId;
          if (!map[catId]) {
            map[catId] = {
              totalSuitsBought: 0,
              totalTpMetersBought: 0,
              totalSuitsReturned: 0,
              totalTpMetersReturned: 0
            };
          }
          if (item.saleType === "suits") {
            map[catId].totalSuitsBought += Number(item.quantity || 0);
          } else {
            map[catId].totalTpMetersBought += Number(item.meters || item.quantity || 0);
          }
        });
      } else if (tx.categoryId) {
        const catId = tx.categoryId;
        if (!map[catId]) {
          map[catId] = {
            totalSuitsBought: 0,
            totalTpMetersBought: 0,
            totalSuitsReturned: 0,
            totalTpMetersReturned: 0
          };
        }
        if (tx.saleType === "suits") {
          map[catId].totalSuitsBought += Number(tx.quantity || 0);
        } else {
          map[catId].totalTpMetersBought += Number(tx.meters || tx.quantity || 0);
        }
      }
    }

    // 2. Past Returns (Wapsi)
    if (tx.saleType === "return") {
      if (Array.isArray(tx.items) && tx.items.length > 0) {
        tx.items.forEach(item => {
          const catId = item.categoryId;
          if (!map[catId]) {
            map[catId] = {
              totalSuitsBought: 0,
              totalTpMetersBought: 0,
              totalSuitsReturned: 0,
              totalTpMetersReturned: 0
            };
          }
          if (item.returnType === "suits" || item.saleType === "suits") {
            map[catId].totalSuitsReturned += Number(item.quantity || 0);
          } else {
            map[catId].totalTpMetersReturned += Number(item.meters || item.quantity || 0);
          }
        });
      } else if (tx.categoryId) {
        const catId = tx.categoryId;
        if (!map[catId]) {
          map[catId] = {
            totalSuitsBought: 0,
            totalTpMetersBought: 0,
            totalSuitsReturned: 0,
            totalTpMetersReturned: 0
          };
        }
        if (tx.returnType === "suits") {
          map[catId].totalSuitsReturned += Number(tx.quantity || 0);
        } else {
          map[catId].totalTpMetersReturned += Number(tx.meters || tx.quantity || 0);
        }
      }
    }
  });

  // Calculate net holding eligible for return
  Object.keys(map).forEach(catId => {
    map[catId].netSuitsHolding = Math.max(0, map[catId].totalSuitsBought - map[catId].totalSuitsReturned);
    map[catId].netTpHolding = Math.max(0, map[catId].totalTpMetersBought - map[catId].totalTpMetersReturned);
  });

  return map;
};
