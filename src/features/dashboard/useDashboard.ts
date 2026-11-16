import { useRef, useState } from "react";
import { api } from "../../api/client";
import { msg } from "../../utils/errors";
import { type Form } from "../../models/forms";
import { useDecision } from "../../components/DecisionDialog";
import { toast } from "sonner";
import { useResource } from "../../hooks/useResource";
import type { Row, Dashboard } from "./types";
export function useDashboard() {
  const ask = useDecision();
  const lock = useRef(false);
  const { data, failed, reload } = useResource<Dashboard>("/admin/forms");
  const [hiddenFormIds, setHiddenFormIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [form, edit] = useState<Form>(),
    [result, results] = useState<Row>(),
    [search, find] = useState(""),
    [filter, filterBy] = useState("Todos"),
    [busy, wait] = useState(false);
  async function run(fn: () => Promise<unknown>) {
    if (lock.current) return;
    lock.current = true;
    wait(true);
    try {
      await fn();
    } catch (e) {
      toast.error(msg(e));
    } finally {
      lock.current = false;
      wait(false);
    }
  }
  const back = () => {
    edit(undefined);
    results(undefined);
    reload();
  };
  async function deleteForm(row: Row) {
    setHiddenFormIds((ids) => new Set(ids).add(row.id));
    try {
      await api("/admin/forms/" + row.id, "DELETE", { closed: row.closed });
      toast.success(
        `Formulario «${row.title || "Formulario sin título"}» eliminado.`,
      );
    } catch (error) {
      setHiddenFormIds((ids) => {
        const remaining = new Set(ids);
        remaining.delete(row.id);
        return remaining;
      });
      toast.error(
        `No se pudo eliminar «${row.title || "Formulario sin título"}».`,
        {
          description: msg(error),
        },
      );
    }
  }
  const createForm = () =>
    run(async () => edit(await api<Form>("/admin/forms", "POST")));
  const openForm = (id: string) =>
    run(async () => edit(await api<Form>("/admin/forms/" + id)));
  const copyLink = (row: Row) =>
    run(async () => {
      await navigator.clipboard.writeText(location.origin + "/" + row.slug);
      toast.success("Enlace copiado.");
    });
  const toggleClosed = (row: Row) =>
    run(async () => {
      await api("/admin/forms/" + row.id + "/state", "POST", {
        closed: !row.closed,
      });
      toast.success(
        row.closed ? "Formulario reabierto." : "Formulario cerrado.",
      );
      reload();
    });
  return {
    createForm,
    openForm,
    copyLink,
    toggleClosed,
    ask,
    data,
    failed,
    reload,
    hiddenFormIds,
    form,
    edit,
    result,
    results,
    search,
    find,
    filter,
    filterBy,
    busy,
    run,
    back,
    deleteForm,
  };
}
