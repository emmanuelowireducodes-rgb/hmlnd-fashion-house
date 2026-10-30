import { X } from "lucide-react";

import {
  defaultDesignSystem,
  designSystemStyle,
  type BrandFont,
  type DesignSystem,
} from "@/lib/studio-design-system";

type Props = {
  value: DesignSystem;
  onChange: (value: DesignSystem) => void;
  onClose: () => void;
};

const fonts: BrandFont[] = ["Belleza", "Roboto Condensed", "Cormorant Garamond", "Futura PT"];

export function DesignSystemPanel({ value, onChange, onClose }: Props) {
  const update = (change: (current: DesignSystem) => DesignSystem) => onChange(change(value));
  return (
    <section
      className="studio-design-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-design-title"
    >
      <header className="studio-design-panel__header">
        <div>
          <p className="studio-eyebrow">HMLND STUDIO / BRAND</p>
          <h2 id="studio-design-title">Design System</h2>
          <p>Changes preview on the canvas and stay in your current draft.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close Design System">
          <X />
        </button>
      </header>
      <div className="studio-design-panel__body">
        <fieldset>
          <legend>Brand colours</legend>
          {(
            [
              ["background", "Background"],
              ["text", "Text"],
              ["accent", "Accent"],
            ] as const
          ).map(([key, label]) => (
            <label className="studio-design-panel__color" key={key}>
              {label}
              <input
                aria-label={label}
                type="color"
                value={value.colors[key]}
                onChange={(event) =>
                  update((current) => ({
                    ...current,
                    colors: { ...current.colors, [key]: event.target.value.toUpperCase() },
                  }))
                }
              />
              <code>{value.colors[key]}</code>
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Typography</legend>
          <label>
            Heading font
            <select
              value={value.typography.headingFont}
              onChange={(event) =>
                update((current) => ({
                  ...current,
                  typography: {
                    ...current.typography,
                    headingFont: event.target.value as BrandFont,
                  },
                }))
              }
            >
              {fonts.map((font) => (
                <option key={font}>{font}</option>
              ))}
            </select>
          </label>
          <label>
            Body font
            <select
              value={value.typography.bodyFont}
              onChange={(event) =>
                update((current) => ({
                  ...current,
                  typography: { ...current.typography, bodyFont: event.target.value as BrandFont },
                }))
              }
            >
              {fonts.map((font) => (
                <option key={font}>{font}</option>
              ))}
            </select>
          </label>
          <label>
            Font size preset
            <select
              value={value.typography.size}
              onChange={(event) =>
                update((current) => ({
                  ...current,
                  typography: {
                    ...current.typography,
                    size: event.target.value as DesignSystem["typography"]["size"],
                  },
                }))
              }
            >
              <option value="small">Compact</option>
              <option value="standard">Standard</option>
              <option value="large">Large</option>
            </select>
          </label>
        </fieldset>
        <fieldset>
          <legend>Layout and components</legend>
          <label>
            Button shape
            <select
              value={value.buttonStyle}
              onChange={(event) =>
                update((current) => ({
                  ...current,
                  buttonStyle: event.target.value as DesignSystem["buttonStyle"],
                }))
              }
            >
              <option value="square">Square (HMLND default)</option>
              <option value="soft">Soft corners</option>
              <option value="pill">Pill</option>
            </select>
          </label>
          <label>
            Section spacing
            <select
              value={value.spacing}
              onChange={(event) =>
                update((current) => ({
                  ...current,
                  spacing: event.target.value as DesignSystem["spacing"],
                }))
              }
            >
              <option value="compact">Compact</option>
              <option value="standard">Standard</option>
              <option value="spacious">Spacious</option>
            </select>
          </label>
          <label>
            Hero image shade
            <select
              value={value.sectionDefaults.heroOverlay}
              onChange={(event) =>
                update((current) => ({
                  ...current,
                  sectionDefaults: {
                    ...current.sectionDefaults,
                    heroOverlay: event.target
                      .value as DesignSystem["sectionDefaults"]["heroOverlay"],
                  },
                }))
              }
            >
              <option value="soft">Soft</option>
              <option value="standard">Standard</option>
              <option value="strong">Strong</option>
            </select>
          </label>
        </fieldset>
        <div className="studio-design-panel__preview" style={designSystemStyle(value)}>
          <span>Live preview</span>
          <strong>HMLND / Homeland</strong>
          <button type="button">Shop the collection</button>
        </div>
      </div>
      <footer className="studio-design-panel__footer">
        <button type="button" onClick={() => onChange(defaultDesignSystem)}>
          Reset defaults
        </button>
        <button type="button" className="studio-primary" onClick={onClose}>
          Done
        </button>
      </footer>
    </section>
  );
}
