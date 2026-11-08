import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { UiChatMessage } from "../hooks/useChat";
import { MessageBubble } from "./MessageBubble";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import type { Variants } from "motion/react";
import { Orb } from "../../fx";

const SPARKLES: Array<{ color: string; shadow: string }> = [
  {
    color: "var(--glow-1)",
    shadow: "0 0 10px oklch(0.7 0.22 293 / 0.55)",
  },
  {
    color: "var(--glow-2)",
    shadow: "0 0 10px oklch(0.72 0.2 320 / 0.55)",
  },
  {
    color: "var(--glow-3)",
    shadow: "0 0 10px oklch(0.82 0.12 200 / 0.5)",
  },
];

const heroContainerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const heroOrbVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 320, damping: 26 },
  },
};

const heroWordVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.25 } },
};

const heroLetterVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 480, damping: 30 },
  },
};

const heroDegreeVariants: Variants = {
  hidden: { opacity: 0, scale: 0.4, rotate: -30 },
  show: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { delay: 0.55, type: "spring", stiffness: 520, damping: 24 },
  },
};

const heroTextVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: "easeOut" },
  },
};

const heroReducedVariants: Variants = {
  hidden: { opacity: 1, y: 0, scale: 1 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.01 } },
};

export interface MessageListProps {
  messages: UiChatMessage[];
  isSending: boolean;
  messagesLoading: boolean;
}

export function MessageList({ messages, isSending, messagesLoading }: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const parallaxX = useMotionValue(0);
  const parallaxY = useMotionValue(0);
  const springX = useSpring(parallaxX, { stiffness: 150, damping: 20 });
  const springY = useSpring(parallaxY, { stiffness: 150, damping: 20 });
  const orbX = useTransform(springX, (value) => value * 9);
  const orbY = useTransform(springY, (value) => value * 7);
  const ringX = useTransform(springX, (value) => -value * 5);
  const ringY = useTransform(springY, (value) => -value * 4);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isSending, messagesLoading]);

  function handleHeroPointerMove(
    event: ReactPointerEvent<HTMLDivElement>,
  ): void {
    if (reducedMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    parallaxX.set(((event.clientX - rect.left) / rect.width) * 2 - 1);
    parallaxY.set(((event.clientY - rect.top) / rect.height) * 2 - 1);
  }

  let body;
  if (messagesLoading) {
    body = (
      <p className="animate-pulse m-auto px-4 py-8 text-center text-sm text-muted-foreground">
        Cargando mensajes…
      </p>
    );
  } else if (messages.length === 0) {
    body = (
      <motion.div
        className="m-auto flex w-full flex-col items-center gap-4 px-4 py-8 text-center"
        variants={heroContainerVariants}
        initial={reducedMotion ? false : "hidden"}
        animate="show"
        onPointerMove={handleHeroPointerMove}
      >
        <motion.div
          className="relative flex h-40 w-40 items-center justify-center"
          variants={reducedMotion ? heroReducedVariants : heroOrbVariants}
          style={reducedMotion ? undefined : { x: orbX, y: orbY }}
        >
          {reducedMotion ? (
            <div aria-hidden="true" className="hero-ring" />
          ) : (
            <motion.div
              aria-hidden="true"
              className="hero-ring hero-ring--spin"
              initial={{ opacity: 0, scale: 1.35, filter: "blur(5px)" }}
              animate={{ opacity: 0.45, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
              style={{ x: ringX, y: ringY }}
            />
          )}
          {!reducedMotion && (
            <div aria-hidden="true" className="fx-orbits">
              {SPARKLES.map((sparkle) => (
                <div className="fx-orbit" key={sparkle.color}>
                  <span
                    style={{
                      background: sparkle.color,
                      boxShadow: sparkle.shadow,
                    }}
                  />
                </div>
              ))}
            </div>
          )}
          <motion.div
            aria-hidden="true"
            animate={{ y: reducedMotion ? 0 : [0, -7, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Orb size={160} state="idle" />
          </motion.div>
        </motion.div>
        <motion.h1
          className="font-display text-4xl font-medium tracking-[-0.02em]"
          variants={reducedMotion ? heroReducedVariants : heroWordVariants}
        >
          {reducedMotion ? (
            "poe"
          ) : (
            <>
              {["p", "o", "e"].map((letter) => (
                <motion.span
                  key={letter}
                  className="inline-block"
                  variants={heroLetterVariants}
                >
                  {letter}
                </motion.span>
              ))}
              <motion.span
                aria-hidden="true"
                className="text-primary inline-block"
                variants={heroDegreeVariants}
              >
                °
              </motion.span>
            </>
          )}
        </motion.h1>
        <motion.p
          className="text-muted-foreground"
          variants={reducedMotion ? heroReducedVariants : heroTextVariants}
        >
          Tu pensamiento, refractado.
        </motion.p>
        <motion.p
          className="text-sm text-muted-foreground/75"
          variants={reducedMotion ? heroReducedVariants : heroTextVariants}
        >
          Escribí tu primer mensaje abajo
        </motion.p>
      </motion.div>
    );
  } else {
    body = (
      <AnimatePresence mode="popLayout" initial={false}>
        {messages.map((message) => (
          <MessageBubble key={message.key} message={message} />
        ))}
      </AnimatePresence>
    );
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-x-hidden overflow-y-auto px-5 py-6"
      ref={listRef}
    >
      {body}
      <AnimatePresence initial={false}>
        {isSending &&
          (messages.length === 0 ||
            messages[messages.length - 1].role !== "assistant") && (
          <motion.div
            key="thinking-chip"
            className="flex items-center gap-2 self-start rounded-full border border-border bg-card/60 px-3 py-2 text-sm"
            initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : -4 }}
            transition={{ duration: reducedMotion ? 0.01 : 0.2, ease: "easeOut" }}
          >
            <div
              aria-hidden="true"
              className="h-[10px] w-[10px] shrink-0 rounded-full shadow-[0_0_10px_oklch(0.7_0.22_293/0.55)]"
              style={{
                background:
                  "radial-gradient(circle at 35% 30%, #e3d6ff 0%, #a56bff 48%, #d44bdd 100%)",
              }}
            />
            <span className="fx-shimmer">Poe está pensando…</span>
          </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}
