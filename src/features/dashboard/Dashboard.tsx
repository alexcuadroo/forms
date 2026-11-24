import { status } from "./formStatus";
import { useDashboard } from "./useDashboard";
import { FormRow } from "./FormRow";
import { appName } from "../../config";
import {
  PanelsTopLeft,
  Plus,
  Search,
  FileText,
  ChartNoAxesColumn,
  Globe,
  FolderOpen,
  Database,
  BookOpen,
} from "lucide-react";
import { Editor } from "../editor/Editor";
import { Results } from "../results/Results";
export function DashboardPage() {
  const actions = useDashboard();
  const {
    data,
    failed,
    reload,
    hiddenFormIds,
    form,
    result,
    search,
    find,
    filter,
    filterBy,
    busy,
    back,
    createForm,
    kind,
    selectKind,
    linkedId,
    linkedForm,
    linkFailed,
  } = actions;
  if (linkedForm) return <Editor key={linkedForm.id} form={linkedForm} back={back} />;
  if (linkedId) return <main className="shell"><p role={linkFailed ? 'alert' : 'status'}>{linkFailed ? 'No se pudo abrir esta ficha digital.' : 'Abriendo ficha digital…'}</p><button onClick={back}>Volver a Fichas digitales</button></main>;
  if (form) return <Editor key={form.id} form={form} back={back} />;
  if (result)
    return (
      <Results
        key={result.id}
        id={result.id}
        title={result.title}
        back={back}
      />
    );
  const rows = data?.forms.filter((row) => !hiddenFormIds.has(row.id)) || [];
  const hiddenBytes =
    data?.forms.reduce(
      (total, row) =>
        total + (hiddenFormIds.has(row.id) ? (row.fileBytes ?? 0) : 0),
      0,
    ) ?? 0;
  const usedBytes = Math.max(0, Number(data?.storage.used ?? 0) - hiddenBytes);
  const found = rows.filter(
    (r) =>
      r.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()) &&
      (filter === "Todos" || status(r) === filter),
  );
  const worksheets = kind === 'worksheet';
  return (
    <>
      <header className="top">
        <div className="brand">
          <span className="mark">
            <PanelsTopLeft />
          </span>
          <span>{appName}</span>
        </div>
        {data && (
          <div className="profile">
            <span>{data.user.name}</span>
            <b>{data.user.name?.slice(0, 1) || appName.slice(0, 1)}</b>
          </div>
        )}
      </header>
      <main className="shell dashboard">
        <nav aria-label="Secciones del panel" className="dashboard-sections">
          <button type="button" className={worksheets ? '' : 'active'} aria-pressed={!worksheets} onClick={() => selectKind('form')}><FileText size={16} /> Formularios</button>
          <button type="button" className={worksheets ? 'active' : ''} aria-pressed={worksheets} onClick={() => selectKind('worksheet')}><BookOpen size={16} /> Fichas digitales</button>
        </nav>
        <div className="bar heading">
          <div>
            <h1>{worksheets ? 'Fichas digitales' : 'Mis formularios'}</h1>
          </div>
          {!worksheets && <button
            className="primary"
            disabled={busy || !data}
            onClick={() => void createForm()}
          >
            <Plus />
            Crear formulario
          </button>}
        </div>
        <div className="stats">
          {(
            [
              [FileText, worksheets ? 'Fichas' : 'Formularios', rows.length],
              [
                Globe,
                "En recepción",
                rows.filter((r) => r.version && !r.closed).length,
              ],
              [
                ChartNoAxesColumn,
                "Respuestas",
                rows.reduce((n, r) => n + r.responses, 0),
              ],
            ] as const
          ).map(([Icon, title, value]) => (
            <div key={title}>
              <Icon />
              <span>{title}</span>
              <strong>{data ? value : "—"}</strong>
            </div>
          ))}
        </div>
        <div className="bar library">
          <div>
            <h2>Biblioteca</h2>
            <p className="library-count">
              {data
                ? `${found.length} de ${rows.length} ${worksheets ? 'fichas' : 'formularios'}`
                : worksheets ? 'Tus fichas' : 'Tus formularios'}
            </p>
          </div>
          <search>
            <label className="search">
              <Search />
              <input
                placeholder={worksheets ? 'Buscar ficha' : 'Buscar formulario'}
                type="search"
                aria-label={worksheets ? 'Buscar ficha' : 'Buscar formulario'}
                value={search}
                onChange={(e) => find(e.target.value)}
              />
            </label>
          </search>
        </div>
        <nav aria-label={worksheets ? 'Filtrar fichas' : 'Filtrar formularios'}>
          {["Todos", "Publicado", "Borrador", "Cerrado"].map((s, i) => (
            <button
              key={s}
              aria-pressed={s === filter}
              className={s === filter ? "active" : ""}
              onClick={() => filterBy(s)}
            >
              {["Todos", "Publicados", "Borradores", "Cerrados"][i]}
            </button>
          ))}
        </nav>
        {failed && (
          <button onClick={reload}>Volver a cargar la biblioteca</button>
        )}
        {!data && !failed && <p role="status">{worksheets ? 'Cargando fichas…' : 'Cargando formularios…'}</p>}
        {data && !found.length && (
          <div className="empty">
            <FolderOpen size={38} />
            <h2>
              {rows.length ? "Sin coincidencias" : "Tu biblioteca está vacía"}
            </h2>
            <p>
              {rows.length
                ? "Probá con otra búsqueda o filtro."
                : worksheets ? 'Enviá una ficha desde DeCabeza para empezar.' : 'Creá tu primer formulario para empezar a recibir respuestas.'}
            </p>
            {rows.length > 0 && (
              <button
                onClick={() => {
                  find("");
                  filterBy("Todos");
                }}
              >
                Limpiar búsqueda y filtros
              </button>
            )}
          </div>
        )}
        <div className="form-list">
          {found.map((r) => (
            <FormRow key={r.id} r={r} actions={actions} />
          ))}
        </div>
        {data && (
          <footer className="storage">
            <Database />
            <strong>Almacenamiento</strong>
            <progress
              aria-label="Almacenamiento utilizado"
              value={usedBytes}
              max={Number(data.storage.quota)}
            />
            <span>
              {(usedBytes / 1e6).toLocaleString("es-UY", {
                maximumFractionDigits: 1,
              })}{" "}
              MB de {data.storage.quota / 1e6} MB
            </span>
          </footer>
        )}
      </main>
    </>
  );
}
