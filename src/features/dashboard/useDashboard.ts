import { useRef, useState } from "react";
import { api } from "../../api/client";
import { msg } from "../../utils/errors";
import { type Form } from "../../models/forms";
import { useDecision } from "../../components/DecisionDialog";
import { toast } from "sonner";
import { useResource } from "../../hooks/useResource";
import type { Row, Dashboard } from "./types";
import type { FormKind } from '../../models/forms';
import { uuid } from '../../../shared/forms.ts';
export function useDashboard() {
  const ask = useDecision();
  const lock = useRef(false);
  const params = new URLSearchParams(location.search);
  const [kind, setKind] = useState<FormKind>(() => params.get('tab') === 'worksheets' ? 'worksheet' : 'form');
  const [linkedId, setLinkedId] = useState(() => {
    const id = params.get('form');
    return kind === 'worksheet' && uuid(id) ? id : '';
  });
  const { data, failed, reload } = useResource<Dashboard>(kind === 'worksheet' ? '/admin/forms?kind=worksheet' : '/admin/forms');
  const linked = useResource<Form>(linkedId ? '/admin/forms/' + linkedId : '', 404);
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
    setLinkedId('');
    if (params.has('form')) history.replaceState(null, '', kind === 'worksheet' ? '/?tab=worksheets' : '/');
    reload();
  };
  function selectKind(next: FormKind) {
    setKind(next);
    setLinkedId('');
    find('');
    filterBy('Todos');
    history.replaceState(null, '', next === 'worksheet' ? '/?tab=worksheets' : '/');
  }
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
    kind,
    selectKind,
    linkedId,
    linkedForm: linked.data?.kind === 'worksheet' ? linked.data : undefined,
    linkFailed: linked.failed || Boolean(linked.data && linked.data.kind !== 'worksheet'),
  };
}
