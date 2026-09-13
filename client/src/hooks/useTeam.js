import { useEffect, useState } from "react";
import { userService } from "../services";

let cache = null;
let pending = null;

export const invalidateTeam = () => {
  cache = null;
};

export default function useTeam() {
  const [team, setTeam] = useState(cache || []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let active = true;
    if (!cache) {
      pending = pending || userService.team().then((res) => {
        cache = res.items;
        pending = null;
        return cache;
      });
      pending
        .then((items) => active && setTeam(items))
        .catch(() => active && setTeam([]))
        .finally(() => active && setLoading(false));
    }
    return () => {
      active = false;
    };
  }, []);

  return { team, loading };
}
