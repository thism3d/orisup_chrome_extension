import { Box, useMediaQuery } from "@mui/material";
import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = { children: ReactNode; delayMs?: number };

/** Scroll-triggered fade + slide-up (respects reduced-motion). */
export function FadeInSection({ children, delayMs = 0 }: Props) {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)", { defaultMatches: false });
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(reduceMotion);

  useEffect(() => {
    if (reduceMotion) setVisible(true);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.06, rootMargin: "0px 0px -5% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduceMotion]);

  return (
    <Box
      ref={ref}
      sx={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(22px)",
        transition: reduceMotion
          ? "none"
          : `opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms`,
      }}
    >
      {children}
    </Box>
  );
}
