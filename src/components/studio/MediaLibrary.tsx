import { Copy, Search, Trash2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type StudioMedia = {
  id: string;
  filename: string;
  mime_type: string;
  byte_count: number;
  alt_text: string;
  created_at: string;
  url: string;
};

type Props = {
  onSelect?: (media: StudioMedia) => void;
  onClose?: () => void;
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options?.body ? { "content-type": "application/json" } : {}),
      ...options?.headers,
    },
  });
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(result.error || "Media request failed");
  return result;
}

function readDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

function dimensions(
  event: React.SyntheticEvent<HTMLImageElement>,
  id: string,
  setSizes: (update: (sizes: Record<string, string>) => Record<string, string>) => void,
) {
  const image = event.currentTarget;
  setSizes((sizes) => ({ ...sizes, [id]: `${image.naturalWidth} × ${image.naturalHeight}` }));
}

export function MediaLibrary({ onSelect, onClose }: Props) {
  const [media, setMedia] = useState<StudioMedia[]>([]);
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [altDrafts, setAltDrafts] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await request<{ media: StudioMedia[] }>("/api/studio/media");
      setMedia(result.media);
      setAltDrafts(Object.fromEntries(result.media.map((item) => [item.id, item.alt_text || ""])));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load media.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(
    () =>
      media.filter((item) =>
        `${item.filename} ${item.alt_text}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [media, query],
  );

  const upload = async (file?: File) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError("Choose a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > 10_000_000) {
      setError("Image must be smaller than 10 MB.");
      return;
    }
    setUploading(true);
    setError("");
    setMessage("");
    try {
      await request<{ id: string; url: string }>("/api/studio/media", {
        method: "POST",
        body: JSON.stringify({ filename: file.name, data: await readDataUrl(file) }),
      });
      await load();
      setMessage("Image uploaded.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const saveAlt = async (item: StudioMedia) => {
    setError("");
    setMessage("");
    try {
      const result = await request<{ alt_text: string }>(`/api/studio/media/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ altText: altDrafts[item.id] || "" }),
      });
      setMedia((items) =>
        items.map((current) =>
          current.id === item.id ? { ...current, alt_text: result.alt_text } : current,
        ),
      );
      setMessage("Alt text saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save alt text.");
    }
  };

  const copyUrl = async (item: StudioMedia) => {
    try {
      await navigator.clipboard.writeText(new URL(item.url, window.location.origin).toString());
      setMessage("Image URL copied.");
      setError("");
    } catch {
      setError("Clipboard access is unavailable in this browser.");
      setMessage("");
    }
  };

  const remove = async (item: StudioMedia) => {
    if (
      !window.confirm(
        `Delete “${item.filename}”? Images used by pages, products or collections cannot be deleted.`,
      )
    )
      return;
    setError("");
    setMessage("");
    try {
      await request(`/api/studio/media/${item.id}`, { method: "DELETE" });
      setMedia((items) => items.filter((current) => current.id !== item.id));
      setMessage("Unused image deleted.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete image.");
    }
  };

  return (
    <section className={onSelect ? "studio-media studio-media--picker" : "studio-media"}>
      <header className="studio-products__header">
        <div>
          <p className="studio-eyebrow">HMLND STUDIO / ASSETS</p>
          <h1>Media Library</h1>
          <p>Images uploaded to the Studio, with private previews for your account.</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close media library">
            <X />
          </button>
        )}
      </header>
      <div className="studio-media__tools">
        <label className="studio-media__search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search images"
          />
        </label>
        <label className="studio-primary studio-media__upload">
          <Upload size={17} /> {uploading ? "Uploading…" : "Upload image"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={(event) => {
              void upload(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>
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
      {loading ? (
        <p role="status">Loading media…</p>
      ) : visible.length ? (
        <div className="studio-media__grid">
          {visible.map((item) => (
            <article className="studio-media__card" key={item.id}>
              <img
                src={`/api/studio/media/${item.id}/content`}
                alt={altDrafts[item.id] || item.filename}
                onLoad={(event) => dimensions(event, item.id, setSizes)}
              />
              <div className="studio-media__details">
                <strong title={item.filename}>{item.filename}</strong>
                <small>
                  {sizes[item.id] || "Dimensions loading"} · {(item.byte_count / 1024).toFixed(1)}{" "}
                  KB
                </small>
                <label>
                  Alt text
                  <input
                    maxLength={500}
                    value={altDrafts[item.id] ?? ""}
                    onChange={(event) =>
                      setAltDrafts((values) => ({ ...values, [item.id]: event.target.value }))
                    }
                  />
                </label>
                <div className="studio-media__actions">
                  {onSelect && (
                    <button type="button" className="studio-primary" onClick={() => onSelect(item)}>
                      Use image
                    </button>
                  )}
                  <button type="button" onClick={() => void saveAlt(item)}>
                    Save alt
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyUrl(item)}
                    aria-label={`Copy URL for ${item.filename}`}
                  >
                    <Copy size={15} /> Copy URL
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(item)}
                    aria-label={`Delete ${item.filename}`}
                  >
                    <Trash2 size={15} /> Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="studio-products__empty">
          <h2>{media.length ? "No matching images" : "No images uploaded yet"}</h2>
          <p>
            {media.length
              ? "Try a different search."
              : "Upload a JPEG, PNG or WebP image to get started."}
          </p>
        </div>
      )}
    </section>
  );
}
