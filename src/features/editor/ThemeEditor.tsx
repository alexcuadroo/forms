import { ArrowRight, Image } from "lucide-react";
import { fonts } from "../../../shared/forms.ts";
import type { Draft } from "../../models/forms";
import { contrast } from "../../utils/contrast";
import { MediaPicker } from "./MediaPicker";
import { appName } from "../../config";

export function ThemeEditor({ d, patch, asset }: { d: Draft; patch: (patch: Partial<Draft>) => void; asset: (file: File | undefined, background: boolean) => Promise<void> }) {
  const image = d.theme.image ? `/api/admin/files/${d.theme.image}` : undefined;
  return (
    <div className="theme-layout">
      <section className="card fields theme-controls" aria-labelledby="theme-heading">
        <div className="theme-heading">
          <h2 id="theme-heading">Diseño del formulario</h2>
          <p className="field-hint">Dale tu estilo. Los cambios se ven al instante.</p>
        </div>
        <div className="theme-basics">
          <label className="font-control">
            Fuente
            <select value={d.theme.font} onChange={(e) => patch({ theme: { ...d.theme, font: e.target.value } })}>
              {fonts.map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
          <div className="theme-colors">
            {(["accent", "background"] as const).map((k) => (
              <label className="color-control" key={k}>
                {k === "accent" ? "Acento" : "Fondo"}
                <span className="color-value">
                  <input type="color" aria-label={k === "accent" ? "Color de acento" : "Color de fondo"} value={d.theme[k]} onChange={(e) => patch({ theme: { ...d.theme, [k]: e.target.value } })} />
                  <span>{d.theme[k].toUpperCase()}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <section className="theme-image" aria-labelledby="image-heading">
          <h3 id="image-heading"><Image size={18} aria-hidden="true" />Imagen de fondo</h3>
          <MediaPicker bg id={d.theme.image} asset={asset} remove={() => patch({ theme: { ...d.theme, image: "" } })} />
          <p className="field-hint">Al subir una imagen, adaptamos el fondo y el acento a sus colores. Después podés ajustarlos.</p>
        </section>
      </section>
      <section className="theme-sample" aria-labelledby="sample-heading">
        <div className="sample-caption"><h3 id="sample-heading">Así se verá</h3><span>Muestra de estilo</span></div>
        <div className="sample-canvas" style={{
          fontFamily: `${d.theme.font}, sans-serif`,
          backgroundColor: d.theme.background,
          backgroundImage: image ? `linear-gradient(${d.theme.background}db, ${d.theme.background}db), url(${image})` : undefined,
          color: image ? "#202e29" : contrast(d.theme.background),
        }}>
          <div className="sample-title">{d.title || "Tu formulario"}</div>
          <div className="sample-question">
            <span>Pregunta 1</span>
            <h4>{d.questions[0]?.title || "¿Qué te gustaría preguntar?"}</h4>
            <p>Así se verán tus preguntas y colores.</p>
            <div className="sample-answer">Tu respuesta…</div>
            <span className="sample-button" style={{ background: d.theme.accent, color: contrast(d.theme.accent) }}>Continuar <ArrowRight size={16} aria-hidden="true" /></span>
          </div>
          <span className="sample-brand">{appName}</span>
        </div>
        <p className="field-hint">Probá el recorrido completo en «Vista previa».</p>
      </section>
    </div>
  );
}
