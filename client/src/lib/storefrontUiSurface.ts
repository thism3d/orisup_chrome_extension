import type { SystemStyleObject } from "@mui/system";
import type { SxProps, Theme } from "@mui/material/styles";
import { alpha, lighten } from "@mui/material/styles";
import { isMinimalEditorialTemplate, type StorefrontUiTemplateId } from "@/lib/storefrontUiTemplate";
import { storefrontBrandMain } from "@/lib/storefrontThemeBrand";

/** Centered “message” cards (404, order confirmed, empty states). */
export function storefrontMessagePaperSx(template: StorefrontUiTemplateId): SxProps<Theme> {
  const base: SxProps<Theme> = {
    p: { xs: 3, sm: 5 },
    textAlign: "center",
  };
  if (isMinimalEditorialTemplate(template)) {
    return {
      ...base,
      borderRadius: 2,
      border: "1px solid",
      borderColor: "divider",
      boxShadow: "none",
      bgcolor: "background.paper",
    };
  }
  if (template === "orynbd") {
    return {
      ...base,
      borderRadius: 4,
      border: "1px solid",
      borderColor: "divider",
      boxShadow: "0 28px 72px rgba(11,11,11,0.12)",
      background: (t: Theme) =>
        `linear-gradient(165deg, ${lighten(storefrontBrandMain(t), 0.94)} 0%, ${t.palette.background.paper} 50%)`,
    };
  }
  return {
    ...base,
    borderRadius: 3,
    border: "1px solid",
    borderColor: "divider",
    boxShadow: "0 24px 64px rgba(11,11,11,0.08)",
  };
}

/** Vendor storefront hero strip. */
export function storefrontVendorHeroPaperSx(template: StorefrontUiTemplateId): SxProps<Theme> {
  const common: SxProps<Theme> = {
    p: { xs: 2, sm: 3 },
    mb: 3,
    border: "1px solid",
    borderColor: "divider",
  };
  if (isMinimalEditorialTemplate(template)) {
    return {
      ...common,
      borderRadius: 2,
      boxShadow: "none",
      bgcolor: (t: Theme) => lighten(storefrontBrandMain(t), 0.94),
    };
  }
  if (template === "orynbd") {
    return {
      ...common,
      borderRadius: 4,
      boxShadow: "0 20px 56px rgba(11,11,11,0.1)",
      background: (t: Theme) =>
        `linear-gradient(125deg, ${alpha(storefrontBrandMain(t), 0.1)} 0%, ${t.palette.background.paper} 55%)`,
    };
  }
  return {
    ...common,
    borderRadius: 3,
    boxShadow: "0 16px 44px rgba(11,11,11,0.06)",
    background: (t: Theme) =>
      `linear-gradient(135deg, ${alpha(storefrontBrandMain(t), 0.14)} 0%, ${t.palette.background.paper} 48%, ${alpha(storefrontBrandMain(t), 0.08)} 100%)`,
  };
}

/** Tables / tracking panels on account pages. */
export function storefrontDataPaperSx(template: StorefrontUiTemplateId): SxProps<Theme> {
  if (isMinimalEditorialTemplate(template)) {
    return {
      p: 2,
      borderRadius: 2,
      border: "1px solid",
      borderColor: "divider",
      boxShadow: "none",
    };
  }
  if (template === "orynbd") {
    return {
      p: 2.5,
      borderRadius: 3,
      border: "1px solid",
      borderColor: "divider",
      boxShadow: "0 12px 40px rgba(11,11,11,0.08)",
    };
  }
  return {
    p: 2.5,
    borderRadius: 2,
    border: "1px solid",
    borderColor: "divider",
    boxShadow: "0 8px 28px rgba(11,11,11,0.06)",
  };
}

export function storefrontAccountContainerMaxWidth(template: StorefrontUiTemplateId): "sm" | "md" {
  if (isMinimalEditorialTemplate(template)) return "sm";
  if (template === "orynbd") return "md";
  return "md";
}

/** Top promo strip above the header — distinct per layout template. */
export function storefrontAnnouncementBarSx(template: StorefrontUiTemplateId): SxProps<Theme> {
  if (template === "norexbd") {
    return {
      bgcolor: "#FAFAFA",
      color: "text.primary",
      py: { xs: 0.35, sm: 0.55 },
      fontSize: { xs: "0.68rem", sm: "0.78rem" },
      borderBottom: "1px solid",
      borderColor: "divider",
    };
  }
  if (isMinimalEditorialTemplate(template)) {
    return {
      bgcolor: "secondary.main",
      color: "secondary.contrastText",
      py: { xs: 0.35, sm: 0.55 },
      fontSize: { xs: "0.68rem", sm: "0.78rem" },
      borderBottom: "1px solid",
      borderColor: "divider",
    };
  }
  if (template === "orynbd") {
    return {
      bgcolor: "brand.main",
      color: "brand.contrastText",
      py: { xs: 0.65, sm: 0.95 },
      fontSize: { xs: "0.72rem", sm: "0.85rem" },
      borderBottom: "2px solid",
      borderColor: "brand.dark",
    };
  }
  return {
    bgcolor: "brand.main",
    color: "brand.contrastText",
    py: { xs: 0.5, sm: 0.85 },
    fontSize: { xs: "0.7rem", sm: "0.8125rem" },
    borderBottom: "1px solid rgba(11,11,11,0.08)",
  };
}

export function storefrontTableHeadRowSx(template: StorefrontUiTemplateId): SxProps<Theme> {
  return (t: Theme) => ({
    bgcolor: alpha(storefrontBrandMain(t), isMinimalEditorialTemplate(template) ? 0.06 : template === "orynbd" ? 0.12 : 0.1),
  });
}

/** `TableContainer` / table wrappers — border and shadow without inner padding. */
export function storefrontTableContainerSx(template: StorefrontUiTemplateId): SxProps<Theme> {
  if (isMinimalEditorialTemplate(template)) {
    return {
      borderRadius: 2,
      border: "1px solid",
      borderColor: "divider",
      boxShadow: "none",
      overflow: "hidden",
    };
  }
  if (template === "orynbd") {
    return {
      borderRadius: 3,
      border: "1px solid",
      borderColor: "divider",
      boxShadow: "0 12px 40px rgba(11,11,11,0.08)",
      overflow: "hidden",
    };
  }
  return {
    borderRadius: 2,
    border: "1px solid",
    borderColor: "divider",
    boxShadow: "0 12px 36px rgba(11,11,11,0.05)",
    overflow: "hidden",
  };
}

/** Extra sx merged onto MUI `Fab` (fixed positioning stays in the component). */
export function storefrontScrollToTopFabSx(template: StorefrontUiTemplateId): SxProps<Theme> {
  if (isMinimalEditorialTemplate(template)) {
    return {
      borderRadius: 2,
      fontWeight: 800,
      boxShadow: "0 4px 16px rgba(11,11,11,0.14)",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      "&:hover": {
        transform: "translateY(-2px)",
        boxShadow: "0 8px 22px rgba(11,11,11,0.18)",
      },
      "&:active": { transform: "translateY(-1px)" },
    };
  }
  if (template === "orynbd") {
    return (t: Theme) => ({
      borderRadius: 3,
      fontWeight: 800,
      boxShadow: `0 12px 36px ${alpha(t.palette.common.black, 0.22)}`,
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      "&:hover": {
        transform: "translateY(-3px)",
        boxShadow: `0 16px 44px ${alpha(storefrontBrandMain(t), 0.35)}`,
      },
      "&:active": { transform: "translateY(-1px)" },
    });
  }
  return (t: Theme) => ({
    fontWeight: 800,
    boxShadow: `0 10px 32px rgba(11,11,11,0.2), 0 0 0 1px ${alpha(storefrontBrandMain(t), 0.35)}`,
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    "&:hover": {
      transform: "translateY(-3px)",
      boxShadow: "0 14px 40px rgba(11,11,11,0.24)",
    },
    "&:active": { transform: "translateY(-1px)" },
  });
}

/** Vertical padding for the mobile category chips row. */
export function storefrontHomeMobileChipsPadding(template: StorefrontUiTemplateId): { py: number; pb: number } {
  if (isMinimalEditorialTemplate(template)) return { py: 1.25, pb: 1.5 };
  if (template === "orynbd") return { py: 1.75, pb: 2.25 };
  return { py: 1.5, pb: 2 };
}

/** Wrapper `Stack` for home mobile category chips. */
export function storefrontHomeMobileChipsStackSx(template: StorefrontUiTemplateId): SxProps<Theme> {
  const pad = storefrontHomeMobileChipsPadding(template);
  return {
    display: { xs: "flex", md: "none" },
    overflowX: "auto",
    py: pad.py,
    pb: pad.pb,
    px: 0,
    mx: { xs: 0, sm: 0 },
    mb: 0.5,
    scrollbarWidth: "none",
    "&::-webkit-scrollbar": { display: "none" },
    borderBottom: "1px solid",
    borderColor: "divider",
    boxShadow: (t) =>
      `inset 0 -8px 12px -12px ${t.palette.mode === "light" ? "rgba(11,11,11,0.06)" : "rgba(0,0,0,0.2)"}`,
  };
}

export function storefrontHomeMobileChipsSpacing(template: StorefrontUiTemplateId): number {
  if (isMinimalEditorialTemplate(template)) return 0.75;
  if (template === "orynbd") return 1.25;
  return 1;
}

/** Per-template chip styles for category pills on mobile home. */
export function storefrontCategoryChipSx(template: StorefrontUiTemplateId): (t: Theme) => SystemStyleObject<Theme> {
  if (isMinimalEditorialTemplate(template)) {
    return (t) => ({
      height: 30,
      fontSize: "0.8125rem",
      bgcolor: alpha(storefrontBrandMain(t), 0.1),
      color: "text.primary",
      fontWeight: 700,
      border: "1px solid",
      borderColor: alpha(storefrontBrandMain(t), 0.4),
      cursor: "pointer",
      borderRadius: 1,
      transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
      "&:hover": {
        bgcolor: alpha(storefrontBrandMain(t), 0.18),
        transform: "scale(1.02)",
        boxShadow: `0 4px 14px ${alpha(storefrontBrandMain(t), 0.2)}`,
      },
      "&:active": { transform: "scale(0.98)" },
    });
  }
  if (template === "orynbd") {
    return (t) => ({
      height: 34,
      fontSize: "0.875rem",
      bgcolor: "background.paper",
      color: "text.primary",
      fontWeight: 800,
      border: "2px solid",
      borderColor: alpha(storefrontBrandMain(t), 0.65),
      cursor: "pointer",
      borderRadius: 999,
      transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
      "&:hover": {
        bgcolor: alpha(storefrontBrandMain(t), 0.12),
        transform: "scale(1.04)",
        boxShadow: `0 8px 22px ${alpha(storefrontBrandMain(t), 0.22)}`,
      },
      "&:active": { transform: "scale(0.98)" },
    });
  }
  return (t) => ({
    bgcolor: alpha(storefrontBrandMain(t), 0.14),
    color: "text.primary",
    fontWeight: 700,
    border: "1px solid",
    borderColor: alpha(storefrontBrandMain(t), 0.55),
    cursor: "pointer",
    transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
    "&:hover": {
      bgcolor: alpha(storefrontBrandMain(t), 0.24),
      transform: "scale(1.04)",
      boxShadow: `0 6px 18px ${alpha(storefrontBrandMain(t), 0.25)}`,
    },
    "&:active": { transform: "scale(0.98)" },
  });
}

/** Primary page title variant (shop, cart, checkout, wishlist, static articles). */
export function storefrontRetailTitleVariant(template: StorefrontUiTemplateId): "h3" | "h4" | "h5" {
  if (template === "orynbd") return "h3";
  if (isMinimalEditorialTemplate(template)) return "h4";
  return "h4";
}

export function storefrontRetailTitleSx(template: StorefrontUiTemplateId): SxProps<Theme> {
  if (template === "orynbd") return { fontWeight: 800, letterSpacing: "-0.03em" };
  if (isMinimalEditorialTemplate(template)) return { fontWeight: 800, letterSpacing: "-0.02em" };
  return { fontWeight: 800, letterSpacing: -0.5 };
}

/**
 * Top toolbar strip on shop category / search (and PDP breadcrumbs) —
 * flatter for Norexbd & Orynbd, decorative gradient for Orlenbd.
 */
export function storefrontListingToolbarPaperSx(template: StorefrontUiTemplateId): SxProps<Theme> {
  const flat = isMinimalEditorialTemplate(template) || template === "orynbd";
  return (t: Theme) => ({
    p: { xs: flat ? 1.75 : 2, sm: flat ? 2 : 2.5 },
    mb: 2.5,
    borderRadius: flat ? 2 : 2.5,
    border: "1px solid",
    borderColor: "divider",
    bgcolor: flat ? "background.paper" : lighten(storefrontBrandMain(t), 0.965),
    backgroundImage: flat
      ? "none"
      : `linear-gradient(135deg, ${lighten(storefrontBrandMain(t), 0.96)} 0%, ${t.palette.background.paper} 52%, ${alpha(storefrontBrandMain(t), 0.1)} 100%)`,
    boxShadow: flat
      ? template === "orynbd"
        ? "0 4px 20px rgba(15,23,42,0.06)"
        : "none"
      : "0 12px 40px rgba(11,11,11,0.05)",
  });
}

/** Cards / panels: border + radius + shadow only (padding stays in CardContent). */
export function storefrontPanelChromeSx(template: StorefrontUiTemplateId): SxProps<Theme> {
  if (isMinimalEditorialTemplate(template)) {
    return {
      borderRadius: 2,
      border: "1px solid",
      borderColor: "divider",
      boxShadow: "none",
      bgcolor: "background.paper",
    };
  }
  if (template === "orynbd") {
    return {
      borderRadius: 3,
      border: "1px solid",
      borderColor: "divider",
      boxShadow: "0 12px 40px rgba(11,11,11,0.08)",
      bgcolor: "background.paper",
    };
  }
  return {
    borderRadius: 2,
    border: "1px solid",
    borderColor: "divider",
    boxShadow: "0 8px 28px rgba(11,11,11,0.06)",
    bgcolor: "background.paper",
  };
}

/** Shop filters strip — matches listing toolbar flat vs elevated pattern. */
export function storefrontFiltersBarPaperSx(template: StorefrontUiTemplateId): SxProps<Theme> {
  const flat = isMinimalEditorialTemplate(template) || template === "orynbd";
  return (t: Theme) => ({
    p: flat ? 2 : 2.25,
    mb: 2.5,
    borderRadius: flat ? 2 : 2.5,
    border: "1px solid",
    borderColor: "divider",
    bgcolor: alpha(storefrontBrandMain(t), flat ? (isMinimalEditorialTemplate(template) ? 0.04 : 0.06) : 0.07),
    boxShadow: flat
      ? template === "orynbd"
        ? "0 4px 18px rgba(15,23,42,0.05)"
        : "none"
      : "0 8px 28px rgba(11,11,11,0.04)",
    transition: "box-shadow 0.25s ease, border-color 0.25s ease",
    "&:focus-within": {
      borderColor: alpha(storefrontBrandMain(t), flat ? 0.35 : 0.45),
      boxShadow: flat
        ? template === "orynbd"
          ? `0 8px 24px rgba(15,23,42,0.08), 0 0 0 1px ${alpha(storefrontBrandMain(t), 0.15)}`
          : `0 0 0 1px ${alpha(storefrontBrandMain(t), 0.2)}`
        : `0 12px 36px rgba(11,11,11,0.06), 0 0 0 1px ${alpha(storefrontBrandMain(t), 0.2)}`,
    },
  });
}

/** Dashed empty-catalog / demo hint — template-aware radius and shadow. */
export function storefrontCatalogEmptyHintPaperSx(
  template: StorefrontUiTemplateId,
  opts: { isError?: boolean }
): SxProps<Theme> {
  const { isError } = opts;
  const flat = isMinimalEditorialTemplate(template) || template === "orynbd";
  return (t: Theme) => ({
    p: 3,
    borderRadius: flat ? 2 : 3,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: isError ? "error.light" : "divider",
    bgcolor: isError
      ? alpha(t.palette.error.main, 0.08)
      : lighten(storefrontBrandMain(t), flat && template === "orynbd" ? 0.93 : 0.94),
    textAlign: "center",
    boxShadow: flat
      ? template === "orynbd"
        ? "0 4px 20px rgba(15,23,42,0.04)"
        : "none"
      : "0 8px 24px rgba(11,11,11,0.04)",
  });
}

/** Vertical accent bar beside home / rail section titles. */
export function storefrontSectionHeadingAccentSx(template: StorefrontUiTemplateId): SxProps<Theme> {
  if (isMinimalEditorialTemplate(template)) {
    return {
      width: 2,
      borderRadius: 0.5,
      bgcolor: "brand.main",
      flexShrink: 0,
      mt: 0.35,
      boxShadow: "none",
    };
  }
  if (template === "orynbd") {
    return (t: Theme) => ({
      width: 5,
      borderRadius: 2.5,
      bgcolor: "brand.main",
      flexShrink: 0,
      mt: 0.35,
      boxShadow: `0 3px 14px ${alpha(storefrontBrandMain(t), 0.4)}`,
    });
  }
  return (t: Theme) => ({
    width: 4,
    borderRadius: 2,
    bgcolor: "brand.main",
    flexShrink: 0,
    mt: 0.35,
    boxShadow: `0 0 12px ${t.palette.brand.light}`,
  });
}

export function storefrontSectionHeadingTitleSx(template: StorefrontUiTemplateId): SxProps<Theme> {
  if (template === "orynbd") return { fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.2 };
  if (isMinimalEditorialTemplate(template)) return { fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2 };
  return { fontWeight: 800, letterSpacing: -0.4, lineHeight: 1.2 };
}

/** Product cards — different radius, shadow, and hover motion per layout template. */
export function storefrontProductCardSx(template: StorefrontUiTemplateId): SxProps<Theme> {
  const transition =
    "transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.28s ease, border-color 0.28s ease";
  if (isMinimalEditorialTemplate(template)) {
    return {
      borderRadius: 1,
      border: "1px solid",
      borderColor: "divider",
      boxShadow: "none",
      transition,
      "&:hover": {
        transform: "translateY(-3px)",
        boxShadow: (t) => `0 10px 28px ${alpha(t.palette.common.black, 0.1)}`,
        borderColor: "primary.main",
      },
      "&:hover .ob-product-img": { transform: "scale(1.04)" },
    };
  }
  if (template === "orynbd") {
    return {
      borderRadius: 3,
      border: "1px solid",
      borderColor: "divider",
      boxShadow: { xs: "0 8px 22px rgba(15,23,42,0.08)", sm: "0 6px 18px rgba(15,23,42,0.07)" },
      transition,
      "&:hover": {
        transform: "translateY(-6px)",
        boxShadow: (t) => `0 22px 48px ${alpha(storefrontBrandMain(t), 0.22)}`,
        borderColor: "primary.main",
      },
      "&:hover .ob-product-img": { transform: "scale(1.05)" },
    };
  }
  return {
    borderRadius: 2,
    border: "1px solid",
    borderColor: "divider",
    boxShadow: { xs: "0 6px 20px rgba(11,11,11,0.07)", sm: "none" },
    transition,
    "&:hover": {
      transform: "translateY(-8px)",
      boxShadow: (t) => `0 20px 48px rgba(11,11,11,0.11), 0 0 0 1px ${alpha(storefrontBrandMain(t), 0.2)}`,
      borderColor: "primary.main",
    },
    "&:hover .ob-product-img": { transform: "scale(1.06)" },
  };
}

/** Desktop checkout/cart sidebar `position: sticky` top offset — clears sticky header + mega nav. */
export const STOREFRONT_STICKY_HEADER_OFFSET_DESKTOP = "152px";
