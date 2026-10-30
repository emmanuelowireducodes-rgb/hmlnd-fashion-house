import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

type Activity = { action: string; entity_type: string; created_at: string };
type DashboardStats = {
  products: number | null;
  collections: number | null;
  orders: number | null;
  pendingOrders: number | null;
  customers: number | null;
  customisationRequests: number | null;
  recentChanges: Activity[];
};

export const Route = createFileRoute("/studio/dashboard")({ component: Dashboard });

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");
  const [unauthenticated, setUnauthenticated] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/studio/dashboard", { credentials: "same-origin" })
      .then(async (response) => {
        const result = await response.json();
        if (response.status === 401) {
          if (active) setUnauthenticated(true);
          return;
        }
        if (!response.ok) throw new Error(result.error || "Could not load dashboard");
        if (active) setStats(result as DashboardStats);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load dashboard");
      });
    return () => {
      active = false;
    };
  }, []);

  const metric = (label: string, value: number | null) => (
    <article className="studio-dashboard-card" key={label}>
      <span>{label}</span>
      <strong>{value === null ? "Unavailable" : value.toLocaleString()}</strong>
      {value === null && <small>Not available until this module is configured.</small>}
    </article>
  );

  return (
    <div className="studio-dashboard">
      <header className="studio-dashboard__header">
        <div>
          <p className="studio-eyebrow">HMLND STUDIO / OVERVIEW</p>
          <h1>Dashboard</h1>
          <p>Store activity and content at a glance.</p>
        </div>
        <Link className="studio-dashboard__builder" to="/studio">
          Open Visual Builder
        </Link>
      </header>
      {error && (
        <p className="studio-error" role="alert">
          {error}
        </p>
      )}
      {unauthenticated && (
        <section className="studio-dashboard__notice" role="status">
          <h2>Sign in to view your dashboard</h2>
          <p>Dashboard statistics and activity are available to authenticated Studio users.</p>
          <Link to="/studio">Go to Studio sign in</Link>
        </section>
      )}
      {!stats && !error && !unauthenticated && <p role="status">Loading dashboard…</p>}
      {stats && (
        <>
          <section className="studio-dashboard-grid" aria-label="Store statistics">
            {metric("Products", stats.products)}
            {metric("Collections", stats.collections)}
            {metric("Orders", stats.orders)}
            {metric("Pending orders", stats.pendingOrders)}
            {metric("Customers", stats.customers)}
            {metric("Customisation requests", stats.customisationRequests)}
          </section>
          <section className="studio-dashboard__section">
            <h2>Quick access</h2>
            <div className="studio-dashboard-actions">
              <Link to="/studio">
                Website Builder <span>Homepage editor</span>
              </Link>
            </div>
          </section>
          <section className="studio-dashboard__section">
            <h2>Recent activity</h2>
            {stats.recentChanges.length ? (
              <ul className="studio-dashboard-activity">
                {stats.recentChanges.map((item, index) => (
                  <li key={`${item.created_at}-${index}`}>
                    <strong>{item.action.replaceAll("_", " ")}</strong>
                    <span>{item.entity_type.replaceAll("_", " ")}</span>
                    <time dateTime={item.created_at}>
                      {new Date(item.created_at).toLocaleString()}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No recorded activity yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
