import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Account — HMLND" }, { name: "description", content: "HMLND client accounts — coming soon." }, { property: "og:title", content: "Account — HMLND" }, { property: "og:description", content: "HMLND client accounts — coming soon." }, { name: "robots", content: "noindex" }] }),
  component: AccountPage,
});

function AccountPage() {
  const [msg, setMsg] = useState(false);
  return (
    <div className="mx-auto max-w-md px-5 py-24">
      <h1 className="display text-5xl">Account</h1>
      <p className="mt-4 text-sm text-muted-foreground">Client accounts aren't available yet. Sign-in is a preview only.</p>
      <form className="mt-10 space-y-6" onSubmit={(e) => { e.preventDefault(); setMsg(true); }}>
        <div><label htmlFor="em" className="eyebrow">Email</label><input id="em" type="email" className="field" /></div>
        <div><label htmlFor="pw" className="eyebrow">Password</label><input id="pw" type="password" className="field" /></div>
        <button className="btn btn-solid w-full">Sign in</button>
      </form>
      {msg && <p role="status" className="mt-6 border p-4 text-sm">Accounts are coming soon — you have not been signed in.</p>}
    </div>
  );
}
