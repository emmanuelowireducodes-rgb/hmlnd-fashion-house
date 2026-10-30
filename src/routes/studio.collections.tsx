import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

type ProductOption = { id: string; name: string; sku: string; status: string };
type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImage: string;
  seoTitle: string;
  seoDescription: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  productIds: string[];
  products: ProductOption[];
};
type Form = Omit<Collection, "products">;
const empty = (): Form => ({
  id: "",
  name: "",
  slug: "",
  description: "",
  coverImage: "",
  seoTitle: "",
  seoDescription: "",
  status: "DRAFT",
  productIds: [],
});
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: { ...(init?.body ? { "content-type": "application/json" } : {}), ...init?.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Collection request failed");
  return data as T;
}
export const Route = createFileRoute("/studio/collections")({ component: CollectionsPage });

function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [collectionRows, productRows] = await Promise.all([
        api<Collection[]>("/api/studio/collections"),
        api<ProductOption[]>("/api/studio/products"),
      ]);
      setCollections(collectionRows);
      setProducts(productRows.filter((product) => product.status !== "ARCHIVED"));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load collections");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  const open = (collection?: Collection) => {
    setError("");
    setMessage("");
    setForm(
      collection
        ? {
            id: collection.id,
            name: collection.name,
            slug: collection.slug,
            description: collection.description,
            coverImage: collection.coverImage,
            seoTitle: collection.seoTitle,
            seoDescription: collection.seoDescription,
            status: collection.status,
            productIds: [...collection.productIds],
          }
        : empty(),
    );
  };
  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));
  const uploadCover = async (file?: File) => {
    if (!file || !form) return;
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read image"));
        reader.readAsDataURL(file);
      });
      const result = await api<{ url: string }>("/api/studio/media", {
        method: "POST",
        body: JSON.stringify({ filename: file.name, data }),
      });
      set("coverImage", result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Cover upload failed");
    }
  };
  const save = async () => {
    if (!form) return;
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...form,
        slug:
          form.slug ||
          form.name
            .toLowerCase()
            .normalize("NFKD")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
      };
      const saved = await api<Collection>(
        form.id ? `/api/studio/collections/${form.id}` : "/api/studio/collections",
        { method: form.id ? "PUT" : "POST", body: JSON.stringify(payload) },
      );
      setCollections((all) => [saved, ...all.filter((item) => item.id !== saved.id)]);
      setForm(null);
      setMessage("Collection saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save collection");
    } finally {
      setBusy(false);
    }
  };
  const action = async (
    collection: Collection,
    type: "publish" | "unpublish" | "archive" | "restore",
  ) => {
    setError("");
    setMessage("");
    try {
      const result =
        type === "archive"
          ? await api<Collection>(`/api/studio/collections/${collection.id}/archive`, {
              method: "POST",
            })
          : type === "restore"
            ? await api<Collection>(`/api/studio/collections/${collection.id}`, {
                method: "PUT",
                body: JSON.stringify({ ...collection, status: "DRAFT" }),
              })
            : await api<Collection>(`/api/studio/collections/${collection.id}/publish`, {
                method: "POST",
                body: JSON.stringify({ published: type === "publish" }),
              });
      setCollections((all) => all.map((item) => (item.id === result.id ? result : item)));
      setMessage(
        type === "archive"
          ? "Collection archived."
          : type === "restore"
            ? "Collection restored as a draft."
            : type === "publish"
              ? "Collection published."
              : "Collection unpublished.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Collection action failed");
    }
  };
  const visible = collections.filter(
    (collection) => filter === "ALL" || collection.status === filter,
  );
  return (
    <main className="studio-products studio-collections">
      <header className="studio-products__header">
        <div>
          <p className="studio-eyebrow">HMLND STUDIO / CATALOGUE</p>
          <h1>Collections</h1>
          <p>Organise published products into storefront collections.</p>
        </div>
        <button className="studio-primary" onClick={() => open()}>
          Create collection
        </button>
      </header>
      {message && (
        <p className="studio-products__success" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="studio-error" role="alert">
          {error}
        </p>
      )}
      {form && (
        <section className="studio-products__form">
          <div className="studio-products__formhead">
            <h2>{form.id ? "Edit collection" : "New collection"}</h2>
            <button onClick={() => setForm(null)}>Close</button>
          </div>
          <div className="studio-products__fields">
            <label>
              Name
              <input
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((current) =>
                    current
                      ? {
                          ...current,
                          name,
                          slug:
                            current.id || current.slug
                              ? current.slug
                              : name
                                  .toLowerCase()
                                  .normalize("NFKD")
                                  .replace(/[^a-z0-9]+/g, "-")
                                  .replace(/^-|-$/g, ""),
                        }
                      : current,
                  );
                }}
              />
            </label>
            <label>
              URL slug
              <input
                value={form.slug}
                onChange={(e) =>
                  set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
                }
              />
            </label>
            <label>
              Status
              <select
                value={form.status === "ARCHIVED" ? "DRAFT" : form.status}
                onChange={(e) => set("status", e.target.value as Form["status"])}
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </label>
            <label>
              Cover image
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  void uploadCover(e.target.files?.[0]);
                  e.currentTarget.value = "";
                }}
              />
            </label>
            {form.coverImage && (
              <div className="studio-products__wide">
                <img
                  className="studio-collections__cover"
                  src={form.coverImage}
                  alt="Collection cover preview"
                />
              </div>
            )}
            <label className="studio-products__wide">
              Description
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </label>
            <label>
              SEO title
              <input value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
            </label>
            <label>
              SEO description
              <input
                value={form.seoDescription}
                onChange={(e) => set("seoDescription", e.target.value)}
              />
            </label>
            <fieldset className="studio-products__wide studio-collections__assign">
              <legend>Products (use arrows to order)</legend>
              {products.length ? (
                products.map((product) => {
                  const index = form.productIds.indexOf(product.id);
                  return (
                    <div className="studio-collections__product" key={product.id}>
                      <label>
                        <input
                          type="checkbox"
                          checked={index >= 0}
                          onChange={(e) =>
                            set(
                              "productIds",
                              e.target.checked
                                ? [...form.productIds, product.id]
                                : form.productIds.filter((id) => id !== product.id),
                            )
                          }
                        />
                        {product.name} <small>{product.status}</small>
                      </label>
                      {index >= 0 && (
                        <span>
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => {
                              const ids = [...form.productIds];
                              [ids[index - 1], ids[index]] = [ids[index]!, ids[index - 1]!];
                              set("productIds", ids);
                            }}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={index === form.productIds.length - 1}
                            onClick={() => {
                              const ids = [...form.productIds];
                              [ids[index], ids[index + 1]] = [ids[index + 1]!, ids[index]!];
                              set("productIds", ids);
                            }}
                          >
                            ↓
                          </button>
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <p>No products are available to assign yet.</p>
              )}
            </fieldset>
          </div>
          <div className="studio-products__formactions">
            <button disabled={busy} onClick={() => void save()}>
              Save collection
            </button>
          </div>
        </section>
      )}
      <section className="studio-products__listing">
        <div className="studio-products__filters">
          <select
            aria-label="Filter collections"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="ALL">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        {loading ? (
          <p>Loading collections…</p>
        ) : !visible.length ? (
          <div className="studio-products__empty">
            <h2>No collections found</h2>
            <button onClick={() => open()}>Create collection</button>
          </div>
        ) : (
          <div className="studio-products__tablewrap">
            <table className="studio-products__table">
              <thead>
                <tr>
                  <th>Collection</th>
                  <th>Products</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((collection) => (
                  <tr key={collection.id}>
                    <td>
                      <strong>{collection.name}</strong>
                      <small className="studio-collections__slug">/{collection.slug}</small>
                    </td>
                    <td>{collection.products.length}</td>
                    <td>{collection.status}</td>
                    <td>
                      <div className="studio-products__rowactions">
                        {collection.status === "ARCHIVED" ? (
                          <button onClick={() => void action(collection, "restore")}>
                            Restore
                          </button>
                        ) : (
                          <>
                            <button onClick={() => open(collection)}>Edit / organise</button>
                            {collection.status === "PUBLISHED" ? (
                              <button onClick={() => void action(collection, "unpublish")}>
                                Unpublish
                              </button>
                            ) : (
                              <button onClick={() => void action(collection, "publish")}>
                                Publish
                              </button>
                            )}
                            <button onClick={() => void action(collection, "archive")}>
                              Archive
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="studio-products__back">
        <Link to="/studio/products">← Products</Link>
      </p>
    </main>
  );
}
