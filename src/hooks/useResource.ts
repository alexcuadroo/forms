import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "../api/client";
import { msg } from "../utils/errors";

type Resource<T> = { key: string; data?: T; failed: boolean; status?: number };
export function useResource<T>(path: string, silentStatus?: number) {
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([path, revision, silentStatus]);
  const [resource, setResource] = useState<Resource<T>>({ key, failed: false });
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const data = await api<T>(path, "GET", undefined, controller.signal);
        if (!controller.signal.aborted)
          setResource({ key, data, failed: false });
      } catch (error) {
        if (controller.signal.aborted) return;
        const status = error instanceof ApiError ? error.status : undefined;
        setResource({ key, failed: true, status });
        if (silentStatus === undefined || status !== silentStatus)
          toast.error(msg(error));
      }
    }
    void load();
    return () => controller.abort();
  }, [key, path, silentStatus]);
  // A different request must never render the previous request's data or error.
  const current: Resource<T> =
    resource.key === key ? resource : { key, failed: false };
  return {
    data: current.data,
    failed: current.failed,
    status: current.status,
    reload: () => setRevision((value) => value + 1),
  };
}
