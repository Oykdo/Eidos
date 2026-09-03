import { useEffect, useRef } from "react";
import { objetDePorte } from "@/lib/eidos/inventaire.ts";
import { rgbJauge, voxelsDe } from "@/lib/eidos/voxels.ts";
import type { ObjetPorte } from "@/lib/eidos/types.ts";

function shade(rgb: [number, number, number], k: number): string {
  return `rgb(${Math.round(rgb[0] * k)},${Math.round(rgb[1] * k)},${Math.round(rgb[2] * k)})`;
}

export function VoxelIcon({
  objet,
  size = 72,
}: {
  objet: ObjetPorte;
  size?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = size * dpr;
    c.height = size * dpr;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const vs = voxelsDe(objetDePorte(objet));
    const rgb = rgbJauge(objet.age, objet.nonce);
    const s = size / 18;
    const ox = size / 2;
    const oy = size * 0.62;
    const ordered = vs.slice().sort((a, b) => a.x + a.z - a.y - (b.x + b.z - b.y));
    const top = shade(rgb, 1);
    const left = shade(rgb, 0.55);
    const right = shade(rgb, 0.78);

    for (const v of ordered) {
      const px = ox + (v.x - v.z) * s * 0.5;
      const py = oy + (v.x + v.z) * s * 0.25 - v.y * s * 0.45;
      ctx.beginPath();
      ctx.moveTo(px, py - s * 0.45);
      ctx.lineTo(px + s * 0.5, py - s * 0.2);
      ctx.lineTo(px, py + s * 0.05);
      ctx.lineTo(px - s * 0.5, py - s * 0.2);
      ctx.closePath();
      ctx.fillStyle = top;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(px - s * 0.5, py - s * 0.2);
      ctx.lineTo(px, py + s * 0.05);
      ctx.lineTo(px, py + s * 0.5);
      ctx.lineTo(px - s * 0.5, py + s * 0.25);
      ctx.closePath();
      ctx.fillStyle = left;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(px + s * 0.5, py - s * 0.2);
      ctx.lineTo(px, py + s * 0.05);
      ctx.lineTo(px, py + s * 0.5);
      ctx.lineTo(px + s * 0.5, py + s * 0.25);
      ctx.closePath();
      ctx.fillStyle = right;
      ctx.fill();
    }
  }, [objet, size]);

  return <canvas ref={ref} width={size} height={size} className="block" style={{ width: size, height: size }} />;
}
