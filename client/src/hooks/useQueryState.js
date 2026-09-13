import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export default function useQueryState(defaults) {
  const [params, setParams] = useSearchParams();

  const state = useMemo(() => {
    const result = { ...defaults };
    for (const key of Object.keys(defaults)) {
      const value = params.get(key);
      if (value !== null) result[key] = typeof defaults[key] === "number" ? Number(value) || defaults[key] : value;
    }
    return result;
  }, [params]);

  const update = useCallback(
    (changes, { resetPage = true } = {}) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          const merged = { ...(resetPage && !("page" in changes) ? { page: defaults.page } : {}), ...changes };
          for (const [key, value] of Object.entries(merged)) {
            if (value === undefined || value === null || value === "" || value === defaults[key]) next.delete(key);
            else next.set(key, String(value));
          }
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  return [state, update];
}
