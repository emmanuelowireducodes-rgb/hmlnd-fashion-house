import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Level = {
  productId: string;
  productName: string;
  productSku: string;
  productStatus: string;
  variantSku: string;
  size: string;
  colour: string;
  quantity: number;
  lowStockThreshold: number;
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  updatedAt: string | null;
};
type Adjustment = {
  id: string;
  delta: number;
  quantity_before: number;
  quantity_after: number;
  reason: string;
  created_at: string;
  actor: string;
};
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: { ...(init?.body ? { "content-type": "application/json" } : {}), ...init?.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Inventory request failed");
  return data as T;
}
export const Route = createFileRoute("/studio/inventory")({ component: InventoryPage });
function InventoryPage() {
  const [rows, setRows] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [deltas, setDeltas] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [thresholds, setThresholds] = useState<Record<string, string>>({});
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [history, setHistory] = useState<Adjustment[]>([]);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await api<Level[]>("/api/studio/inventory"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load inventory");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const visible = useMemo(
    () =>
      rows.filter(
        (row) =>
          (filter === "ALL" || row.stockStatus === filter) &&
          `${row.productName} ${row.productSku} ${row.variantSku} ${row.size} ${row.colour}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [rows, filter, query],
  );
  const key = (row: Level) => `${row.productId}:${row.variantSku}`;
  const adjust = async (row: Level) => {
    const rowKey = key(row);
    const delta = Number(deltas[rowKey]);
    const reason = reasons[rowKey]?.trim();
    if (!Number.isInteger(delta) || delta === 0 || !reason) {
      setError("Enter a nonzero whole-number adjustment and a reason.");
      return;
    }
    setError("");
    setMessage("");
    try {
      await api("/api/studio/inventory/adjust", {
        method: "POST",
        body: JSON.stringify({
          productId: row.productId,
          variantSku: row.variantSku,
          delta,
          reason,
        }),
      });
      setMessage(`Stock updated for ${row.productName}, ${row.size} / ${row.colour}.`);
      setDeltas((all) => ({ ...all, [rowKey]: "" }));
      setReasons((all) => ({ ...all, [rowKey]: "" }));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Stock adjustment failed");
    }
  };
  const setThreshold = async (row: Level) => {
    const rowKey = key(row);
    const threshold = Number(thresholds[rowKey] ?? row.lowStockThreshold);
    if (!Number.isInteger(threshold) || threshold < 0) {
      setError("Threshold must be a nonnegative whole number.");
      return;
    }
    setError("");
    try {
      await api("/api/studio/inventory/threshold", {
        method: "POST",
        body: JSON.stringify({ productId: row.productId, variantSku: row.variantSku, threshold }),
      });
      setMessage("Low-stock threshold saved.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Threshold update failed");
    }
  };
  const showHistory = async (row: Level) => {
    const rowKey = key(row);
    setHistoryFor(rowKey);
    try {
      setHistory(
        await api<Adjustment[]>(
          `/api/studio/inventory/history/${row.productId}/${encodeURIComponent(row.variantSku)}`,
        ),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load adjustment history");
    }
  };
  return (
    <main className="studio-products studio-inventory">
      <header className="studio-products__header">
        <div>
          <p className="studio-eyebrow">HMLND STUDIO / CATALOGUE</p>
          <h1>Inventory</h1>
          <p>Adjust variant stock and review recorded movements.</p>
        </div>
        <Link className="studio-inventory__link" to="/studio/products">
          Manage products
        </Link>
      </header>
      {message && (
        <p role="status" className="studio-products__success">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="studio-error">
          {error}
        </p>
      )}
      <section className="studio-products__listing">
        <div className="studio-products__filters">
          <input
            placeholder="Search product, SKU, size or colour"
            aria-label="Search inventory"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label="Filter stock status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="ALL">All stock statuses</option>
            <option value="IN_STOCK">In stock</option>
            <option value="LOW_STOCK">Low stock</option>
            <option value="OUT_OF_STOCK">Out of stock</option>
          </select>
        </div>
        {loading ? (
          <p role="status">Loading inventory…</p>
        ) : error && !rows.length ? (
          <p>Inventory could not be loaded.</p>
        ) : !visible.length ? (
          <div className="studio-products__empty">
            <h2>No variants found</h2>
            <p>Create product variants to manage stock.</p>
          </div>
        ) : (
          <div className="studio-products__tablewrap">
            <table className="studio-products__table">
              <thead>
                <tr>
                  <th>Product / variant</th>
                  <th>SKU</th>
                  <th>Quantity</th>
                  <th>Stock status</th>
                  <th>Adjustment</th>
                  <th>Threshold</th>
                  <th>History</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => {
                  const rowKey = key(row);
                  return (
                    <Fragment key={rowKey}>
                      <tr key={rowKey}>
                        <td>
                          <strong>{row.productName}</strong>
                          <small className="studio-collections__slug">
                            {row.size} / {row.colour} · {row.productStatus}
                          </small>
                        </td>
                        <td>{row.variantSku}</td>
                        <td>
                          <strong>{row.quantity}</strong>
                        </td>
                        <td>
                          <span
                            className={`studio-products__status is-${row.stockStatus.toLowerCase()}`}
                          >
                            {row.stockStatus.replaceAll("_", " ")}
                          </span>
                        </td>
                        <td>
                          <div className="studio-inventory__adjust">
                            <input
                              aria-label={`Quantity adjustment ${row.variantSku}`}
                              type="number"
                              step="1"
                              value={deltas[rowKey] || ""}
                              onChange={(e) =>
                                setDeltas((all) => ({ ...all, [rowKey]: e.target.value }))
                              }
                              placeholder="± qty"
                            />
                            <input
                              aria-label={`Reason ${row.variantSku}`}
                              value={reasons[rowKey] || ""}
                              onChange={(e) =>
                                setReasons((all) => ({ ...all, [rowKey]: e.target.value }))
                              }
                              placeholder="Reason"
                            />
                            <button onClick={() => void adjust(row)}>Apply</button>
                          </div>
                        </td>
                        <td>
                          <div className="studio-inventory__threshold">
                            <input
                              aria-label={`Low stock threshold ${row.variantSku}`}
                              type="number"
                              min="0"
                              step="1"
                              value={thresholds[rowKey] ?? String(row.lowStockThreshold)}
                              onChange={(e) =>
                                setThresholds((all) => ({ ...all, [rowKey]: e.target.value }))
                              }
                            />
                            <button onClick={() => void setThreshold(row)}>Save</button>
                          </div>
                        </td>
                        <td>
                          <button onClick={() => void showHistory(row)}>View</button>
                        </td>
                      </tr>
                      {historyFor === rowKey && (
                        <tr key={`${rowKey}-history`}>
                          <td colSpan={7}>
                            <div className="studio-inventory__history">
                              <strong>
                                Adjustment history · {row.size} / {row.colour}
                              </strong>
                              <button onClick={() => setHistoryFor(null)}>Close</button>
                              {history.length ? (
                                <ul>
                                  {history.map((entry) => (
                                    <li key={entry.id}>
                                      <b>
                                        {entry.delta > 0 ? "+" : ""}
                                        {entry.delta}
                                      </b>{" "}
                                      ({entry.quantity_before} → {entry.quantity_after}) ·{" "}
                                      {entry.reason} · {entry.actor} ·{" "}
                                      {new Date(entry.created_at).toLocaleString()}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p>No stock adjustments recorded.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="studio-products__back">
        <Link to="/studio">← Studio</Link>
      </p>
    </main>
  );
}
