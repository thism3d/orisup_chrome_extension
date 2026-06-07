import { useEffect, useMemo, useState } from "react";
import { Fab, Zoom, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { useStorefrontUiTemplate } from "@/hooks/useStorefrontUiTemplate";
import { storefrontScrollToTopFabSx } from "@/lib/storefrontUiSurface";

const SCROLL_THRESHOLD = 380;

export function ScrollToTopFab() {
  const theme = useTheme();
  const { uiTemplate } = useStorefrontUiTemplate();
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)", { defaultMatches: false });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > SCROLL_THRESHOLD);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goTop = () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    document.getElementById("main-content")?.focus({ preventScroll: true });
  };

  const extraFabSx = storefrontScrollToTopFabSx(uiTemplate);
  const resolvedExtra = useMemo(
    () => (typeof extraFabSx === "function" ? extraFabSx(theme) : extraFabSx),
    [extraFabSx, theme],
  );

  return (
    <Zoom in={visible} unmountOnExit={false}>
      <Fab
        color="primary"
        size="medium"
        aria-label="Scroll to top"
        onClick={goTop}
        sx={{
          position: "fixed",
          right: { xs: 16, sm: 24 },
          bottom: {
            xs: `max(94px, calc(86px + env(safe-area-inset-bottom, 0px)))`,
            sm: `max(24px, env(safe-area-inset-bottom, 0px))`,
          },
          zIndex: theme.zIndex.speedDial,
          ...resolvedExtra,
        }}
      >
        <KeyboardArrowUpIcon />
      </Fab>
    </Zoom>
  );
}
