import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import hero from "@/assets/hero-customised.jpg";
import { SIZES } from "@/lib/catalog";

export const Route = createFileRoute("/customised")({
  head: () => ({ meta: [{ title: "Customised — HMLND" }, { name: "description", content: "Made-to-order HMLND pieces. Start a custom enquiry." }, { property: "og:title", content: "Customised — HMLND" }, { property: "og:description", content: "Made-to-order HMLND pieces." }] }),
  component: CustomisedPage,
});

const schema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  type: z.string().min(1, "Choose an apparel type"),
  sizes: z.array(z.string()).min(1, "Choose at least one size"),
  quantity: z.coerce.number().int().min(1, "Minimum 1").max(500),
  description: z.string().trim().min(10, "Tell us a little more (10+ characters)").max(1500),
});

function CustomisedPage() {
  const [sizes, setSizes] = useState<string[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = schema.safeParse({ ...Object.fromEntries(f), sizes });
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    setDone(true);
  }
  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-destructive">{errors[k]}</p>;

  return (
    <>
      <section className="relative h-[60svh] overflow-hidden">
        <img src={hero} alt="Tailor's hands finishing a black garment" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative mx-auto flex h-full max-w-[1600px] flex-col justify-end px-5 pb-12 text-background md:px-10">
          <p className="eyebrow">HMLND Customised</p>
          <h1 className="display mt-3 text-6xl md:text-8xl">Customised</h1>
        </div>
      </section>
      <div className="mx-auto max-w-2xl px-5 py-20">
        <p className="text-sm text-muted-foreground">Tell us what you'd like made. Enquiries are a <strong>demo only</strong> until our backend is connected — nothing is sent.</p>
        {done ? (
          <p role="status" className="mt-10 border p-6 text-sm">Thank you. This was a demo — your enquiry was <strong>not</strong> submitted. Live enquiries are coming soon.</p>
        ) : (
          <form onSubmit={submit} noValidate className="mt-10 space-y-8">
            <div className="grid gap-8 md:grid-cols-2">
              <div><label htmlFor="name" className="eyebrow">Name</label><input id="name" name="name" className="field" />{err("name")}</div>
              <div><label htmlFor="email" className="eyebrow">Email</label><input id="email" name="email" type="email" className="field" />{err("email")}</div>
            </div>
            <div><label htmlFor="type" className="eyebrow">Apparel type</label>
              <select id="type" name="type" className="field" defaultValue=""><option value="" disabled>Select</option>
                {["Hoodie", "T-shirt", "Shirt", "Sweatpant", "Jacket", "Other"].map((t) => <option key={t}>{t}</option>)}</select>{err("type")}</div>
            <fieldset><legend className="eyebrow">Sizes</legend>
              <div className="mt-3 flex flex-wrap gap-2">{SIZES.map((s) => {
                const on = sizes.includes(s);
                return <button type="button" key={s} aria-pressed={on} onClick={() => setSizes((x) => on ? x.filter((y) => y !== s) : [...x, s])}
                  className={`h-10 w-14 border text-xs ${on ? "bg-foreground text-background" : ""}`}>{s}</button>;
              })}</div>{err("sizes")}</fieldset>
            <div><label htmlFor="quantity" className="eyebrow">Quantity</label><input id="quantity" name="quantity" type="number" min={1} defaultValue={1} className="field" />{err("quantity")}</div>
            <div><label htmlFor="description" className="eyebrow">Design description</label><textarea id="description" name="description" rows={5} className="field" />{err("description")}</div>
            <div><label htmlFor="files" className="eyebrow">Reference images (optional)</label>
              <input id="files" type="file" multiple accept="image/*" className="mt-3 block text-xs" onChange={(e) => setFiles([...(e.target.files ?? [])].map((f) => f.name))} />
              {files.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{files.join(", ")} — not uploaded (demo)</p>}</div>
            <button className="btn btn-solid w-full">Send enquiry (demo)</button>
          </form>
        )}
      </div>
    </>
  );
}
