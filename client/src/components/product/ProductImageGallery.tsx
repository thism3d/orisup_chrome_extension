import { Box, ButtonBase, IconButton, Stack, useMediaQuery, useTheme } from "@mui/material";
import { alpha, keyframes } from "@mui/material/styles";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { mediaAbsoluteUrl } from "@/lib/site";
import { storefrontBrandMain } from "@/lib/storefrontThemeBrand";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ProductImageLightbox } from "./ProductImageLightbox";
import { responsiveImg, resizedImg } from "@/lib/responsiveImg";

const PDP_MAIN_WIDTHS = [384, 512, 640, 768, 1024, 1280];
const PDP_MAIN_SIZES = "(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 600px";

/** Lower = less aggressive magnification in the hover panel. */
const ZOOM_FACTOR = 1.65;
/** Lens size as fraction of the main image (smaller lens = finer corner control). */
const LENS_FR = 0.2;
const SLIDESHOW_MS = 5000;
const MAIN_IMG_FADE_MS = 0.45;
/** Fallback zoom width (px) when the PDP right column width is not yet measured. */
const HOVER_ZOOM_PANEL_FALLBACK_PX = 320;

const pdpMainImgFade = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

type Props = {
  images: string[];
  active: number;
  onSelect: (i: number) => void;
  /** Optional: width in px of the right PDP column so the hover-zoom fills the full remaining PDP side. */
  hoverZoomWidth?: number;
  ratio?: string;
  /** Used for image alt and lightbox a11y. */
  productTitle?: string;
};

function imgUrl(src: string | undefined) {
  if (!src) return undefined;
  return mediaAbsoluteUrl(src) ?? src;
}

/** Scroll only the horizontal thumb strip, never the window (unlike `scrollIntoView`). */
function scrollThumbRowToShowActive(root: HTMLDivElement, el: HTMLElement) {
  const rRect = root.getBoundingClientRect();
  const eRect = el.getBoundingClientRect();
  if (rRect.width <= 0) return;
  const elCenter = eRect.left + eRect.width / 2;
  const rootCenter = rRect.left + rRect.width / 2;
  const delta = elCenter - rootCenter;
  if (Math.abs(delta) < 1) return;
  const max = Math.max(0, root.scrollWidth - root.clientWidth);
  const next = root.scrollLeft + delta;
  root.scrollTo({ left: Math.max(0, Math.min(max, next)), behavior: "smooth" });
}

export function ProductImageGallery({
  images,
  active,
  onSelect,
  hoverZoomWidth,
  ratio = "92%",
  productTitle,
}: Props) {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), { noSsr: true });
  const imageAlt = (productTitle?.trim() || "Product").replace(/<[^>]+>/g, "");
  const skipOpenClickRef = useRef(false);
  const pressRef = useRef({ active: false, x: 0, y: 0, moved: false });
  const list = images.length ? images : [undefined];
  const activeIdx = Math.min(Math.max(0, active), list.length - 1);
  const main = list[activeIdx];
  const mainAbs = imgUrl(main);
  const sources = list.map((s) => imgUrl(s) || "");
  const activeRef = useRef(activeIdx);
  activeRef.current = activeIdx;
  const thumbRowRef = useRef<HTMLDivElement | null>(null);

  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 });
  const mainBoxRef = useRef<HTMLButtonElement | null>(null);
  const mainImgRef = useRef<HTMLImageElement>(null);
  const [viewSize, setViewSize] = useState({ w: 0, h: 0 });

  const [lightbox, setLightbox] = useState(false);
  const [zoomAnchor, setZoomAnchor] = useState<{ top: number; left: number; height: number } | null>(null);

  const resolvedZoomWidth = Math.max(
    120,
    hoverZoomWidth && hoverZoomWidth > 0 ? Math.floor(hoverZoomWidth) : HOVER_ZOOM_PANEL_FALLBACK_PX,
  );

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isMd) return;
      const el = mainBoxRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width <= 0) return;
      const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      const y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      setPos({ x, y });
    },
    [isMd],
  );

  useEffect(() => {
    const im = mainImgRef.current;
    if (!im) return;
    const r = new ResizeObserver(() => {
      const w = im.clientWidth;
      const h = im.clientHeight;
      if (w && h) setViewSize({ w, h });
    });
    r.observe(im);
    return () => r.disconnect();
  }, [activeIdx, mainAbs]);

  /** Auto-advance main image; pause on main+zoom hover or lightbox. */
  useEffect(() => {
    if (list.length <= 1) return;
    if (lightbox || hover) return;
    const t = setInterval(() => {
      onSelect((activeRef.current + 1) % list.length);
    }, SLIDESHOW_MS);
    return () => clearInterval(t);
  }, [list.length, lightbox, hover, onSelect]);

  /** Keep active thumbnail visible in the scroll row (do not use scrollIntoView — it scrolls the page). */
  useEffect(() => {
    const root = thumbRowRef.current;
    if (!root || list.length <= 1) return;
    const el = root.querySelector<HTMLElement>(`[data-pdp-thumb-idx="${activeIdx}"]`);
    if (!el) return;
    scrollThumbRowToShowActive(root, el);
  }, [activeIdx, list.length]);

  const canPrevL = activeIdx > 0;
  const canNextL = activeIdx < list.length - 1;

  const goPrevL = useCallback(() => {
    onSelect(Math.max(0, activeIdx - 1));
  }, [activeIdx, onSelect]);
  const goNextL = useCallback(() => {
    onSelect(Math.min(list.length - 1, activeIdx + 1));
  }, [activeIdx, list.length, onSelect]);

  const openL = (index: number) => {
    onSelect(index);
    setLightbox(true);
  };

  const handleMainImageClick = () => {
    if (skipOpenClickRef.current) {
      skipOpenClickRef.current = false;
      return;
    }
    if (mainAbs) openL(activeIdx);
  };

  const showHoverZoom = Boolean(isMd && mainAbs && hover && viewSize.w > 0 && viewSize.h > 0);
  const wV = viewSize.w;
  const hV = viewSize.h;
  const z = ZOOM_FACTOR;
  const lensPct = LENS_FR * 100;
  const lensHalf = (LENS_FR / 2) * 100;
  const viewportW = typeof window !== "undefined" ? window.innerWidth : Number.POSITIVE_INFINITY;
  const canPlaceRight = zoomAnchor ? zoomAnchor.left + 8 + resolvedZoomWidth <= viewportW - 8 : true;
  const zoomPanelLeft = zoomAnchor
    ? canPlaceRight
      ? zoomAnchor.left + 8
      : Math.max(8, zoomAnchor.left - 8 - resolvedZoomWidth)
    : 0;

  useEffect(() => {
    if (!showHoverZoom) {
      setZoomAnchor(null);
      return;
    }
    const update = () => {
      const el = mainBoxRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setZoomAnchor({
        top: r.top,
        left: r.right,
        height: Math.max(120, r.height),
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [showHoverZoom]);

  /** Portaled to body so it stacks above the dim overlay; must beat `zIndex.modal` (same as dim's layer). */
  const hoverZoomZ = (t: { zIndex: { modal: number; tooltip: number } }) => t.zIndex.tooltip;

  const zoomPanelEl =
    isMd && showHoverZoom && zoomAnchor && mainAbs && typeof document !== "undefined" ? (
      <Box
        className="product-pdp-hover-zoom"
        role="img"
        aria-label="Enlarged product image preview"
        sx={(t) => ({
          position: "fixed",
          /* Align top with main product image; height matches image (viewport coords from getBoundingClientRect). */
          top: zoomAnchor.top,
          left: zoomPanelLeft,
          width: resolvedZoomWidth,
          minWidth: resolvedZoomWidth,
          maxWidth: resolvedZoomWidth,
          height: zoomAnchor.height,
          flexShrink: 0,
          boxSizing: "border-box",
          borderRadius: 2.5,
          border: 1,
          borderColor: "divider",
          bgcolor: "common.white",
          boxShadow: "0 8px 32px rgba(15,23,42,0.2)",
          overflow: "hidden",
          zIndex: hoverZoomZ(t),
          pointerEvents: "auto",
        })}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
          }}
        >
          <img
            src={mainAbs!}
            alt=""
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: wV * z,
              height: hV * z,
              maxWidth: "none",
              objectFit: "cover",
              transform: `translate(${-pos.x * wV * (z - 1)}px, ${-pos.y * hV * (z - 1)}px)`,
              transformOrigin: "0 0",
              display: "block",
              pointerEvents: "none",
            }}
          />
        </Box>
      </Box>
    ) : null;

  return (
    <>
      {showHoverZoom && typeof document !== "undefined"
        ? createPortal(
            <Box
              aria-hidden
              sx={(t) => ({
                position: "fixed",
                inset: 0,
                bgcolor: alpha(t.palette.common.black, 0.45),
                zIndex: t.zIndex.modal,
                pointerEvents: "none",
              })}
            />,
            document.body,
          )
        : null}
      {zoomPanelEl ? createPortal(zoomPanelEl, document.body) : null}
      <Stack spacing={1.5}>
        <Box
          onMouseEnter={() => isMd && setHover(true)}
          onMouseLeave={() => isMd && setHover(false)}
          sx={{
            position: "relative",
            width: "100%",
            minWidth: 0,
            overflow: "visible",
            isolation: "isolate",
          }}
        >
          <ButtonBase
            ref={mainBoxRef}
            onMouseMove={onMove}
            onPointerDown={(e) => {
              skipOpenClickRef.current = false;
              pressRef.current = { active: true, x: e.clientX, y: e.clientY, moved: false };
            }}
            onPointerMove={(e) => {
              if (!pressRef.current.active) return;
              const d = Math.hypot(e.clientX - pressRef.current.x, e.clientY - pressRef.current.y);
              if (d > 12) {
                pressRef.current.moved = true;
                skipOpenClickRef.current = true;
              }
            }}
            onPointerUp={() => {
              pressRef.current.active = false;
            }}
            onPointerCancel={() => {
              pressRef.current.active = false;
            }}
            onClick={handleMainImageClick}
            type="button"
            disableRipple
            disabled={!mainAbs}
            aria-label={!mainAbs ? "No product image" : undefined}
            sx={{
              display: "block",
              textAlign: "left",
              width: "100%",
              p: 0,
              m: 0,
              position: "relative",
              border: "none",
              minWidth: 0,
              borderRadius: 0,
              cursor: mainAbs ? (isMd ? "zoom-in" : "zoom-in") : "default",
            }}
          >
            <Box
              sx={(t) => ({
                pt: ratio,
                position: "relative",
                borderRadius: 2.5,
                bgcolor: "grey.50",
                border: "1px solid",
                borderColor: "divider",
                boxShadow: `inset 0 0 0 1px ${alpha(t.palette.common.black, 0.04)}, 0 16px 48px rgba(11,11,11,0.08)`,
                overflow: "hidden",
                transition: "box-shadow 0.25s ease",
              })}
            >
              {mainAbs ? (
                <Box
                  key={activeIdx}
                  sx={{
                    position: "absolute",
                    inset: 0,
                    animation: `${pdpMainImgFade} ${MAIN_IMG_FADE_MS}s ease-out`,
                  }}
                >
                  {(() => {
                    const main = responsiveImg(mainAbs, PDP_MAIN_WIDTHS);
                    return (
                  <img
                    ref={mainImgRef}
                    src={main.src || mainAbs}
                    srcSet={main.srcSet}
                    sizes={main.srcSet ? PDP_MAIN_SIZES : undefined}
                    width={800}
                    height={800}
                    fetchPriority={activeIdx === 0 ? "high" : "auto"}
                    decoding={activeIdx === 0 ? "sync" : "async"}
                    alt={imageAlt}
                    onLoad={() => {
                      const im = mainImgRef.current;
                      if (im?.clientWidth && im?.clientHeight) {
                        setViewSize({ w: im.clientWidth, h: im.clientHeight });
                      }
                    }}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      objectPosition: "center",
                      display: "block",
                      pointerEvents: "none",
                      userSelect: "none",
                    }}
                    onDragStart={(e) => e.preventDefault()}
                  />
                    );
                  })()}
                </Box>
              ) : null}
              {isMd && hover && mainAbs && wV > 0 && hV > 0 && (
                <Box
                  sx={(t) => ({
                    position: "absolute",
                    left: `calc(${(pos.x * 100).toFixed(3)}% - ${lensHalf.toFixed(3)}%)`,
                    top: `calc(${(pos.y * 100).toFixed(3)}% - ${lensHalf.toFixed(3)}%)`,
                    width: `${lensPct}%`,
                    height: `${lensPct}%`,
                    minWidth: 32,
                    minHeight: 32,
                    border: `1px solid ${alpha(storefrontBrandMain(t), 0.9)}`,
                    bgcolor: alpha(t.palette.common.white, 0.18),
                    pointerEvents: "none",
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.2) inset",
                    borderRadius: 0.5,
                    maxWidth: "100%",
                    maxHeight: "100%",
                  })}
                />
              )}
            </Box>
          </ButtonBase>
        </Box>
        {list.length > 1 && (
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            sx={{ width: "100%" }}
            aria-label="Product images"
          >
            <IconButton
              type="button"
              size="small"
              onClick={goPrevL}
              disabled={!canPrevL}
              aria-label="Previous product image"
              sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, flexShrink: 0 }}
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <Box
              ref={thumbRowRef}
              className="pdp-thumb-row"
              sx={{
                display: "flex",
                flex: 1,
                flexDirection: "row",
                flexWrap: "nowrap",
                gap: 1,
                minWidth: 0,
                py: 0.5,
                overflowX: "auto",
                overflowY: "hidden",
                WebkitOverflowScrolling: "touch",
                touchAction: "pan-x",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                "&::-webkit-scrollbar": { display: "none" },
                scrollSnapType: { xs: "x proximity", sm: "none" },
                "& .pdp-thumb": {
                  scrollSnapAlign: "start",
                },
              }}
            >
              {list.map((src, i) => {
                const uRaw = imgUrl(src);
                const u = uRaw ? resizedImg(uRaw, 192) : undefined;
                return (
                  <Box
                    key={i}
                    className="pdp-thumb"
                    component="button"
                    type="button"
                    data-pdp-thumb-idx={i}
                    onClick={() => onSelect(i)}
                    sx={(t) => ({
                      width: { xs: 64, sm: 72 },
                      height: { xs: 64, sm: 72 },
                      p: 0,
                      flexShrink: 0,
                      border:
                        activeIdx === i
                          ? `2px solid ${storefrontBrandMain(t)}`
                          : `1px solid ${t.palette.divider}`,
                      borderRadius: 2,
                      cursor: "pointer",
                      bgcolor: "grey.50",
                      backgroundImage: u ? `url(${u})` : undefined,
                      backgroundSize: "contain",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                      transition: "border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
                      boxShadow: activeIdx === i ? `0 4px 14px ${alpha(storefrontBrandMain(t), 0.25)}` : "none",
                      "&:hover": {
                        borderColor: "brand.main",
                        transform: "scale(1.04)",
                      },
                      "&:focus-visible": { outline: `2px solid ${storefrontBrandMain(t)}`, outlineOffset: 2 },
                    })}
                    aria-label={`${imageAlt} — image ${i + 1} of ${list.length}, select`}
                    aria-current={activeIdx === i ? "true" : undefined}
                  />
                );
              })}
            </Box>
            <IconButton
              type="button"
              size="small"
              onClick={goNextL}
              disabled={!canNextL}
              aria-label="Next product image"
              sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, flexShrink: 0 }}
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Stack>
        )}
      </Stack>

      <ProductImageLightbox
        open={lightbox}
        onClose={() => setLightbox(false)}
        imageUrl={sources[activeIdx]}
        onPrev={goPrevL}
        onNext={goNextL}
        canPrev={canPrevL}
        canNext={canNextL}
        currentLabel={`${imageAlt} — ${activeIdx + 1} / ${list.length}`}
        imageKey={sources[activeIdx] ?? String(activeIdx)}
      />
    </>
  );
}
