import { useEffect } from "react";

export default function useClickOutside(ref, handler, active = true) {
  useEffect(() => {
    if (!active) return undefined;

    const onPointer = (event) => {
      if (ref.current && !ref.current.contains(event.target)) handler(event);
    };
    const onKey = (event) => {
      if (event.key === "Escape") handler(event);
    };

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, handler, active]);
}
