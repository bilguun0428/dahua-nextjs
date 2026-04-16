"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./auth-context";
import type { CartItem } from "./types";

interface CartCtx {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeItem: (model: string) => void;
  updateQty: (model: string, qty: number) => void;
  clearCart: () => void;
  totalMNT: number;
  totalItems: number;
}

const CartContext = createContext<CartCtx>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQty: () => {},
  clearCart: () => {},
  totalMNT: 0,
  totalItems: 0,
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const { user } = useAuth();

  // Clear cart when user changes (login/logout/switch account) to avoid data leak across users
  useEffect(() => {
    setItems([]);
  }, [user?.uid]);

  const addItem = (item: Omit<CartItem, "qty">, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.model === item.model);
      if (existing) {
        return prev.map((i) =>
          i.model === item.model ? { ...i, qty: i.qty + qty } : i
        );
      }
      return [...prev, { ...item, qty }];
    });
  };

  const removeItem = (model: string) => {
    setItems((prev) => prev.filter((i) => i.model !== model));
  };

  const updateQty = (model: string, qty: number) => {
    if (qty <= 0) return removeItem(model);
    setItems((prev) =>
      prev.map((i) => (i.model === model ? { ...i, qty } : i))
    );
  };

  const clearCart = () => setItems([]);

  const totalMNT = items.reduce((sum, i) => sum + i.priceMNT * i.qty, 0);
  const totalItems = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQty, clearCart, totalMNT, totalItems }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
