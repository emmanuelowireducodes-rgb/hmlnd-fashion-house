import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sku: string;
  pricePesewas: number;
  category: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  images: { src: string; alt: string }[];
  sizes: string[];
  colours: string[];
  variants: { sku: string; size: string; colour: string }[];
  seoTitle: string;
  seoDescription: string;
  collectionIds: string[];
};
type CollectionOption = { id: string; name: string; status: string };
type ProductForm = Omit<Product, "id" | "slug"> & { id?: string; slug: string };
const blank = (): ProductForm => ({
  slug: "",
  name: "",
  description: "",
  sku: "",
  pricePesewas: 0,
  category: "T-shirts",
  status: "DRAFT",
  images: [],
  sizes: [],
  colours: [],
  variants: [],
  seoTitle: "",
  seoDescription: "",
  collectionIds: [],
});
const formatMoney = (pesewas: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(pesewas / 100);
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: { ...(init?.body ? { "content-type": "application/json" } : {}), ...init?.headers },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Product request failed");
  return result as T;
}
export const Route = createFileRoute("/studio/products")({ component: ProductsPage });

function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [form, setForm] = useState<ProductForm | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setProducts(await request<Product[]>("/api/studio/products"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load products");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    request<CollectionOption[]>("/api/studio/collections")
      .then(setCollections)
      .catch(() => setCollections([]));
  }, []);
  const visible = useMemo(
    () =>
      products.filter(
        (product) =>
          (filter === "ALL" || product.status === filter) &&
          `${product.name} ${product.sku} ${product.category}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [products, filter, search],
  );
  const edit = (product?: Product) => {
    setMessage("");
    setError("");
    setForm(product ? { ...product } : blank());
  };
  const patchForm = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));
  const save = async (status: "DRAFT" | "PUBLISHED" = "DRAFT") => {
    if (!form) return;
    setBusy(true);
    setError("");
    try {
      const sizes = form.sizes;
      const colours = form.colours;
      const variants = sizes.flatMap((size) =>
        colours.map((colour) => ({
          sku: `${form.sku}-${size}-${colour}`.toUpperCase().replace(/[^A-Z0-9-]/g, "-"),
          size,
          colour,
        })),
      );
      const body = JSON.stringify({ ...form, status, variants });
      const saved = form.id
        ? await request<Product>(`/api/studio/products/${form.id}`, { method: "PUT", body })
        : await request<Product>("/api/studio/products", { method: "POST", body });
      setProducts((all) => [saved, ...all.filter((item) => item.id !== saved.id)]);
      setForm(null);
      setMessage(status === "PUBLISHED" ? "Product published." : "Draft saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save product");
    } finally {
      setBusy(false);
    }
  };
  const doAction = async (
    product: Product,
    action: "duplicate" | "archive" | "publish" | "unpublish" | "restore",
  ) => {
    setError("");
    setMessage("");
    try {
      if (action === "restore") {
        const { id: _id, ...values } = product;
        const restored = await request<Product>(`/api/studio/products/${product.id}`, {
          method: "PUT",
          body: JSON.stringify({ ...values, status: "DRAFT" }),
        });
        setProducts((all) => all.map((item) => (item.id === restored.id ? restored : item)));
        setMessage("Archived product restored as a draft.");
        return;
      }
      const result =
        action === "duplicate"
          ? await request<Product>(`/api/studio/products/${product.id}/duplicate`, {
              method: "POST",
            })
          : action === "archive"
            ? await request<Product>(`/api/studio/products/${product.id}/archive`, {
                method: "POST",
              })
            : await request<Product>(`/api/studio/products/${product.id}/publish`, {
                method: "POST",
                body: JSON.stringify({ published: action === "publish" }),
              });
      setProducts((all) =>
        action === "duplicate"
          ? [result, ...all]
          : all.map((item) => (item.id === result.id ? result : item)),
      );
      setMessage(
        action === "duplicate"
          ? "Product duplicated as a draft."
          : action === "archive"
            ? "Product archived."
            : action === "publish"
              ? "Product published."
              : "Product unpublished.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed");
    }
  };
  const upload = async (file?: File) => {
    if (!file || !form) return;
    setImageBusy(true);
    setError("");
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read image"));
        reader.readAsDataURL(file);
      });
      const uploaded = await request<{ url: string }>("/api/studio/media", {
        method: "POST",
        body: JSON.stringify({ filename: file.name, data }),
      });
      patchForm("images", [
        ...form.images,
        { src: uploaded.url, alt: file.name.replace(/\.[^.]+$/, "") },
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Image upload failed");
    } finally {
      setImageBusy(false);
    }
  };
  const csv = (value: string) =>
    value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  return (
    <main className="studio-products">
      <header className="studio-products__header">
        <div>
          <p className="studio-eyebrow">HMLND STUDIO / CATALOGUE</p>
          <h1>Products</h1>
          <p>Manage product details and storefront visibility.</p>
        </div>
        <button className="studio-primary" onClick={() => edit()}>
          Add product
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
        <section
          className="studio-products__form"
          aria-label={form.id ? "Edit product" : "Create product"}
        >
          <div className="studio-products__formhead">
            <h2>{form.id ? "Edit product" : "New product"}</h2>
            <button type="button" onClick={() => setForm(null)}>
              Close
            </button>
          </div>
          <div className="studio-products__fields">
            <label>
              Product name
              <input
                value={form.name}
                onChange={(e) => patchForm("name", e.target.value)}
                required
              />
            </label>
            <label>
              URL slug
              <input
                value={form.slug}
                onChange={(e) =>
                  patchForm("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
                }
                placeholder="generated if blank"
              />
            </label>
            <label>
              SKU
              <input value={form.sku} onChange={(e) => patchForm("sku", e.target.value)} required />
            </label>
            <label>
              Category
              <select value={form.category} onChange={(e) => patchForm("category", e.target.value)}>
                <option>T-shirts</option>
                <option>Sweatshirts</option>
                <option>Hoodies</option>
                <option>Other garments</option>
              </select>
            </label>
            <label>
              Price (GHS)
              <input
                type="number"
                min="0"
                step="0.01"
                value={(form.pricePesewas / 100).toFixed(2)}
                onChange={(e) =>
                  patchForm("pricePesewas", Math.round(Number(e.target.value) * 100))
                }
              />
            </label>
            <label>
              Status
              <select
                value={form.status === "ARCHIVED" ? "DRAFT" : form.status}
                onChange={(e) => patchForm("status", e.target.value as ProductForm["status"])}
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </label>
            <label className="studio-products__wide">
              Description
              <textarea
                rows={5}
                value={form.description}
                onChange={(e) => patchForm("description", e.target.value)}
              />
            </label>
            <label>
              Sizes, comma separated
              <input
                value={form.sizes.join(", ")}
                onChange={(e) => patchForm("sizes", csv(e.target.value))}
                placeholder="S, M, L, XL"
              />
            </label>
            <label>
              Colours, comma separated
              <input
                value={form.colours.join(", ")}
                onChange={(e) => patchForm("colours", csv(e.target.value))}
                placeholder="Black, Bone"
              />
            </label>
            <label>
              SEO title
              <input
                value={form.seoTitle}
                onChange={(e) => patchForm("seoTitle", e.target.value)}
              />
            </label>
            <label>
              SEO description
              <input
                value={form.seoDescription}
                onChange={(e) => patchForm("seoDescription", e.target.value)}
              />
            </label>
            <fieldset className="studio-products__wide studio-products__collectionassign">
              <legend>Collections</legend>
              {collections.filter((collection) => collection.status !== "ARCHIVED").length ? (
                collections
                  .filter((collection) => collection.status !== "ARCHIVED")
                  .map((collection) => (
                    <label key={collection.id}>
                      <input
                        type="checkbox"
                        checked={form.collectionIds.includes(collection.id)}
                        onChange={(e) =>
                          patchForm(
                            "collectionIds",
                            e.target.checked
                              ? [...form.collectionIds, collection.id]
                              : form.collectionIds.filter((id) => id !== collection.id),
                          )
                        }
                      />
                      {collection.name}
                    </label>
                  ))
              ) : (
                <small>Create a collection first to assign this product.</small>
              )}
            </fieldset>
            <div className="studio-products__wide">
              <span>Product images</span>
              <label className="studio-products__upload">
                {imageBusy ? "Uploading…" : "Upload image"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={imageBusy || form.images.length >= 12}
                  onChange={(e) => {
                    void upload(e.target.files?.[0]);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              <div className="studio-products__images">
                {form.images.map((image, index) => (
                  <figure key={`${image.src}-${index}`}>
                    <img src={image.src} alt={image.alt} />
                    <button
                      type="button"
                      onClick={() =>
                        patchForm(
                          "images",
                          form.images.filter((_, i) => i !== index),
                        )
                      }
                    >
                      Remove
                    </button>
                  </figure>
                ))}
              </div>
            </div>
          </div>
          <div className="studio-products__formactions">
            <button type="button" disabled={busy} onClick={() => void save("DRAFT")}>
              Save draft
            </button>
            <button
              type="button"
              className="studio-primary"
              disabled={busy}
              onClick={() => void save("PUBLISHED")}
            >
              Save &amp; publish
            </button>
          </div>
        </section>
      )}
      <section className="studio-products__listing">
        <div className="studio-products__filters">
          <input
            aria-label="Search products"
            placeholder="Search name, SKU or category"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label="Filter by status"
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
          <p role="status">Loading products…</p>
        ) : error && products.length === 0 ? (
          <p>Products could not be loaded.</p>
        ) : visible.length === 0 ? (
          <div className="studio-products__empty">
            <h2>No products found</h2>
            <p>
              {products.length
                ? "Try another search or status filter."
                : "Add your first product to begin building the catalogue."}
            </p>
            {!products.length && <button onClick={() => edit()}>Add product</button>}
          </div>
        ) : (
          <div className="studio-products__tablewrap">
            <table className="studio-products__table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="studio-products__name">
                        {product.images[0] && <img src={product.images[0].src} alt="" />}
                        <div>
                          <strong>{product.name}</strong>
                          <small>
                            /{product.slug} · {product.category}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>{product.sku}</td>
                    <td>{formatMoney(product.pricePesewas)}</td>
                    <td>
                      <span
                        className={`studio-products__status is-${product.status.toLowerCase()}`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td>
                      <div className="studio-products__rowactions">
                        {product.status === "ARCHIVED" ? (
                          <button onClick={() => void doAction(product, "restore")}>Restore</button>
                        ) : (
                          <>
                            <button onClick={() => edit(product)}>Edit</button>
                            <button onClick={() => void doAction(product, "duplicate")}>
                              Duplicate
                            </button>
                            {product.status === "PUBLISHED" ? (
                              <button onClick={() => void doAction(product, "unpublish")}>
                                Unpublish
                              </button>
                            ) : (
                              <button onClick={() => void doAction(product, "publish")}>
                                Publish
                              </button>
                            )}
                            <button onClick={() => void doAction(product, "archive")}>
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
        <Link to="/studio">← Website Builder</Link>
      </p>
    </main>
  );
}
