import React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useApp } from "../context/AppContext";

export const Toast = () => {
  const { toasts, removeToast } = useApp();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const isError = toast.type === "error";

        return (
          <div 
            key={toast.id} 
            className={`toast ${isSuccess ? "toast-success" : isError ? "toast-error" : "toast-warning"}`}
          >
            {isSuccess && <CheckCircle2 size={18} color="var(--accent-green)" />}
            {isError && <AlertCircle size={18} color="var(--accent-red)" />}
            {!isSuccess && !isError && <Info size={18} color="var(--primary)" />}
            
            <div style={{ flex: 1, fontWeight: "500" }}>{toast.message}</div>

            <button 
              onClick={() => removeToast(toast.id)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-light)" }}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
