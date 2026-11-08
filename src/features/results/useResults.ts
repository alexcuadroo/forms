import { createCsvExport } from "./exportCsv";
import type { ResultsData } from "./types";
import { useState } from "react";
import { toast } from "sonner";
import { useDecision } from "../../components/DecisionDialog";
import { useResource } from "../../hooks/useResource";
import { api } from "../../api/client";
import { msg } from "../../utils/errors";
export function useResults(id: string) {
  const ask = useDecision();
  const base = "/admin/forms/" + id + "/results";
  const { data, failed, reload } = useResource<ResultsData>(base);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [version, setVersion] = useState("");
  const [onlyFiles, setOnlyFiles] = useState(false);
  const files = new Map(data?.files.map((f) => [f.id, f]));
  const rows = data?.rows.filter((r) =>
    (!version || r.version === Number(version)) &&
    (!onlyFiles || Object.values(r.answers).some((a) => typeof a === "string" && files.has(a))) &&
    (!search.trim() || Object.values(r.answers).flat().some((a) =>
      (files.get(String(a))?.name || String(a)).toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es")))),
  ) || [];
  const csv = createCsvExport(data);

  async function deleteResponse(response: string) {
    try {
      setDeleting(true);
      await api(base + "/" + response, "DELETE");
      toast.success("Envío eliminado.");
      reload();
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setDeleting(false);
    }
  }
  return { ask, data, failed, reload, deleting, search, setSearch, version, setVersion, onlyFiles, setOnlyFiles, files, rows, csv, deleteResponse };
}
