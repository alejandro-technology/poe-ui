import { useEffect, useRef } from "react";
import { createAuroraRenderer } from "./auroraShader";

export function FxLayer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = createAuroraRenderer(canvas);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const resize = () => {
      const width = Math.max(1, Math.floor(canvas.clientWidth / 2));
      const height = Math.max(1, Math.floor(canvas.clientHeight / 2));
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      if (!document.hidden) renderer.start();
    };

    const sync = () => {
      if (document.hidden) {
        renderer.stop();
      } else {
        renderer.start();
      }
    };

    const onVisibility = () => sync();
    const onMotion = () => {
      renderer.stop();
      sync();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);
    motion.addEventListener("change", onMotion);

    resize();
    sync();

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      motion.removeEventListener("change", onMotion);
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="fx-layer" aria-hidden="true" />;
}
