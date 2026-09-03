/** Contrats 3D partagés — Arbre et Reliques. */

import { useEffect, useState } from "react";

export const ATELIER_DPR: [number, number] = [1, 1.75];

export const ATELIER_GL = {
  antialias: true,
  alpha: false,
  powerPreference: "high-performance" as const,
};

export const ATELIER_FOND = "#12151a";

export const LUMIERE_AMB = 0.55;

export const LUMIERE_DIR = {
  position: [8, 18, 10] as [number, number, number],
  intensity: 0.85,
  color: "#dde1e6",
};

export function usePrefersReducedMotion(): boolean {
  const [v, setV] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setV(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return v;
}

export function useOngletVisible(): boolean {
  const [v, setV] = useState(true);
  useEffect(() => {
    const sync = () => setV(document.visibilityState !== "hidden");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
  return v;
}

export function webglDisponible(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return c.getContext("webgl2") != null || c.getContext("webgl") != null;
  } catch {
    return false;
  }
}
