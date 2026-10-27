export interface CartLine {
  slug: string;
  colour: string;
  size: string;
  quantity: number;
  /** Unit price in pesewas, snapshotted when added. */
  price: number;
}

export const MAX_QTY = 10;

export const lineKey = (l: Pick<CartLine, "slug" | "colour" | "size">) => `${l.slug}|${l.colour}|${l.size}`;

export const clampQty = (n: number) => Math.max(1, Math.min(MAX_QTY, Math.floor(n)));

export function addLine(lines: CartLine[], line: CartLine): CartLine[] {
  const key = lineKey(line);
  const existing = lines.find((l) => lineKey(l) === key);
  if (existing) {
    return lines.map((l) => (lineKey(l) === key ? { ...l, quantity: clampQty(l.quantity + line.quantity) } : l));
  }
  return [...lines, { ...line, quantity: clampQty(line.quantity) }];
}

export function setLineQty(lines: CartLine[], key: string, qty: number): CartLine[] {
  return lines.map((l) => (lineKey(l) === key ? { ...l, quantity: clampQty(qty) } : l));
}

export const removeLine = (lines: CartLine[], key: string) => lines.filter((l) => lineKey(l) !== key);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);

export const cartSubtotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.price * l.quantity, 0);
