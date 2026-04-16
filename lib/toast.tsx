"use client";

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";

interface ToastData {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastCtx {
  toast: (message: string, type?: "success" | "error" | "info") => void;
  confirm: (message: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastCtx>({ toast: () => {}, confirm: async () => false });

const bgColors = { success: "#16a34a", error: "#dc2626", info: "#2563eb" };
const icons = { success: "✅", error: "❌", info: "ℹ️" };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [confirmData, setConfirmData] = useState<{ message: string } | null>(null);
  const confirmResolver = useRef<((val: boolean) => void) | null>(null);

  const addToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2500);
  }, []);

  const showConfirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      confirmResolver.current = resolve;
      setConfirmData({ message });
    });
  }, []);

  const handleConfirm = (val: boolean) => {
    confirmResolver.current?.(val);
    confirmResolver.current = null;
    setConfirmData(null);
  };

  return (
    <ToastContext.Provider value={{ toast: addToast, confirm: showConfirm }}>
      {children}

      {/* Confirm modal */}
      {confirmData && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999999 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "32px 28px 24px", maxWidth: 380, width: "90%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", animation: "toastPop 0.2s ease" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#1f2937", marginBottom: 24, lineHeight: 1.5 }}>{confirmData.message}</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={() => handleConfirm(false)} style={{ padding: "10px 28px", borderRadius: 12, border: "2px solid #e5e7eb", background: "#fff", fontSize: 14, fontWeight: 600, color: "#6b7280", cursor: "pointer" }}>Болих</button>
              <button onClick={() => handleConfirm(true)} style={{ padding: "10px 28px", borderRadius: 12, border: "none", background: "#dc2626", fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer" }}>Тийм</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast — centered */}
      {toasts.length > 0 && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 99999,
          pointerEvents: "none",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            {toasts.map((t) => (
              <div
                key={t.id}
                style={{
                  background: bgColors[t.type],
                  color: "#fff",
                  padding: "16px 32px",
                  borderRadius: 16,
                  boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  pointerEvents: "auto",
                  animation: "toastPop 0.3s ease",
                }}
              >
                <span style={{ fontSize: 24 }}>{icons[t.type]}</span>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{t.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
