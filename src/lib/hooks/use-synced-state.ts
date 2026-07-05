import { useEffect, useState } from "react";

export function useSyncedState<T>(value: T) {
  const [state, setState] = useState(value);

  useEffect(() => {
    setState(value);
  }, [value]);

  return [state, setState] as const;
}
