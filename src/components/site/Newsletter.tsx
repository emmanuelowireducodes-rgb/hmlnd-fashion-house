import { useState } from "react";
import { z } from "zod";

const schema = z.string().trim().email("Enter a valid email address").max(255);

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = schema.safeParse(email);
    if (!r.success) return setError(r.error.issues[0]?.message ?? "Invalid email");
    setError(null);
    setDone(true);
    // TODO: send to newsletter provider once integrated.
  }

  return (
    <section className="border-t px-5 py-24 md:px-10 md:py-32" aria-labelledby="nl-title">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow text-muted-foreground">Correspondence</p>
        <h2 id="nl-title" className="display mt-5 text-4xl md:text-6xl">Letters from Homeland</h2>
        <p className="mt-5 text-sm text-muted-foreground">Releases, projects and stories — sent rarely.</p>
        {done ? (
          <p role="status" className="mx-auto mt-10 max-w-md border p-5 text-sm">
            Thank you. <strong>Demo only:</strong> no subscription was created — the newsletter isn't connected yet.
          </p>
        ) : (
          <form onSubmit={submit} noValidate className="mx-auto mt-10 flex max-w-md items-end gap-4">
            <div className="flex-1 text-left">
              <label htmlFor="nl-email" className="sr-only">Email address</label>
              <input
                id="nl-email"
                type="email"
                className="field"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!error}
                aria-describedby={error ? "nl-err" : undefined}
              />
            </div>
            <button type="submit" className="btn btn-solid !h-11 !px-6">Subscribe</button>
          </form>
        )}
        {error && <p id="nl-err" className="mt-3 text-xs text-destructive">{error}</p>}
        {!done && <p className="mt-4 text-[11px] text-muted-foreground">Demo subscription — not yet connected.</p>}
      </div>
    </section>
  );
}
