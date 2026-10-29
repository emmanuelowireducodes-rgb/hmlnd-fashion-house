import { seoHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { projects } from "@/lib/projects";

export const Route = createFileRoute("/projects/")({
  head: () => seoHead({ title: "Projects & Lookbooks | HMLND", description: "Explore the HMLND editorial world through concept campaigns, lookbooks and streetwear stories.", path: "/projects", image: projects[0]!.cover }),
  component: ProjectsPage,
});

function ProjectsPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-5 py-16 md:px-10">
      <h1 className="display text-6xl md:text-8xl">Projects</h1>
      <div className="mt-16 space-y-24">
        {projects.map((p, i) => (
          <Link key={p.slug} to="/projects/$slug" params={{ slug: p.slug }} className={`group grid items-end gap-8 md:grid-cols-[1.6fr_1fr] ${i % 2 ? "md:[&>div:first-child]:order-2" : ""}`}>
            <div className="overflow-hidden"><img src={p.cover} alt={p.coverAlt} loading={i ? "lazy" : "eager"} className="aspect-[16/10] w-full object-cover img-zoom group-hover:scale-[1.03]" /></div>
            <div>
              <p className="eyebrow text-muted-foreground">{p.number} — {p.season}</p>
              <h2 className="display mt-4 text-5xl">{p.title}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{p.subtitle}</p>
              <span className="eyebrow link-line mt-6 inline-block">Read story</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
