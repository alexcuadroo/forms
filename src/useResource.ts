import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, msg } from "./model";

export function useResource<T>(path: string) {
  const [data, setData] = useState<T>();
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const result = await api<T>(path, "GET", undefined, controller.signal);
        if (!controller.signal.aborted) setData(result);
      } catch (error) {
        if (controller.signal.aborted) return;
        setFailed(true);
        toast.error(msg(error));
      }
    }
    void load();
    return () => controller.abort();
  }, [path, revision]);

  function reload() {
    setData(undefined);
    setFailed(false);
    setRevision(value => value + 1);
  }
  return { data, failed, reload };
}
