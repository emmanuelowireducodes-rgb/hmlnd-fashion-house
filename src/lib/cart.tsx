// Client-side cart persisted in localStorage. Replace persistence with a
// server cart / order table when the backend is connected.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { addLine, cartCount, cartSubtotal, removeLine, setLineQty, type CartLine } from "./cart-math";

const STORAGE_KEY = "hmlnd-cart-v1";

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  ready: boolean;
  add: (line: CartLine) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setLines(parsed);
      }
    } catch {
      /* ignore corrupt storage */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, ready]);

  const add = useCallback((line: CartLine) => setLines((l) => addLine(l, line)), []);
  const setQty = useCallback((key: string, qty: number) => setLines((l) => setLineQty(l, key, qty)), []);
  const remove = useCallback((key: string) => setLines((l) => removeLine(l, key)), []);

  const value = useMemo(
    () => ({ lines, count: cartCount(lines), subtotal: cartSubtotal(lines), ready, add, setQty, remove }),
    [lines, ready, add, setQty, remove],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
