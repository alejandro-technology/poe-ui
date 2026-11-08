import { lazy } from "react";
import "./fx.css";

export { FxLayer } from "./FxLayer";
export { Orb } from "./Orb";
export const OrbCanvas = lazy(() => import("./OrbCanvas"));
export { useOrbEnergy } from "./useOrbEnergy";
export type { OrbEnergyApi, OrbEnergyState } from "./useOrbEnergy";
