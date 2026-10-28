import { describe, expect, it } from "vitest";
import { addLine, cartCount, cartSubtotal, removeLine, setLineQty, lineKey } from "./cart-math";

const line = { slug: "tee", colour: "Bone", size: "M", quantity: 1, price: 35000 };

describe("cart math", () => {
  it("merges the same variant instead of duplicating", () => {
    const lines = addLine(addLine([], line), { ...line, quantity: 2 });
    expect(lines).toHaveLength(1);
    expect(lines[0]!.quantity).toBe(3);
  });

  it("totals price × quantity in pesewas", () => {
    const lines = addLine(addLine([], { ...line, quantity: 2 }), { ...line, size: "L", price: 85000 });
    expect(cartSubtotal(lines)).toBe(155000);
    expect(cartCount(lines)).toBe(3);
  });

  it("clamps quantity between 1 and 10", () => {
    const lines = addLine([], line);
    expect(setLineQty(lines, lineKey(line), 0)[0]!.quantity).toBe(1);
    expect(setLineQty(lines, lineKey(line), 99)[0]!.quantity).toBe(10);
  });

  it("removes a line", () => {
    expect(removeLine(addLine([], line), lineKey(line))).toEqual([]);
  });
});
