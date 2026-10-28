import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getProject, projects } from "@/lib/projects";

export const Route = createFileRoute("/projects/$slug")({
  loader: ({ params }) => {
    const p = getProject(params.slug);
    if (!p) throw notFound();
    return { slug: p.slug, title: p.title, intro: p.intro };
  },
  head: ({ loaderData }) => {
    const t = loaderData ? `${loaderData.title} — HMLND Projects` : "Project — HMLND";
    const d = loaderData?.intro ?? "HMLND project";
    return { meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }, { property: "og:type", content: "article" }] };
  },
  component: ProjectPage,
  notFoundComponent: () => <p className="px-10 py-32 text-center">Story not found.</p>,
  errorComponent: () => <p className="px-10 py-32 text-center">Story failed to load.</p>,
});

function ProjectPage() {
  const { slug } = Route.useLoaderData();
  const p = getProject(slug)!;
  const next = projects[(projects.indexOf(p) + 1) % projects.length]!;
  return (
    <article>
      <section className="relative h-[85svh] overflow-hidden">
        <img src={p.cover} alt={p.coverAlt} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative mx-auto flex h-full max-w-[1600px] flex-col justify-end px-5 pb-14 text-background md:px-10">
          <p className="eyebrow">{p.number} — {p.season}</p>
          <h1 className="display mt-4 text-6xl md:text-9xl">{p.title}</h1>
          <p className="mt-4 text-sm opacity-85">{p.subtitle}</p>
        </div>
      </section>
      <div className="mx-auto max-w-3xl px-5 py-24 text-center"><p className="display text-3xl md:text-5xl">{p.intro}</p></div>
      <div className="mx-auto grid max-w-5xl gap-10 px-5 md:grid-cols-2">{p.body.map((b) => <p key={b} className="text-sm leading-relaxed text-muted-foreground">{b}</p>)}</div>
      <div className="mx-auto mt-24 grid max-w-[1600px] gap-4 px-5 md:grid-cols-2 md:px-10">
        {p.gallery.map((g) => <img key={g.alt} src={g.src} alt={g.alt} loading="lazy" className="aspect-[4/5] w-full object-cover" />)}
      </div>
      <blockquote className="display mx-auto max-w-4xl px-5 py-28 text-center text-4xl md:text-6xl">“{p.quote}”</blockquote>
      <div className="mx-auto max-w-5xl border-t px-5 py-10">
        <p className="eyebrow mb-4">Credits (placeholder)</p>
        <dl className="grid gap-3 text-sm md:grid-cols-3">{p.credits.map((c) => <div key={c.role}><dt className="text-muted-foreground">{c.role}</dt><dd>{c.name}</dd></div>)}</dl>
      </div>
      <Link to="/projects/$slug" params={{ slug: next.slug }} className="block border-t px-5 py-16 text-center">
        <p className="eyebrow text-muted-foreground">Next story</p><p className="display mt-3 text-5xl">{next.title}</p>
      </Link>
    </article>
  );
}
