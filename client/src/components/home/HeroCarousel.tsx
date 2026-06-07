import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import { Link } from "wouter";
import { useMemo } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade, Navigation, Pagination } from "swiper/modules";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import type { Banner } from "@/lib/types";
import { DEFAULT_HERO_SLIDES } from "@/lib/defaultHeroSlides";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";
import { storefrontBrandMain } from "@/lib/storefrontThemeBrand";
import { responsiveImg } from "@/lib/responsiveImg";

import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/pagination";

const HERO_IMG_WIDTHS = [384, 512, 640, 768, 1024, 1280, 1600];
const HERO_IMG_SIZES = "100vw";

type Slide = {
  title: string;
  subtitle: string;
  image: string;
  href: string;
  cta: string;
  showTitle: boolean;
  showSubtitle: boolean;
  showButton: boolean;
  showShadow: boolean;
};

type Props = {
  banners: Banner[];
  autoMs?: number;
  /** Taller, full-bleed-style hero on the classic home (Daraz / retail reference). */
  variant?: "default" | "showcase";
};

const heightsDefault = { xs: 300, sm: 340, md: 420 };
const heightsShowcase = { xs: 320, sm: 400, md: 520 };

export function HeroCarousel({ banners, autoMs = 6500, variant = "default" }: Props) {
  const { text } = useStorefrontLanguage();
  const showcase = variant === "showcase";
  /** Showcase: natural banner aspect ratio (width 100%, height auto); default keeps fixed crop. */
  const intrinsic = showcase;
  const slideMinHeight = showcase ? heightsShowcase : heightsDefault;
  const slides: Slide[] = useMemo(() => {
    if (banners.length > 0) {
      return banners.map((b) => ({
        title: b.title,
        subtitle: b.subtitle ?? "",
        image: b.imageUrl,
        href: b.linkUrl ?? "/shop",
        cta: b.ctaLabel?.trim() || "Shop now",
        showTitle: b.showTitle !== false,
        showSubtitle: b.showSubtitle !== false,
        showButton: b.showButton !== false,
        showShadow: b.showShadow !== false,
      }));
    }
    return DEFAULT_HERO_SLIDES.map((s) => ({
      title: s.title,
      subtitle: s.subtitle,
      image: s.image,
      href: s.ctaHref,
      cta: s.ctaLabel,
      showTitle: true,
      showSubtitle: true,
      showButton: true,
      showShadow: true,
    }));
  }, [banners]);
  const ctaLabel = (cta: string) => (cta === "Shop now" ? text("Shop now", "কিনতে যান") : cta);

  if (slides.length === 0) return null;

  const heroShadowEnabled = slides[0]?.showShadow !== false;
  return (
    <Box
      className="ob-hero-swiper"
      sx={(t) => ({
        position: "relative",
        borderRadius: showcase ? { xs: 0, sm: 0, md: 0 } : { xs: 0, md: 0 },
        overflow: "hidden",
        bgcolor: "#0B0B0B",
        outline: "none",
        border: "none",
        WebkitTapHighlightColor: "transparent",
        ...(intrinsic
          ? {
              width: { xs: "100vw", md: "100%" },
              maxWidth: { xs: "100vw", md: "none" },
              alignSelf: "stretch",
              ml: { xs: "calc(50% - 50vw)", md: 0 },
              mr: { xs: "calc(50% - 50vw)", md: 0 },
            }
          : {}),
        // Soft shadow only — no 1px ring (reads as a grey border on mobile/desktop).
        boxShadow: heroShadowEnabled
          ? showcase
            ? {
                xs: "0 8px 40px rgba(11,11,11,0.12)",
                md: "0 20px 50px rgba(11,11,11,0.2)",
              }
            : {
                xs: "0 18px 50px rgba(11,11,11,0.18)",
                md: "0 24px 64px rgba(11,11,11,0.16)",
              }
          : "none",
        "& .swiper": { borderRadius: "inherit", outline: "none", border: "none" },
        "& .swiper-wrapper": { outline: "none" },
        "& .swiper-pagination": {
          bottom: { xs: "10px !important", md: "18px !important" },
          left: "0 !important",
          right: "0 !important",
          width: "100% !important",
          display: "flex !important",
          justifyContent: "center !important",
          alignItems: "center !important",
          gap: "6px",
        },
        "& .swiper-pagination-bullets-dynamic": {
          left: "50% !important",
          transform: "translateX(-50%) !important",
        },
        "& .swiper-pagination-bullet": {
          margin: "0 !important",
          bgcolor: "rgba(255,255,255,0.45) !important",
          opacity: "1 !important",
          width: "8px !important",
          height: "8px !important",
          transition: "width 0.25s ease, background 0.25s ease !important",
          outline: "none !important",
          "&:focus, &:focus-visible": { outline: "none !important", boxShadow: "none !important" },
        },
        "& .swiper-pagination-bullet-active": {
          bgcolor: `${storefrontBrandMain(t)} !important`,
          width: "28px !important",
          borderRadius: "8px !important",
        },
        "& .ob-hero-nav": {
          position: "absolute",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 3,
          width: { xs: 24, md: 28 },
          height: { xs: 24, md: 28 },
          minWidth: 0,
          bgcolor: "rgba(255,255,255,0.88)",
          color: "text.primary",
          border: "none",
          outline: "none",
          boxShadow: "0 4px 18px rgba(0,0,0,0.16)",
          "&:hover": {
            bgcolor: "#fff",
          },
          "&:focus-visible": {
            outline: "none",
            boxShadow: "0 4px 18px rgba(0,0,0,0.16)",
          },
          "&.swiper-button-disabled": {
            opacity: 0.35,
          },
        },
        "& .ob-hero-nav-prev": {
          left: { xs: 6, md: 8 },
        },
        "& .ob-hero-nav-next": {
          right: { xs: 6, md: 8 },
        },
      })}
    >
      <IconButton className="ob-hero-nav ob-hero-nav-prev" aria-label="Previous slide">
        <ChevronLeftRoundedIcon sx={{ fontSize: { xs: 16, md: 18 } }} />
      </IconButton>
      <IconButton className="ob-hero-nav ob-hero-nav-next" aria-label="Next slide">
        <ChevronRightRoundedIcon sx={{ fontSize: { xs: 16, md: 18 } }} />
      </IconButton>
      <Swiper
        modules={[Autoplay, EffectFade, Navigation, Pagination]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        speed={800}
        loop={slides.length > 1}
        autoHeight={intrinsic}
        autoplay={
          slides.length > 1 ? { delay: autoMs, disableOnInteraction: false, pauseOnMouseEnter: true } : false
        }
        pagination={{ clickable: true, dynamicBullets: slides.length > 1 && slides.length <= 7 }}
        navigation={{
          prevEl: ".ob-hero-nav-prev",
          nextEl: ".ob-hero-nav-next",
        }}
        style={intrinsic ? { height: "auto" } : { minHeight: 300 }}
      >
        {slides.map((s, idx) => {
          const heroImg = responsiveImg(s.image, HERO_IMG_WIDTHS);
          const isFirstSlide = idx === 0;
          return (
          <SwiperSlide key={`${s.title}-${idx}`} style={intrinsic ? { height: "auto" } : { minHeight: "inherit" }}>
            <Box
              component={Link}
              href={s.href}
              aria-label={s.title || "Hero promotion"}
              sx={{
                textDecoration: "none",
                color: "inherit",
                display: "block",
                position: "relative",
                ...(intrinsic
                  ? { minHeight: 0, height: "auto" }
                  : { minHeight: slideMinHeight }),
                overflow: "hidden",
                outline: "none",
                "&:focus-visible": {
                  outline: "none",
                },
              }}
            >
              <Box
                component="img"
                src={heroImg.src || s.image}
                srcSet={heroImg.srcSet}
                sizes={heroImg.srcSet ? HERO_IMG_SIZES : undefined}
                alt=""
                aria-hidden="true"
                {...(intrinsic ? {} : { width: 1600, height: 520 })}
                loading={isFirstSlide ? "eager" : "lazy"}
                decoding={isFirstSlide ? "sync" : "async"}
                fetchPriority={isFirstSlide ? "high" : "low"}
                sx={
                  intrinsic
                    ? {
                        position: "relative",
                        display: "block",
                        width: "100%",
                        height: "auto",
                        maxWidth: "100%",
                        verticalAlign: "bottom",
                        pointerEvents: "none",
                      }
                    : {
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center",
                        transform: "scale(1.05)",
                        pointerEvents: "none",
                      }
                }
              />
              {s.showShadow && !intrinsic ? (
                <Box
                  aria-hidden
                  sx={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(105deg, rgba(11,11,11,0.88) 22%, rgba(11,11,11,0.35) 48%, rgba(11,11,11,0.1) 72%, transparent 100%)",
                    pointerEvents: "none",
                  }}
                />
              ) : null}
              <Stack
                sx={{
                  ...(intrinsic
                    ? {
                        position: "absolute",
                        inset: 0,
                        justifyContent: "center",
                        ...(s.showShadow
                          ? {
                              background:
                                "linear-gradient(105deg, rgba(11,11,11,0.82) 0%, rgba(11,11,11,0.35) 42%, transparent 100%)",
                            }
                          : {}),
                      }
                    : {
                        position: "relative",
                        minHeight: slideMinHeight,
                        justifyContent: "center",
                      }),
                  zIndex: 1,
                  p: { xs: 2.5, sm: 3, md: showcase ? 5 : 5 },
                  maxWidth: 560,
                }}
                spacing={{ xs: 1.5, sm: 2 }}
              >
                {s.showTitle ? (
                  <Typography
                    variant="h3"
                    sx={{
                      color: "#fff",
                      fontWeight: 900,
                      fontSize: showcase
                        ? { xs: "1.55rem", sm: "1.95rem", md: "2.9rem" }
                        : { xs: "1.45rem", sm: "1.85rem", md: "2.75rem" },
                      lineHeight: 1.12,
                      textShadow: s.showShadow ? "0 2px 28px rgba(0,0,0,0.55)" : "none",
                    }}
                  >
                    {s.title}
                  </Typography>
                ) : null}
                {s.showSubtitle && s.subtitle ? (
                  <Typography
                    sx={{
                      color: "rgba(255,255,255,0.92)",
                      fontSize: { xs: "0.9rem", sm: "1.02rem", md: "1.06rem" },
                      lineHeight: 1.55,
                    }}
                  >
                    {s.subtitle}
                  </Typography>
                ) : null}
                {s.showButton ? (
                  <Box
                    display="inline-flex"
                    alignSelf="flex-start"
                    component="span"
                    sx={{ pointerEvents: "none" }}
                  >
                    <Button
                      component="span"
                      tabIndex={-1}
                      variant="contained"
                      color="primary"
                      size="large"
                      sx={{
                        fontWeight: 800,
                        px: { xs: 2.5, sm: 3 },
                        py: { xs: 1, sm: 1.15 },
                        borderRadius: 2.5,
                        fontSize: { xs: "0.9rem", sm: "1rem" },
                        boxShadow: s.showShadow ? "0 8px 24px rgba(212,232,0,0.35)" : "none",
                        pointerEvents: "none",
                      }}
                    >
                      {ctaLabel(s.cta)}
                    </Button>
                  </Box>
                ) : null}
              </Stack>
            </Box>
          </SwiperSlide>
        );
        })}
      </Swiper>
    </Box>
  );
}
