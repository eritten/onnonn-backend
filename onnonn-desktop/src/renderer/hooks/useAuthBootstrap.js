import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";

export function useAuthBootstrap() {
  const restore = useAuthStore((state) => state.restore);

  useEffect(() => {
    restore();
  }, [restore]);
}
