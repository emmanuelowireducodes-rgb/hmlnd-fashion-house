import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  ImagePlus,
  Layers3,
  LogOut,
  Monitor,
  MousePointer2,
  RotateCcw,
  Save,
  Smartphone,
  Tablet,
  Type,
  Upload,
  Undo2,
  Redo2,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { MediaLibrary, type StudioMedia } from "@/components/studio/MediaLibrary";
import { DesignSystemPanel } from "@/components/studio/DesignSystemPanel";
import {
  defaultDesignSystem,
  designSystemStyle,
  resolveDesignSystem,
  type DesignSystem,
} from "@/lib/studio-design-system";

type Breakpoint = "desktop" | "tablet" | "mobile";
type Placement = {
  x: number;
  y: number;
  align: "left" | "center" | "right";
  ctaX?: number;
  ctaY?: number;
};
type Section = {
  id: string;
  type: "hero" | "projects" | "newsletter";
  title?: string;
  eyebrow?: string;
  cta?: string;
  href?: string;
  image?: string;
  alt?: string;
  focalX?: number;
  focalY?: number;
  visible: boolean;
  order: number;
  desktop?: Placement;
  tablet?: Placement;
  mobile?: Placement;
};
type Document = { schemaVersion: 1; sections: Section[]; designSystem?: DesignSystem };
type User = { id: string; email: string; role: string };
type Revision = { id: string; revision: number; document: Document };
const emptyDocument: Document = {
  schemaVersion: 1,
  sections: [],
  designSystem: defaultDesignSystem,
};
const menu = [
  { label: "Dashboard", to: "/studio/dashboard", enabled: true },
  { label: "Website Builder", to: "/studio", enabled: true },
  { label: "Pages", enabled: false },
  { label: "Media Library", to: "/studio/media", enabled: true },
  { label: "Navigation & Footer", enabled: false },
  { label: "Products", to: "/studio/products", enabled: true },
  { label: "Collections", to: "/studio/collections", enabled: true },
  { label: "Inventory", to: "/studio/inventory", enabled: true },
  { label: "Orders", to: "/studio/orders", enabled: true },
  { label: "Customers", enabled: false },
  { label: "Customisation Requests", enabled: false },
  { label: "Discounts", enabled: false },
  { label: "Marketing", enabled: false },
  { label: "Analytics", enabled: false },
  { label: "Settings", enabled: false },
  { label: "Team & Permissions", enabled: false },
  { label: "Activity Log", enabled: false },
];

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options?.body ? { "content-type": "application/json" } : {}),
      ...options?.headers,
    },
    credentials: "same-origin",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Studio request failed");
  return result as T;
}

export const Route = createFileRoute("/studio")({ component: Studio });

function Studio() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pinAvailable, setPinAvailable] = useState(false);
  const [pinDigits, setPinDigits] = useState("");
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [strongAuth, setStrongAuth] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [showDesignSystem, setShowDesignSystem] = useState(false);
  const [securityDevices, setSecurityDevices] = useState<
    {
      id: string;
      label: string;
      created_at: string;
      last_used_at: string | null;
      expires_at: number;
      pin_enabled: number;
      current: boolean;
    }[]
  >([]);
  const [reauthPassword, setReauthPassword] = useState("");
  const [pinSetup, setPinSetup] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [deviceLabel, setDeviceLabel] = useState("This browser");
  const [pinEntryError, setPinEntryError] = useState("");
  const pinInputRef = useRef<HTMLInputElement>(null);
  const [document, setDocument] = useState<Document>(emptyDocument);
  const [published, setPublished] = useState<Document>(emptyDocument);
  const [baseRevision, setBaseRevision] = useState(0);
  const [draftId, setDraftId] = useState("");
  const [selectedId, setSelectedId] = useState("mainline");
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("desktop");
  const [previewMode, setPreviewMode] = useState(false);
  const [saved, setSaved] = useState(true);
  const [history, setHistory] = useState<
    { id: string; revision: number; status: string; created_at: string }[]
  >([]);
  const [showHistory, setShowHistory] = useState(false);
  const [undoStack, setUndoStack] = useState<Document[]>([]);
  const [redoStack, setRedoStack] = useState<Document[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointer: number; id: string; element: "heading" | "cta" } | null>(null);
  const selected = document.sections.find((section) => section.id === selectedId);
  const designSystem = resolveDesignSystem(document.designSystem);
  const ordered = useMemo(
    () => [...document.sections].sort((a, b) => a.order - b.order),
    [document.sections],
  );

  const load = useCallback(async () => {
    try {
      const session = await api<{ user: User; strongAuth: boolean; pinAvailable: boolean }>(
        "/api/studio/session",
      );
      setUser(session.user);
      setStrongAuth(session.strongAuth);
      setPinAvailable(session.pinAvailable);
      const data = await api<{
        draft: (Revision & { revision: number }) | null;
        published: Revision | null;
      }>("/api/studio/home");
      setDocument(data.draft?.document || data.published?.document || emptyDocument);
      setPublished(data.published?.document || emptyDocument);
      setBaseRevision(data.draft?.revision || data.published?.revision || 0);
      setDraftId(data.draft?.id || "");
      setSaved(true);
    } catch {
      setUser(null);
      setStrongAuth(false);
      try {
        const status = await api<{ available: boolean }>("/api/studio/pin/status");
        setPinAvailable(status.available);
      } catch {
        setPinAvailable(false);
      }
    } finally {
      setChecking(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const unlockWithPin = async (pin: string) => {
    if (pin.length !== 4) return;
    setPinEntryError("");
    try {
      await api("/api/studio/pin/unlock", { method: "POST", body: JSON.stringify({ pin }) });
      setPinDigits("");
      setShowPasswordLogin(false);
      await load();
    } catch (e) {
      setPinDigits("");
      setPinEntryError(e instanceof Error ? e.message : "PIN unlock failed");
      pinInputRef.current?.focus();
    }
  };
  const enterPinDigit = (digit: string) => {
    setPinEntryError("");
    const next = `${pinDigits}${digit}`.slice(0, 4);
    setPinDigits(next);
    if (next.length === 4) void unlockWithPin(next);
    else pinInputRef.current?.focus();
  };
  const openSecurity = async () => {
    setError("");
    setReauthPassword("");
    setStrongAuth(false);
    try {
      const result = await api<{ devices: typeof securityDevices }>("/api/studio/security/devices");
      setSecurityDevices(result.devices);
      setShowSecurity(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load security settings");
    }
  };
  const verifyPasswordAgain = async () => {
    try {
      await api("/api/studio/reauth", {
        method: "POST",
        body: JSON.stringify({ password: reauthPassword }),
      });
      setReauthPassword("");
      setStrongAuth(true);
      setError("");
    } catch (e) {
      setStrongAuth(false);
      setError(e instanceof Error ? e.message : "Password verification failed");
    }
  };
  const savePin = async () => {
    try {
      await api(pinAvailable ? "/api/studio/pin/change" : "/api/studio/pin/enrol", {
        method: pinAvailable ? "PUT" : "POST",
        body: JSON.stringify({ pin: pinSetup, confirmPin: pinConfirm, label: deviceLabel }),
      });
      setPinSetup("");
      setPinConfirm("");
      setPinAvailable(true);
      const result = await api<{ devices: typeof securityDevices }>("/api/studio/security/devices");
      setSecurityDevices(result.devices);
      setError("PIN unlock is enabled for this trusted browser.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save PIN");
    }
  };
  const resetPin = async () => {
    try {
      await api("/api/studio/pin/reset", { method: "POST" });
      setPinAvailable(false);
      const result = await api<{ devices: typeof securityDevices }>("/api/studio/security/devices");
      setSecurityDevices(result.devices);
      setError("PIN removed from this browser. Use your password to sign in next time.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reset PIN");
    }
  };
  const revokeDevice = async (id: string) => {
    if (
      !window.confirm(
        "Revoke this trusted browser? Its PIN and active Studio sessions will stop working.",
      )
    )
      return;
    try {
      const target = securityDevices.find((device) => device.id === id);
      await api(`/api/studio/security/devices/${id}`, { method: "DELETE" });
      setSecurityDevices((devices) => devices.filter((device) => device.id !== id));
      if (target?.current) {
        setShowSecurity(false);
        setUser(null);
        setPinAvailable(false);
        setShowPasswordLogin(true);
      }
      setError("Trusted browser revoked.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not revoke browser");
    }
  };

  const edit = (change: (current: Document) => Document) => {
    setUndoStack((stack) => [...stack.slice(-39), document]);
    setRedoStack([]);
    setDocument(change(document));
    setSaved(false);
  };
  const updateSection = (id: string, update: Partial<Section>) =>
    edit((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === id ? { ...section, ...update } : section,
      ),
    }));
  const updateDesignSystem = (next: DesignSystem) =>
    edit((current) => ({ ...current, designSystem: next }));
  const updatePlacement = (
    id: string,
    values: Partial<Placement>,
    element: "heading" | "cta" = "heading",
  ) => {
    const section = document.sections.find((item) => item.id === id);
    if (!section) return;
    const placement = section[breakpoint] || { x: 50, y: 68, align: "center" as const };
    const next =
      element === "cta"
        ? {
            ...placement,
            ctaX: values.x ?? placement.ctaX ?? 50,
            ctaY: values.y ?? placement.ctaY ?? 82,
          }
        : { ...placement, ...values };
    updateSection(id, { [breakpoint]: next } as Partial<Section>);
  };
  const saveDraft = async () => {
    setError("");
    try {
      const result = await api<{ id: string; revision: number }>("/api/studio/home/draft", {
        method: "PUT",
        body: JSON.stringify({ document, baseRevision }),
      });
      setDraftId(result.id);
      setBaseRevision(result.revision);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save draft");
    }
  };
  const publish = async () => {
    setError("");
    try {
      let id = draftId;
      if (!saved || !id) {
        const result = await api<{ id: string; revision: number }>("/api/studio/home/draft", {
          method: "PUT",
          body: JSON.stringify({ document, baseRevision }),
        });
        id = result.id;
        setDraftId(id);
        setBaseRevision(result.revision);
        setSaved(true);
      }
      await api("/api/studio/home/publish", {
        method: "POST",
        body: JSON.stringify({ revisionId: id }),
      });
      setPublished(document);
      setDraftId("");
      setError("Published. The storefront will reflect this revision.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not publish");
    }
  };
  const uploadImage = async (file: File) => {
    if (!selected) return;
    if (file.size > 10_000_000) {
      setError("Image must be smaller than 10 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = await api<{ url: string }>("/api/studio/media", {
          method: "POST",
          body: JSON.stringify({ filename: file.name, data: String(reader.result) }),
        });
        updateSection(selected.id, {
          image: result.url,
          alt: selected.alt || file.name.replace(/\.[^.]+$/, ""),
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      }
    };
    reader.readAsDataURL(file);
  };
  const insertMedia = (media: StudioMedia) => {
    if (!selected) {
      setError("Select a page section before inserting an image.");
      return;
    }
    updateSection(selected.id, {
      image: media.url,
      alt: media.alt_text || media.filename.replace(/\.[^.]+$/, ""),
    });
    setShowMediaLibrary(false);
  };
  const moveSelected = (direction: -1 | 1) => {
    if (!selected) return;
    edit((current) => {
      const sections = [...current.sections].sort((a, b) => a.order - b.order);
      const index = sections.findIndex((item) => item.id === selected.id);
      const next = index + direction;
      if (next < 0 || next >= sections.length) return current;
      [sections[index], sections[next]] = [sections[next]!, sections[index]!];
      return { ...current, sections: sections.map((section, order) => ({ ...section, order })) };
    });
  };
  const moveCanvas = (event: React.PointerEvent<HTMLDivElement>) => {
    const active = dragRef.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!active || !rect || event.pointerId !== active.pointer) return;
    const x = Math.max(
      5,
      Math.min(95, Math.round(((event.clientX - rect.left) / rect.width) * 100)),
    );
    const y = Math.max(
      5,
      Math.min(95, Math.round(((event.clientY - rect.top) / rect.height) * 100)),
    );
    updatePlacement(active.id, { x, y }, active.element);
  };
  const restore = async (id: string) => {
    try {
      const result = await api<{ id: string; revision: number; document: Document }>(
        `/api/studio/home/restore/${id}`,
        { method: "POST" },
      );
      setDocument(result.document);
      setDraftId(result.id);
      setBaseRevision(result.revision);
      setSaved(true);
      setShowHistory(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed");
    }
  };

  if (checking)
    return (
      <div className="studio-login">
        <p>Opening HMLND Studio…</p>
      </div>
    );
  if (!user && pinAvailable && !showPasswordLogin)
    return (
      <div className="studio-login">
        <section className="studio-login__card studio-pin-card" aria-labelledby="studio-pin-title">
          <p className="studio-eyebrow">HMLND / TRUSTED DEVICE</p>
          <h1 id="studio-pin-title">Welcome back</h1>
          <p>Enter your four-digit PIN to unlock Studio.</p>
          <div className="studio-pin__entry">
            <div className="studio-pin__digits" aria-hidden="true">
              {[0, 1, 2, 3].map((index) => (
                <span key={index} className={pinDigits.length > index ? "is-filled" : ""} />
              ))}
            </div>
            <input
              ref={pinInputRef}
              className="studio-pin__capture"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={pinDigits}
              aria-label="Enter your four-digit Studio PIN"
              onChange={(event) => {
                const next = event.target.value.replace(/\D/g, "").slice(0, 4);
                setPinDigits(next);
                setPinEntryError("");
                if (next.length === 4) void unlockWithPin(next);
              }}
              onKeyDown={(event) => {
                if (event.key === "Backspace" && pinDigits.length === 0) setPinEntryError("");
              }}
              autoFocus
            />
          </div>
          <p className="studio-pin__count" aria-live="polite">
            {pinDigits.length} of 4 digits
          </p>
          <div className="studio-pin__keypad" aria-label="Numeric PIN keypad">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "backspace", "0", "clear"].map((key) =>
              key === "backspace" ? (
                <button
                  type="button"
                  key={key}
                  aria-label="Delete last digit"
                  onClick={() => {
                    setPinDigits((value) => value.slice(0, -1));
                    setPinEntryError("");
                    pinInputRef.current?.focus();
                  }}
                >
                  ⌫
                </button>
              ) : key === "clear" ? (
                <button
                  type="button"
                  key={key}
                  aria-label="Clear PIN"
                  onClick={() => {
                    setPinDigits("");
                    setPinEntryError("");
                    pinInputRef.current?.focus();
                  }}
                >
                  Clear
                </button>
              ) : (
                <button
                  type="button"
                  key={key}
                  aria-label={`Digit ${key}`}
                  onClick={() => enterPinDigit(key)}
                >
                  {key}
                </button>
              ),
            )}
          </div>
          {pinEntryError && (
            <p className="studio-error studio-pin__error" role="alert" aria-live="assertive">
              {pinEntryError}
            </p>
          )}
          <button
            className="studio-pin__password-link"
            onClick={() => {
              setShowPasswordLogin(true);
              setPinDigits("");
              setPinEntryError("");
            }}
          >
            Use password instead
          </button>
        </section>
      </div>
    );
  if (!user)
    return (
      <div className="studio-login">
        <form
          className="studio-login__card"
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            try {
              const result = await api<{ user: User; pinEnabled: boolean }>("/api/studio/login", {
                method: "POST",
                body: JSON.stringify({ email, password }),
              });
              setUser(result.user);
              setPinAvailable(result.pinEnabled);
              setShowPasswordLogin(false);
              setPassword("");
              await load();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Sign-in failed");
            }
          }}
        >
          <p className="studio-eyebrow">HMLND / PRIVATE ACCESS</p>
          <h1>Studio</h1>
          <p>Sign in to manage your storefront.</p>
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && (
            <p className="studio-error" role="alert">
              {error}
            </p>
          )}
          <button className="studio-primary">Sign in</button>
          <small>
            Local owner access is created once with STUDIO_BOOTSTRAP_EMAIL and
            STUDIO_BOOTSTRAP_PASSWORD.
          </small>
        </form>
      </div>
    );

  return (
    <div className="studio-shell">
      <aside className="studio-sidebar">
        <a className="studio-brand" href="/">
          HMLND <span>STUDIO</span>
        </a>
        <div className="studio-sidebar__label">WORKSPACE</div>
        <nav>
          {menu.map((item) =>
            item.enabled ? (
              <Link
                key={item.label}
                to={item.to!}
                activeProps={{ className: "is-active" }}
                activeOptions={{ exact: true }}
              >
                {item.label === "Website Builder" ? (
                  <Layers3 size={16} />
                ) : (
                  <span className="studio-nav-dot" />
                )}
                {item.label}
              </Link>
            ) : (
              <button key={item.label} type="button" disabled title="Not yet implemented">
                <span className="studio-nav-dot" />
                {item.label}
                <small>Coming soon</small>
              </button>
            ),
          )}
        </nav>
        <div className="studio-user">
          <span>{user.email}</span>
          <small>{user.role.replaceAll("_", " ")}</small>
          <button onClick={() => void openSecurity()}>Security &amp; trusted devices</button>
          <button
            onClick={async () => {
              await api("/api/studio/logout", { method: "POST" });
              setUser(null);
              setShowPasswordLogin(false);
              setPinDigits("");
            }}
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>
      <main className="studio-main">
        {pathname === "/studio" ? (
          <>
            <header className="studio-toolbar">
              <div>
                <p className="studio-eyebrow">WEBSITE / HOMEPAGE</p>
                <h1>
                  Visual Builder <span>{saved ? "Saved" : "Unsaved changes"}</span>
                </h1>
              </div>
              <div className="studio-toolbar__actions">
                <button title="Security and trusted devices" onClick={() => void openSecurity()}>
                  <ShieldCheck /> Security
                </button>
                <button
                  title="Undo"
                  disabled={!undoStack.length}
                  onClick={() => {
                    const previous = undoStack.at(-1);
                    if (previous) {
                      setRedoStack((s) => [...s, document]);
                      setDocument(previous);
                      setUndoStack((s) => s.slice(0, -1));
                      setSaved(false);
                    }
                  }}
                >
                  <Undo2 />
                </button>
                <button
                  title="Redo"
                  disabled={!redoStack.length}
                  onClick={() => {
                    const next = redoStack.at(-1);
                    if (next) {
                      setUndoStack((s) => [...s, document]);
                      setDocument(next);
                      setRedoStack((s) => s.slice(0, -1));
                      setSaved(false);
                    }
                  }}
                >
                  <Redo2 />
                </button>
                <span className="studio-toolbar__divider" />
                {(["desktop", "tablet", "mobile"] as Breakpoint[]).map((mode) => (
                  <button
                    className={breakpoint === mode ? "is-selected" : ""}
                    key={mode}
                    title={mode}
                    onClick={() => setBreakpoint(mode)}
                  >
                    {mode === "desktop" ? (
                      <Monitor />
                    ) : mode === "tablet" ? (
                      <Tablet />
                    ) : (
                      <Smartphone />
                    )}
                  </button>
                ))}
                <button
                  title="History"
                  onClick={async () => {
                    const result = await api<{ revisions: typeof history }>(
                      "/api/studio/home/history",
                    );
                    setHistory(result.revisions);
                    setShowHistory(true);
                  }}
                >
                  <RotateCcw />
                </button>
                <button title="Preview published" onClick={() => setPreviewMode((value) => !value)}>
                  <Eye /> {previewMode ? "Edit" : "Preview"}
                </button>
                <button onClick={() => void saveDraft()}>
                  <Save /> Save draft
                </button>
                <button className="studio-primary" onClick={() => void publish()}>
                  <Globe /> Publish
                </button>
              </div>
            </header>
            <div className="studio-workspace">
              <aside className="studio-panel studio-panel--left">
                <div className="studio-panel__heading">PAGE STRUCTURE</div>
                <div className="studio-page-chip">
                  Home page <span>/</span>
                </div>
                <div className="studio-panel__heading">
                  LAYERS{" "}
                  <button
                    title="Add hero"
                    onClick={() =>
                      edit((current) => ({
                        ...current,
                        sections: [
                          ...current.sections,
                          {
                            id: `hero-${Date.now()}`,
                            type: "hero",
                            title: "New campaign",
                            eyebrow: "HMLND",
                            cta: "Discover",
                            href: "/collections/mainline",
                            image: "/images/hero-mainline.jpg",
                            alt: "",
                            focalX: 50,
                            focalY: 50,
                            visible: true,
                            order: current.sections.length,
                            desktop: { x: 50, y: 68, align: "center" },
                            tablet: { x: 50, y: 70, align: "center" },
                            mobile: { x: 50, y: 75, align: "center" },
                          },
                        ],
                      }))
                    }
                  >
                    +
                  </button>
                </div>
                <div className="studio-layers">
                  {ordered.map((section) => (
                    <button
                      key={section.id}
                      className={selectedId === section.id ? "is-selected" : ""}
                      onClick={() => setSelectedId(section.id)}
                    >
                      <Layers3 size={15} />
                      <span>{section.title || section.type}</span>
                      {!section.visible && <small>Hidden</small>}
                    </button>
                  ))}
                </div>
                <div className="studio-layer-actions">
                  <button onClick={() => moveSelected(-1)} title="Move up">
                    <ArrowUp />
                  </button>
                  <button onClick={() => moveSelected(1)} title="Move down">
                    <ArrowDown />
                  </button>
                  <button
                    onClick={() =>
                      selected && updateSection(selected.id, { visible: !selected.visible })
                    }
                  >
                    {selected?.visible ? "Hide" : "Show"}
                  </button>
                </div>
                <div className="studio-panel__heading">QUICK ACCESS</div>
                <button className="studio-quick" onClick={() => setShowMediaLibrary(true)}>
                  <ImagePlus /> Media library
                </button>
                <button className="studio-quick" onClick={() => setShowDesignSystem(true)}>
                  <Type /> Design system
                </button>
              </aside>
              <section className="studio-canvas-area">
                <div className="studio-canvas-caption">
                  <span>HMLND.COM / HOME</span>
                  <span>
                    {previewMode ? "Published preview" : "Draft preview"} · {breakpoint}
                  </span>
                </div>
                <div
                  className={`studio-canvas studio-canvas--${breakpoint}`}
                  style={designSystemStyle(designSystem)}
                >
                  <div className="studio-site-header">
                    <span>HMLND</span>
                    <span>MAINLINE · SUMMER · PROJECTS</span>
                    <span>MENU · BAG (0)</span>
                  </div>
                  <div className="studio-canvas-sections">
                    {ordered.map((section) => {
                      const reference = previewMode
                        ? published.sections.find((item) => item.id === section.id)
                        : undefined;
                      const shown = reference || section;
                      return (
                        section.visible && (
                          <div
                            key={section.id}
                            ref={selectedId === section.id ? canvasRef : undefined}
                            className={`studio-preview-section ${selectedId === section.id && !previewMode ? "is-selected" : ""}`}
                            onClick={() => setSelectedId(section.id)}
                            onPointerMove={moveCanvas}
                            onPointerUp={() => {
                              dragRef.current = null;
                            }}
                          >
                            {section.type === "hero" ? (
                              <>
                                <img
                                  src={shown.image}
                                  alt={shown.alt || ""}
                                  style={{
                                    objectPosition: `${shown.focalX ?? 50}% ${shown.focalY ?? 50}%`,
                                  }}
                                />
                                <div className="studio-preview-shade" />
                                <div
                                  className={`studio-preview-copy align-${(shown[breakpoint] || { align: "center" }).align}`}
                                  style={{
                                    left: `${(shown[breakpoint] || { x: 50 }).x}%`,
                                    top: `${(shown[breakpoint] || { y: 70 }).y}%`,
                                  }}
                                >
                                  <div
                                    className="studio-draggable"
                                    onPointerDown={(event) => {
                                      if (!previewMode) {
                                        dragRef.current = {
                                          pointer: event.pointerId,
                                          id: section.id,
                                          element: "heading",
                                        };
                                        event.currentTarget.setPointerCapture(event.pointerId);
                                      }
                                    }}
                                  >
                                    <p>{shown.eyebrow}</p>
                                    <h2>{shown.title}</h2>
                                  </div>
                                </div>
                                <a
                                  className="studio-draggable-button"
                                  style={{
                                    left: `${shown[breakpoint]?.ctaX ?? 50}%`,
                                    top: `${shown[breakpoint]?.ctaY ?? 82}%`,
                                  }}
                                  onClick={(event) => event.preventDefault()}
                                  onPointerDown={(event) => {
                                    if (!previewMode) {
                                      event.stopPropagation();
                                      dragRef.current = {
                                        pointer: event.pointerId,
                                        id: section.id,
                                        element: "cta",
                                      };
                                      event.currentTarget.setPointerCapture(event.pointerId);
                                    }
                                  }}
                                >
                                  {shown.cta}
                                </a>
                                {selectedId === section.id && !previewMode && (
                                  <span className="studio-selection-tag">
                                    <MousePointer2 size={13} /> Drag heading or button independently
                                  </span>
                                )}
                              </>
                            ) : (
                              <div className="studio-placeholder-section">{shown.title}</div>
                            )}
                          </div>
                        )
                      );
                    })}
                  </div>
                </div>
              </section>
              <aside className="studio-panel studio-panel--right">
                <div className="studio-property-tabs">
                  <button className="is-active">Content</button>
                  <button>Style</button>
                  <button>Layout</button>
                </div>
                {selected?.type === "hero" ? (
                  <>
                    <div className="studio-panel__heading">CAMPAIGN CONTENT</div>
                    <label className="studio-field">
                      Heading
                      <input
                        value={selected.title || ""}
                        onChange={(e) => updateSection(selected.id, { title: e.target.value })}
                      />
                    </label>
                    <label className="studio-field">
                      Eyebrow
                      <input
                        value={selected.eyebrow || ""}
                        onChange={(e) => updateSection(selected.id, { eyebrow: e.target.value })}
                      />
                    </label>
                    <label className="studio-field">
                      Button label
                      <input
                        value={selected.cta || ""}
                        onChange={(e) => updateSection(selected.id, { cta: e.target.value })}
                      />
                    </label>
                    <label className="studio-field">
                      Button destination
                      <input
                        value={selected.href || ""}
                        onChange={(e) => updateSection(selected.id, { href: e.target.value })}
                      />
                    </label>
                    <div className="studio-panel__heading">CAMPAIGN IMAGE</div>
                    <label className="studio-field">
                      Image URL
                      <input
                        value={selected.image || ""}
                        onChange={(e) => updateSection(selected.id, { image: e.target.value })}
                      />
                    </label>
                    <label className="studio-upload">
                      <Upload size={17} /> Upload image
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void uploadImage(file);
                        }}
                      />
                    </label>
                    <label className="studio-field">
                      Image description
                      <input
                        value={selected.alt || ""}
                        onChange={(e) => updateSection(selected.id, { alt: e.target.value })}
                      />
                    </label>
                    <div className="studio-panel__heading">IMAGE FOCAL POINT</div>
                    <label className="studio-field">
                      Horizontal · {selected.focalX ?? 50}%
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={selected.focalX ?? 50}
                        onChange={(e) =>
                          updateSection(selected.id, { focalX: Number(e.target.value) })
                        }
                      />
                    </label>
                    <label className="studio-field">
                      Vertical · {selected.focalY ?? 50}%
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={selected.focalY ?? 50}
                        onChange={(e) =>
                          updateSection(selected.id, { focalY: Number(e.target.value) })
                        }
                      />
                    </label>
                    <div className="studio-panel__heading">
                      {breakpoint.toUpperCase()} HEADING POSITION
                    </div>
                    <div className="studio-coordinate-grid">
                      <label>
                        X (%)
                        <input
                          type="number"
                          min="5"
                          max="95"
                          value={selected[breakpoint]?.x ?? 50}
                          onChange={(e) =>
                            updatePlacement(selected.id, { x: Number(e.target.value) })
                          }
                        />
                      </label>
                      <label>
                        Y (%)
                        <input
                          type="number"
                          min="5"
                          max="95"
                          value={selected[breakpoint]?.y ?? 70}
                          onChange={(e) =>
                            updatePlacement(selected.id, { y: Number(e.target.value) })
                          }
                        />
                      </label>
                    </div>
                    <div className="studio-panel__heading">BUTTON POSITION</div>
                    <div className="studio-coordinate-grid">
                      <label>
                        X (%)
                        <input
                          type="number"
                          min="5"
                          max="95"
                          value={selected[breakpoint]?.ctaX ?? 50}
                          onChange={(e) =>
                            updatePlacement(selected.id, { x: Number(e.target.value) }, "cta")
                          }
                        />
                      </label>
                      <label>
                        Y (%)
                        <input
                          type="number"
                          min="5"
                          max="95"
                          value={selected[breakpoint]?.ctaY ?? 82}
                          onChange={(e) =>
                            updatePlacement(selected.id, { y: Number(e.target.value) }, "cta")
                          }
                        />
                      </label>
                    </div>
                    <label className="studio-field">
                      Heading alignment
                      <select
                        value={selected[breakpoint]?.align || "center"}
                        onChange={(e) =>
                          updatePlacement(selected.id, {
                            align: e.target.value as Placement["align"],
                          })
                        }
                      >
                        <option value="left">Left</option>
                        <option value="center">Centre</option>
                        <option value="right">Right</option>
                      </select>
                    </label>
                  </>
                ) : (
                  <p className="studio-helper">
                    Select a campaign layer to edit its content and responsive layout.
                  </p>
                )}
              </aside>
            </div>
            {error && (
              <div className="studio-toast" role="status">
                {error}
                <button onClick={() => setError("")}>Dismiss</button>
              </div>
            )}
            {showHistory && (
              <div className="studio-modal-backdrop" onClick={() => setShowHistory(false)}>
                <section className="studio-history" onClick={(e) => e.stopPropagation()}>
                  <h2>Version history</h2>
                  <p>Restore creates a new draft from this saved revision.</p>
                  {history.map((item) => (
                    <div key={item.id}>
                      <span>
                        Revision {item.revision} · {item.status}
                      </span>
                      <small>{new Date(item.created_at).toLocaleString()}</small>
                      <button onClick={() => void restore(item.id)}>Restore to draft</button>
                    </div>
                  ))}
                  <button onClick={() => setShowHistory(false)}>Close</button>
                </section>
              </div>
            )}
          </>
        ) : (
          <Outlet />
        )}
        {showMediaLibrary && pathname === "/studio" && (
          <div className="studio-modal-backdrop" onClick={() => setShowMediaLibrary(false)}>
            <div
              className="studio-media-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Media Library"
              onClick={(event) => event.stopPropagation()}
            >
              <MediaLibrary onSelect={insertMedia} onClose={() => setShowMediaLibrary(false)} />
            </div>
          </div>
        )}
        {showDesignSystem && pathname === "/studio" && (
          <div className="studio-modal-backdrop" onClick={() => setShowDesignSystem(false)}>
            <div onClick={(event) => event.stopPropagation()}>
              <DesignSystemPanel
                value={designSystem}
                onChange={updateDesignSystem}
                onClose={() => setShowDesignSystem(false)}
              />
            </div>
          </div>
        )}
        {showSecurity && (
          <div className="studio-modal-backdrop" onClick={() => setShowSecurity(false)}>
            <section
              className="studio-security"
              role="dialog"
              aria-modal="true"
              aria-labelledby="studio-security-title"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className="studio-security__close"
                aria-label="Close security settings"
                onClick={() => setShowSecurity(false)}
              >
                ×
              </button>
              <p className="studio-eyebrow">ACCOUNT / PROTECTION</p>
              <h2 id="studio-security-title">Security &amp; trusted devices</h2>
              <p className="studio-security__intro">
                PIN unlock works only in a browser you trusted after signing in with your password.
                Use your password if this device is new or the PIN is locked.
              </p>
              {!strongAuth ? (
                <form
                  className="studio-security__reauth"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void verifyPasswordAgain();
                  }}
                >
                  <label>
                    Password verification
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={reauthPassword}
                      onChange={(event) => setReauthPassword(event.target.value)}
                      required
                    />
                  </label>
                  <button className="studio-primary">Verify password</button>
                </form>
              ) : (
                <>
                  <div className="studio-security__pin">
                    <h3>
                      {pinAvailable ? "Change this browser’s PIN" : "Enable PIN on this browser"}
                    </h3>
                    <p>
                      Choose four digits. Your PIN is stored as a salted scrypt verifier and is
                      never saved in this browser.
                    </p>
                    <div className="studio-security__fields">
                      <label>
                        {pinAvailable ? "New PIN" : "Four-digit PIN"}
                        <input
                          type="password"
                          inputMode="numeric"
                          autoComplete="new-password"
                          maxLength={4}
                          pattern="[0-9]{4}"
                          value={pinSetup}
                          onChange={(event) =>
                            setPinSetup(event.target.value.replace(/\D/g, "").slice(0, 4))
                          }
                        />
                      </label>
                      <label>
                        Confirm PIN
                        <input
                          type="password"
                          inputMode="numeric"
                          autoComplete="new-password"
                          maxLength={4}
                          pattern="[0-9]{4}"
                          value={pinConfirm}
                          onChange={(event) =>
                            setPinConfirm(event.target.value.replace(/\D/g, "").slice(0, 4))
                          }
                        />
                      </label>
                    </div>
                    {!pinAvailable && (
                      <label className="studio-security__label">
                        Device name
                        <input
                          value={deviceLabel}
                          maxLength={80}
                          onChange={(event) => setDeviceLabel(event.target.value)}
                        />
                      </label>
                    )}
                    <div className="studio-security__actions">
                      <button
                        className="studio-primary"
                        disabled={pinSetup.length !== 4 || pinConfirm.length !== 4}
                        onClick={() => void savePin()}
                      >
                        {pinAvailable ? "Change PIN" : "Enable PIN unlock"}
                      </button>
                      {pinAvailable && (
                        <button onClick={() => void resetPin()}>Reset PIN here</button>
                      )}
                    </div>
                  </div>
                  <div className="studio-security__devices">
                    <h3>Trusted browsers</h3>
                    {securityDevices.length === 0 ? (
                      <p>No trusted browsers yet.</p>
                    ) : (
                      securityDevices.map((device) => (
                        <div className="studio-security__device" key={device.id}>
                          <div>
                            <strong>
                              {device.label}
                              {device.current ? " · This browser" : ""}
                            </strong>
                            <small>
                              {device.pin_enabled ? "PIN enabled" : "Password only"} · Last used{" "}
                              {device.last_used_at
                                ? new Date(device.last_used_at).toLocaleString()
                                : "Not yet"}
                            </small>
                          </div>
                          <button onClick={() => void revokeDevice(device.id)}>Revoke</button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
              <button className="studio-security__done" onClick={() => setShowSecurity(false)}>
                Done
              </button>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
