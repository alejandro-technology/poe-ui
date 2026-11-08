import { lazy, Suspense } from "react";
import type { OrbEnergyState } from "./useOrbEnergy";

const OrbCanvas = lazy(() => import("./OrbCanvas"));

export interface OrbProps {
  size?: number;
  state?: OrbEnergyState;
  className?: string;
}

export function Orb({ size = 96, state = "idle", className }: OrbProps) {
  const classes = className ? `fx-orb ${className}` : "fx-orb";

  return (
    <div
      className={classes}
      style={{ width: size, height: size }}
      data-orb-state={state}
      aria-hidden="true"
    >
      <Suspense fallback={<div className="fx-orb-fallback" />}>
        <OrbCanvas state={state} />
      </Suspense>
    </div>
  );
}
