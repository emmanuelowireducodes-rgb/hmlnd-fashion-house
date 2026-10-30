import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

type OrderSummary = {
  id: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  status: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  totalPesewas: number;
  createdAt: string;
};
type Order = {
  id: string;
  reference: string;
  status: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  customer: { name: string; email: string; phone: string };
  delivery: { address: string; city: string; region: string; instructions?: string };
  subtotalPesewas: number;
  totalPesewas: number;
  createdAt: string;
  items: {
    name: string;
    productSku: string;
    variantSku: string;
    size: string;
    colour: string;
    quantity: number;
    unitPricePesewas: number;
    lineTotalPesewas: number;
  }[];
  history: {
    fromStatus: string | null;
    toStatus: string;
    note: string;
    createdAt: string;
    actor: string | null;
  }[];
  notes: { note: string; createdAt: string; actor: string }[];
  reservations: { variantSku: string; quantity: number; status: string; expiresAt: number }[];
  paymentIntegration: string;
};
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: { ...(init?.body ? { "content-type": "application/json" } : {}), ...init?.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Order request failed");
  return data as T;
}
const money = (pesewas: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(pesewas / 100);
const statuses = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
export const Route = createFileRoute("/studio/orders")({ component: OrdersPage });

function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ q: search, status: filter, limit: "100" });
      const result = await api<{ orders: OrderSummary[] }>(`/api/studio/orders?${query}`);
      setOrders(result.orders);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load orders");
    } finally {
      setLoading(false);
    }
  }, [search, filter]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 180);
    return () => clearTimeout(timer);
  }, [load]);
  const open = async (id: string) => {
    setError("");
    setMessage("");
    try {
      setSelected(await api<Order>(`/api/studio/orders/${id}`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load order");
    }
  };
  const changeStatus = async (status: string) => {
    if (!selected) return;
    const reason = status === "CANCELLED" ? cancelReason.trim() : "";
    if (status === "CANCELLED" && reason.length < 3) {
      setError("Enter a cancellation reason first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api<Order>(`/api/studio/orders/${selected.id}/status`, {
        method: "POST",
        body: JSON.stringify({ status, note: reason }),
      });
      setSelected(result);
      setCancelReason("");
      setMessage(`Order ${result.reference} updated to ${status}.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update order");
    } finally {
      setBusy(false);
    }
  };
  const addNote = async () => {
    if (!selected || note.trim().length < 2) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/studio/orders/${selected.id}/notes`, {
        method: "POST",
        body: JSON.stringify({ note: note.trim() }),
      });
      setNote("");
      setSelected(await api<Order>(`/api/studio/orders/${selected.id}`));
      setMessage("Internal note saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save note");
    } finally {
      setBusy(false);
    }
  };
  const next = selected
    ? (
        {
          PENDING: ["CONFIRMED", "CANCELLED"],
          CONFIRMED: ["PROCESSING", "CANCELLED"],
          PROCESSING: ["SHIPPED", "CANCELLED"],
          SHIPPED: ["DELIVERED"],
          DELIVERED: [],
          CANCELLED: [],
        } as Record<string, string[]>
      )[selected.status] || []
    : [];
  return (
    <main className="studio-products studio-orders">
      <header className="studio-products__header">
        <div>
          <p className="studio-eyebrow">HMLND STUDIO / COMMERCE</p>
          <h1>Orders</h1>
          <p>Review local order records. Payment integration is unavailable.</p>
        </div>
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
            aria-label="Search orders"
            placeholder="Search order reference or customer"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label="Filter order status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="ALL">All statuses</option>
            {statuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>
        {loading ? (
          <p role="status">Loading orders…</p>
        ) : error && !orders.length ? (
          <p>Orders could not be loaded.</p>
        ) : orders.length ? (
          <div className="studio-products__tablewrap">
            <table className="studio-products__table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="studio-orders__row"
                    onClick={() => void open(order.id)}
                  >
                    <td>
                      <button onClick={() => void open(order.id)}>{order.reference}</button>
                    </td>
                    <td>
                      {order.customerName}
                      <small className="studio-collections__slug">{order.customerEmail}</small>
                    </td>
                    <td>{money(order.totalPesewas)}</td>
                    <td>{order.paymentStatus}</td>
                    <td>{order.status}</td>
                    <td>{new Date(order.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="studio-products__empty">
            <h2>No orders yet</h2>
            <p>Orders appear here when a validated order request is created.</p>
            <small>Checkout and payment collection are not configured.</small>
          </div>
        )}
      </section>
      {selected && (
        <div
          className="studio-orders__overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <section
            className="studio-orders__detail"
            role="dialog"
            aria-modal="true"
            aria-label={`Order ${selected.reference}`}
          >
            <header>
              <div>
                <p className="studio-eyebrow">ORDER DETAIL</p>
                <h2>{selected.reference}</h2>
              </div>
              <button onClick={() => setSelected(null)}>Close</button>
            </header>
            <div className="studio-orders__notice">
              <strong>Payment: {selected.paymentStatus}</strong>
              <span>Payment provider unavailable. No payment has been recorded.</span>
            </div>
            <div className="studio-orders__twocol">
              <section>
                <h3>Customer</h3>
                <p>
                  {selected.customer.name}
                  <br />
                  {selected.customer.email}
                  <br />
                  {selected.customer.phone}
                </p>
              </section>
              <section>
                <h3>Delivery details</h3>
                <p>
                  {selected.delivery.address}
                  <br />
                  {selected.delivery.city}, {selected.delivery.region}
                  <br />
                  {selected.delivery.instructions}
                </p>
              </section>
            </div>
            <h3>Items</h3>
            <div className="studio-orders__items">
              {selected.items.map((item, index) => (
                <div key={`${item.variantSku}-${index}`}>
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {item.productSku} · {item.variantSku} · {item.size} / {item.colour} · Qty{" "}
                      {item.quantity}
                    </small>
                  </span>
                  <b>{money(item.lineTotalPesewas)}</b>
                </div>
              ))}
            </div>
            <p className="studio-orders__total">
              Total <strong>{money(selected.totalPesewas)}</strong>
            </p>
            <section className="studio-orders__actions">
              <h3>Status management</h3>
              <p>
                Current: <strong>{selected.status}</strong> · Fulfilment:{" "}
                {selected.fulfilmentStatus}
              </p>
              {next.includes("CANCELLED") && (
                <label>
                  Cancellation reason
                  <input
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Reason required to cancel"
                  />
                </label>
              )}
              {next.map((status) => (
                <button
                  key={status}
                  disabled={
                    busy ||
                    ((status === "SHIPPED" || status === "DELIVERED") &&
                      selected.paymentStatus !== "PAID")
                  }
                  onClick={() => void changeStatus(status)}
                >
                  {status === "CANCELLED" ? "Cancel order" : `Mark ${status.toLowerCase()}`}
                </button>
              ))}
              {next.some((status) => status === "SHIPPED" || status === "DELIVERED") &&
                selected.paymentStatus !== "PAID" && (
                  <small>Shipping is blocked until payment is verified.</small>
                )}
            </section>
            <section className="studio-orders__actions">
              <h3>Internal notes</h3>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a private note"
              />
              <button disabled={busy || note.trim().length < 2} onClick={() => void addNote()}>
                Save note
              </button>
              {selected.notes.map((entry, index) => (
                <p className="studio-orders__note" key={`${entry.createdAt}-${index}`}>
                  {entry.note}
                  <small>
                    {entry.actor} · {new Date(entry.createdAt).toLocaleString()}
                  </small>
                </p>
              ))}
            </section>
            <section className="studio-orders__actions">
              <h3>Status history</h3>
              <ul>
                {selected.history.map((entry, index) => (
                  <li key={`${entry.createdAt}-${index}`}>
                    {entry.fromStatus || "Created"} → {entry.toStatus}
                    {entry.note && ` · ${entry.note}`}
                    <small>
                      {entry.actor || "Customer request"} ·{" "}
                      {new Date(entry.createdAt).toLocaleString()}
                    </small>
                  </li>
                ))}
              </ul>
            </section>
          </section>
        </div>
      )}
      <p className="studio-products__back">
        <Link to="/studio">← Studio</Link>
      </p>
    </main>
  );
}
