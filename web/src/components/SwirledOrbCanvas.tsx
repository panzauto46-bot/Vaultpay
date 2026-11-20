"use client";

import React, { useEffect, useRef } from "react";

interface SwirledOrbCanvasProps {
  isPulseActive?: boolean;
}

export default function SwirledOrbCanvas({
  isPulseActive = false,
}: SwirledOrbCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 340;
    const height = 190;
    canvas.width = width;
    canvas.height = height;

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    let animId: number;
    let rotAngle = 0;

    // 3D Vector helpers
    const normalize = (
      x: number,
      y: number,
      z: number
    ): [number, number, number] => {
      const len = Math.hypot(x, y, z) || 1;
      return [x / len, y / len, z / len];
    };

    // Rotate around X axis (tilt pole towards viewer so top convergence is visible like reference)
    const tiltAngle = 0.62; // ~35.5 degrees forward tilt
    const cosTilt = Math.cos(tiltAngle);
    const sinTilt = Math.sin(tiltAngle);

    // Slight Z tilt (-8 degrees) matching the slight left lean of the pole in the reference image
    const rollAngle = -0.14;
    const cosRoll = Math.cos(rollAngle);
    const sinRoll = Math.sin(rollAngle);

    // Studio lighting directions
    const keyLight = normalize(-0.25, -0.75, 0.62);
    const rimLight = normalize(0.65, -0.35, 0.67);
    const topLight = normalize(0.0, -0.95, 0.31);

    const numRibs = 15; // 15 sculptural spiral pleats converging at the top pole

    const renderFrame = () => {
      rotAngle += isPulseActive ? 0.032 : 0.0055;

      const cx = width * 0.5;
      const cy = height * 0.77; // Emerges from bottom center
      const baseR = 104;

      for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
          const idx = (py * width + px) * 4;

          const dx = (px - cx) / baseR;
          const dy = (py - cy) / baseR;
          const r2D = Math.hypot(dx, dy);

          if (r2D > 1.08) {
            data[idx + 3] = 0;
            continue;
          }

          // Approximate z on base sphere to compute spherical coordinates for fluted displacement
          const approxZ = Math.sqrt(Math.max(0.001, 1 - Math.min(1, r2D * r2D)));

          // Apply roll and forward tilt so the North Pole sits visibly near top-center
          const rx = dx * cosRoll - dy * sinRoll;
          const ry = dx * sinRoll + dy * cosRoll;

          const spX = rx;
          const spY = ry * cosTilt + approxZ * sinTilt; // Pole axis is spY = -1
          const spZ = -ry * sinTilt + approxZ * cosTilt;

          // Distance from North Pole (0, -1, 0)
          const poleFactor = Math.max(0, Math.min(1, (spY + 1) * 0.65));
          // Azimuthal angle around the North Pole axis (spX, spZ)
          const azimuth = Math.atan2(spZ, spX);

          // Spiral twist: ribs curve clockwise as they descend from the top pole
          const spiralTwist = (spY + 1.0) * 1.85;
          const ribPhase = numRibs * (azimuth + spiralTwist * 0.36) - rotAngle;

          // Sculptural folded pleat profile: sharp pinched ridge crest, deep curved trough
          const cosP = Math.cos(ribPhase);
          const sinP = Math.sin(ribPhase);

          // Shape the flute so ridges are distinct overlapping fins (like the reference image)
          const fluteHeight =
            Math.pow((cosP + 1) * 0.5, 1.35) *
            Math.min(1, Math.pow(poleFactor, 0.55) * 1.25);

          // Scalloped outer silhouette radius (so the outer border has the 3D bumpy ribs!)
          const effectiveRadius = 0.94 + 0.055 * fluteHeight;

          if (r2D > effectiveRadius) {
            data[idx + 3] = 0;
            continue;
          }

          // Smooth anti-aliased edge
          const edgeDist = effectiveRadius - r2D;
          const alpha = edgeDist < 0.018 ? edgeDist / 0.018 : 1.0;

          // Recompute surface Z with flute height
          const z = Math.sqrt(
            Math.max(0, effectiveRadius * effectiveRadius - r2D * r2D)
          );

          // Tangential normal perturbation across each spiral fin
          // One side of the fin faces top-left (bright royal blue), the other faces shadow (deep indigo)
          const finSlope = -sinP * 0.78 * Math.min(1, poleFactor * 1.4);

          const [nx, ny, nz] = normalize(
            dx + finSlope * 0.58,
            dy - Math.abs(finSlope) * 0.22 + (fluteHeight - 0.5) * 0.25,
            z + fluteHeight * 0.42
          );

          const diffKey = Math.max(
            0,
            nx * keyLight[0] + ny * keyLight[1] + nz * keyLight[2]
          );
          const diffRim = Math.max(
            0,
            nx * rimLight[0] + ny * rimLight[1] + nz * rimLight[2]
          );
          const diffTop = Math.max(
            0,
            nx * topLight[0] + ny * topLight[1] + nz * topLight[2]
          );

          // Deep crease shadow inside the valley between pleats
          const valleyAO = 0.16 + 0.84 * Math.pow(fluteHeight, 0.75);

          // Satin metallic-plastic highlight along the ridge edge (controlled so it stays blue, not white!)
          const ridgeCrest = Math.pow(fluteHeight, 3.2);
          const satinSpec =
            Math.pow(Math.max(0, diffTop * 0.65 + diffKey * 0.55), 5.0) *
            (0.35 + 0.65 * ridgeCrest);

          // Rim glow around the sphere contour
          const fresnel = Math.pow(1 - z / effectiveRadius, 2.2) * 0.55;

          const lightEnergy =
            (diffKey * 0.65 + diffRim * 0.35 + diffTop * 0.35) * valleyAO;

          // Calibrated to exact reference image Cobalt Blue palette:
          // Deep Trough: #061238 (6, 18, 56)
          // Mid Rib Face: #1B4FD8 (27, 79, 216)
          // Lit Crest: #4B83F6 (75, 131, 246)
          let r = 6 + lightEnergy * 34 + satinSpec * 62 + fresnel * 25;
          let g = 18 + lightEnergy * 88 + satinSpec * 105 + fresnel * 58;
          let b = 58 + lightEnergy * 172 + satinSpec * 85 + fresnel * 95;

          if (isPulseActive) {
            r += 14;
            g += 32;
            b += 40;
          }

          data[idx] = Math.min(235, Math.max(5, Math.round(r)));
          data[idx + 1] = Math.min(242, Math.max(12, Math.round(g)));
          data[idx + 2] = Math.min(255, Math.max(45, Math.round(b)));
          data[idx + 3] = Math.round(alpha * 255);
        }
      }

      ctx.putImageData(imgData, 0, 0);
      animId = requestAnimationFrame(renderFrame);
    };

    renderFrame();
    return () => cancelAnimationFrame(animId);
  }, [isPulseActive]);

  return (
    <canvas
      ref={canvasRef}
      className="w-[295px] h-[165px] pointer-events-none select-none drop-shadow-[0_-8px_25px_rgba(37,99,235,0.45)]"
    />
  );
}
