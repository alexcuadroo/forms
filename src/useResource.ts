import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, ApiError, msg } from "./model";

export function useResource<T>(path: string, silentStatus?: number) {
  const [data, setData] = useState<T>();
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState<number>();
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
        const errorStatus = error instanceof ApiError ? error.status : undefined;
        setStatus(errorStatus);
        if (silentStatus === undefined || errorStatus !== silentStatus) toast.error(msg(error));
      }
    }
    void load();
    return () => controller.abort();
  }, [path, revision, silentStatus]);

  function reload() {
    setData(undefined);
    setFailed(false);
    setStatus(undefined);
    setRevision(value => value + 1);
  }
  return { data, failed, status, reload };
}
