import React from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";
import { DashboardView } from "./components/DashboardView";
import { InventoryView } from "./components/InventoryView";
import { KhataView } from "./components/KhataView";
import { ConvertStockModal } from "./components/ConvertStockModal";
import { NewSaleModal } from "./components/NewSaleModal";
import { AddStockModal } from "./components/AddStockModal";
import { AddClientModal } from "./components/AddClientModal";
import { PaymentModal } from "./components/PaymentModal";
import { ReturnModal } from "./components/ReturnModal";
import { Toast } from "./components/Toast";

const MainLayout = () => {
  const { activeModule, modalState } = useApp();

  return (
    <div className="zeno-app">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="zeno-main-wrapper">
        <Navbar />

        <main style={{ flex: 1 }}>
          {activeModule === "dashboard" && <DashboardView />}
          {activeModule === "inventory" && <InventoryView />}
          {activeModule === "khata" && <KhataView />}
        </main>
      </div>

      {/* Global Modals */}
      {modalState.convertStock && <ConvertStockModal />}
      {modalState.newSale && <NewSaleModal />}
      {modalState.addStock && <AddStockModal />}
      {modalState.addClient && <AddClientModal />}
      {modalState.recordPayment && <PaymentModal />}
      {modalState.recordReturn && <ReturnModal />}

      {/* Toast Feedback */}
      <Toast />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
