import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { IcosahedronGeometry } from "three";
import type { OrbEnergyState } from "./useOrbEnergy";

const ENERGY: Record<OrbEnergyState, number> = {
  idle: 0.15,
  thinking: 0.5,
  streaming: 0.9,
  error: 0.65,
};

const ORB_VERT = `
uniform float uTime;
uniform float uEnergy;

varying vec3 vNormal;
varying vec3 vViewDir;

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
  return mod289(((x * 34.0) + 1.0) * x);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float fbm3(vec3 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    sum += amp * snoise(p);
    p *= 2.02;
    amp *= 0.5;
  }
  return sum;
}

void main() {
  float amp = 0.08 + uEnergy * 0.35;
  vec3 flow = vec3(uTime * 0.31, uTime * 0.23, uTime * 0.17);

  float base = fbm3(position * 1.45 + flow);
  vec3 warp = vec3(
    snoise(position * 1.9 + flow.yzx),
    snoise(position * 1.9 + flow.zxy),
    snoise(position * 1.9 + flow.xyz)
  );

  vec3 displaced = position + normal * base * amp + warp * amp * 0.12;
  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);

  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(-mvPosition.xyz);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const ORB_FRAG = `
precision highp float;

uniform float uTime;
uniform float uEnergy;
uniform float uError;

varying vec3 vNormal;
varying vec3 vViewDir;

const vec3 VIOLET = vec3(0.656, 0.480, 1.0);
const vec3 FUCHSIA = vec3(0.854, 0.454, 0.944);
const vec3 AQUA = vec3(0.298, 0.860, 0.889);
const vec3 DESTRUCTIVE = vec3(0.914, 0.269, 0.330);

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vViewDir);
  float ndv = clamp(dot(n, v), 0.0, 1.0);

  float fresnel = pow(1.0 - ndv, 2.3);
  float core = pow(ndv, 2.4);

  float e1 = smoothstep(0.05, 0.55, uEnergy);
  float e2 = smoothstep(0.55, 0.95, uEnergy);

  vec3 rim = mix(VIOLET, FUCHSIA, e1);
  rim = mix(rim, mix(FUCHSIA, AQUA, 0.6), e2);
  vec3 coreColor = mix(VIOLET, FUCHSIA, e1);

  float pulse = 0.9 + 0.1 * sin(uTime * 2.1);

  vec3 color = rim * fresnel * 1.35 * pulse;
  color += coreColor * core * (0.22 + uEnergy * 0.55);

  float alpha = clamp(fresnel * 0.95 + core * 0.35 + uEnergy * 0.12, 0.0, 1.0);

  if (uError > 0.001) {
    float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
    float errPulse = 0.72 + 0.28 * (0.5 + 0.5 * sin(uTime * 1.7));
    vec3 errColor = DESTRUCTIVE * errPulse;
    color = mix(color, mix(vec3(lum), errColor, 0.6), uError);
  }

  gl_FragColor = vec4(color, alpha);
}
`;

interface OrbUniforms {
  [key: string]: { value: number };
  uTime: { value: number };
  uEnergy: { value: number };
  uError: { value: number };
}

function OrbMesh({ state }: { state: OrbEnergyState }) {
  const geometry = useMemo(() => new IcosahedronGeometry(1, 32), []);
  const uniforms = useMemo<OrbUniforms>(
    () => ({
      uTime: { value: 0 },
      uEnergy: { value: ENERGY[state] },
      uError: { value: state === "error" ? 1 : 0 },
    }),
    [],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const target = ENERGY[state];
    const current = uniforms.uEnergy.value;
    const eased = current + (target - current) * Math.min(1, dt * 5);
    uniforms.uEnergy.value = Math.abs(target - eased) < 0.001 ? target : eased;

    const errorTarget = state === "error" ? 1 : 0;
    uniforms.uError.value +=
      (errorTarget - uniforms.uError.value) * Math.min(1, dt * 4);

    uniforms.uTime.value += dt * (0.6 + uniforms.uEnergy.value * 2.2);
  });

  return (
    <mesh geometry={geometry}>
      <shaderMaterial
        vertexShader={ORB_VERT}
        fragmentShader={ORB_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

export default function OrbCanvas({ state }: { state: OrbEnergyState }) {
  const dpr =
    typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio, 1.5);

  return (
    <Canvas
      dpr={dpr}
      frameloop="always"
      shadows={false}
      camera={{ position: [0, 0, 3.1], fov: 45 }}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      style={{ width: "100%", height: "100%" }}
    >
      <OrbMesh state={state} />
    </Canvas>
  );
}
