export const VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

export const FRAG = `#version 300 es
precision highp float;

uniform vec2 uRes;
uniform float uTime;
uniform float uIntensity;

out vec4 fragColor;

const vec3 VIOLET = vec3(0.656, 0.480, 1.0);
const vec3 FUCHSIA = vec3(0.854, 0.454, 0.944);
const vec3 AQUA = vec3(0.298, 0.860, 0.889);

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.55;
  for (int i = 0; i < 3; i++) {
    sum += amp * vnoise(p);
    p = p * 2.02 + vec2(15.7, 9.3);
    amp *= 0.5;
  }
  return sum;
}

float blob(vec2 uv, vec2 center, float radius, float warp) {
  float d = length(uv - center);
  float n = fbm(uv * 1.7 + center * 4.0 + uTime * 0.05);
  return 1.0 - smoothstep(0.0, radius, d + (n - 0.5) * warp);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime * 0.05;

  vec2 c1 = vec2(sin(t * 1.1) * 0.35 - 0.18, cos(t * 0.9) * 0.22 + 0.10);
  vec2 c2 = vec2(cos(t * 0.7 + 1.7) * 0.42 + 0.30, sin(t * 1.3 + 0.6) * 0.30 - 0.08);
  vec2 c3 = vec2(sin(t * 0.6 + 3.1) * 0.48 - 0.05, cos(t * 0.8 + 2.2) * 0.34 + 0.16);

  float b1 = blob(uv, c1, 0.85, 0.55);
  float b2 = blob(uv, c2, 0.65, 0.70);
  float b3 = blob(uv, c3, 0.50, 0.80);

  float flow = fbm(uv * 1.15 + vec2(t * 0.30, -t * 0.22));
  float curtain = smoothstep(0.35, 0.85, flow) * 0.28;

  vec3 color = VIOLET * b1 * 0.90;
  color += FUCHSIA * b2 * 0.42;
  color += AQUA * b3 * 0.22;
  color += VIOLET * curtain;

  float alpha = max(max(b1 * 0.60, b2 * 0.30), b3 * 0.16) + curtain * 0.50;
  alpha = clamp(alpha, 0.0, 1.0) * 0.45 * uIntensity;

  float dither = (hash21(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;
  color = max(color + dither, 0.0);
  alpha = clamp(alpha + dither * 0.5, 0.0, 1.0);

  fragColor = vec4(color * alpha, alpha);
}
`;

interface AuroraRenderer {
  start: () => void;
  stop: () => void;
  dispose: () => void;
}

const NOOP_RENDERER: AuroraRenderer = {
  start: () => {},
  stop: () => {},
  dispose: () => {},
};

const STATIC_TIME = 7.0;

function compile(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function createAuroraRenderer(canvas: HTMLCanvasElement): AuroraRenderer {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (!gl) return NOOP_RENDERER;

  const vertex = compile(gl, gl.VERTEX_SHADER, VERT);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vertex || !fragment) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    return NOOP_RENDERER;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    return NOOP_RENDERER;
  }

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return NOOP_RENDERER;
  }

  gl.useProgram(program);

  const uRes = gl.getUniformLocation(program, "uRes");
  const uTime = gl.getUniformLocation(program, "uTime");
  const uIntensity = gl.getUniformLocation(program, "uIntensity");

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  let raf = 0;
  let running = false;
  let elapsed = 0;
  let last = 0;

  const draw = (timeSeconds: number) => {
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    if (uRes) gl.uniform2f(uRes, width, height);
    if (uTime) gl.uniform1f(uTime, timeSeconds);
    if (uIntensity) gl.uniform1f(uIntensity, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const reducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const frame = (now: number) => {
    if (!running) return;
    if (last === 0) last = now;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    elapsed += dt;
    draw(elapsed);
    raf = window.requestAnimationFrame(frame);
  };

  const start = () => {
    if (running) return;
    if (reducedMotion()) {
      draw(STATIC_TIME);
      return;
    }
    running = true;
    last = 0;
    raf = window.requestAnimationFrame(frame);
  };

  const stop = () => {
    running = false;
    if (raf) {
      window.cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  const dispose = () => {
    stop();
    gl.bindVertexArray(null);
    if (vao) gl.deleteVertexArray(vao);
    gl.deleteProgram(program);
    if (!canvas.isConnected) {
      const ext = gl.getExtension("WEBGL_lose_context");
      if (ext) ext.loseContext();
    }
  };

  return { start, stop, dispose };
}
