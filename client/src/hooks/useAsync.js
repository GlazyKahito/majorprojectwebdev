import { useCallback, useEffect, useRef, useState } from "react";

export default function useAsync(fn, deps = [], { immediate = true } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: immediate });
  const requestId = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async ({ silent = false } = {}) => {
    const id = ++requestId.current;
    if (!silent) setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      if (id === requestId.current) setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      if (id === requestId.current) setState((prev) => ({ ...prev, error, loading: false }));
      return null;
    }
  }, []);

  useEffect(() => {
    if (immediate) run();
  }, deps);

  const setData = useCallback((updater) => {
    setState((prev) => ({ ...prev, data: typeof updater === "function" ? updater(prev.data) : updater }));
  }, []);

  return { ...state, reload: run, setData };
}
