import { fonts } from "../../../shared/forms.ts";
import type { Draft } from "../../models/forms";
import { MediaPicker } from "./MediaPicker";
export function ThemeEditor({ d, patch, asset }: { d: Draft; patch: (patch: Partial<Draft>) => void; asset: (file: File | undefined, background: boolean) => Promise<void> }) {
return (
        <div className="card fields">
          <h2>Diseño del formulario</h2>
          <label>
            Fuente
            <select
              value={d.theme.font}
              onChange={(e) =>
                patch({ theme: { ...d.theme, font: e.target.value } })
              }
            >
              {fonts.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
          {(["accent", "background"] as const).map((k) => (
            <label key={k}>
              {k === "accent" ? "Color de acento" : "Color de fondo"}
              <input
                type="color"
                value={d.theme[k]}
                onChange={(e) =>
                  patch({ theme: { ...d.theme, [k]: e.target.value } })
                }
              />
            </label>
          ))}
          <MediaPicker bg id={d.theme.image} asset={asset} remove={() => patch({ theme: { ...d.theme, image: "" } })} />
        </div>
);
}
