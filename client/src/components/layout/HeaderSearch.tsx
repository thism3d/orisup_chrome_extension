import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  InputAdornment,
  TextField,
  IconButton,
  MenuItem,
  Box,
  Paper,
  Stack,
  Typography,
  Chip,
  ClickAwayListener,
} from "@mui/material";
import type { Theme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import type { Category } from "@/lib/types";
import { useStorefrontLayoutTemplate } from "@/contexts/StorefrontUiTemplateContext";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";
import { storefrontBrandMain } from "@/lib/storefrontThemeBrand";
import { usePublicSiteMeta } from "@/contexts/PublicSiteMetaContext";

type Props = {
  categories?: Category[];
  /** Legacy: dark search shell (unused for Norex white header; still used if passed explicitly). */
  variant?: "default" | "darkMobile";
  showCategorySelect?: boolean;
};

function parseKeywords(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(/[\n,]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function HeaderSearch({
  categories = [],
  variant = "default",
  showCategorySelect = true,
}: Props) {
  const layout = useStorefrontLayoutTemplate();
  const { text } = useStorefrontLanguage();
  const meta = usePublicSiteMeta();
  const [, setLoc] = useLocation();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [rotatingIdx, setRotatingIdx] = useState(0);
  const [focusOpen, setFocusOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const darkMobile = variant === "darkMobile";
  const mobileVariant = variant === "darkMobile" || (typeof window !== "undefined" && window.innerWidth < 900);

  const rotatingKeywords = useMemo(
    () => parseKeywords(meta?.storefront_search_rotating_keywords),
    [meta?.storefront_search_rotating_keywords],
  );
  const popularKeywords = useMemo(
    () => parseKeywords(meta?.storefront_search_popular_keywords),
    [meta?.storefront_search_popular_keywords],
  );
  const activeKeyword = rotatingKeywords.length ? rotatingKeywords[rotatingIdx % rotatingKeywords.length] : "";

  useEffect(() => {
    if (!rotatingKeywords.length) return;
    const t = window.setInterval(() => {
      setRotatingIdx((n) => (n + 1) % rotatingKeywords.length);
    }, 3000);
    return () => window.clearInterval(t);
  }, [rotatingKeywords]);

  const go = () => {
    const t = q.trim() || activeKeyword;
    const params = new URLSearchParams();
    if (t) params.set("q", t);
    if (cat) {
      setLoc(`/c/${cat}${params.toString() ? `?${params}` : ""}`);
      return;
    }
    setLoc(`/shop${params.toString() ? `?${params}` : ""}`);
  };

  const showCat = showCategorySelect && categories.length > 0 && !mobileVariant;

  const placeholder =
    layout === "norexbd"
      ? text("Search products…", "পণ্য সার্চ করুন…")
      : layout === "orynbd"
        ? text("Search for any product or brand…", "যেকোনো পণ্য বা ব্র্যান্ড সার্চ…")
        : text("I am searching for…", "আমি সার্চ করছি…");
  const placeholderWithKeyword = activeKeyword ? activeKeyword : placeholder;

  const shellSx = useMemo(() => {
    const base =
      layout === "norexbd"
        ? {
            display: "flex",
            flex: 1,
            maxWidth: 560,
            border: "2px solid",
            borderColor: "divider",
            borderRadius: 1,
            overflow: "hidden",
            bgcolor: "background.paper",
            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            "&:focus-within": {
              borderColor: "brand.main",
              boxShadow: (t: Theme) => `0 0 0 1px ${storefrontBrandMain(t)}`,
            },
          }
        : layout === "orynbd"
          ? {
              display: "flex",
              flex: 1,
              maxWidth: 760,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2.5,
              overflow: "hidden",
              bgcolor: "grey.50",
              boxShadow: "0 8px 28px rgba(11,11,11,0.06)",
              transition: "border-color 0.22s ease, box-shadow 0.22s ease, transform 0.2s ease",
              "&:focus-within": {
                borderColor: "brand.main",
                boxShadow: (t: Theme) => `0 12px 36px rgba(11,11,11,0.1), 0 0 0 2px ${storefrontBrandMain(t)}33`,
                transform: "translateY(-1px)",
              },
            }
          : {
              display: "flex",
              flex: 1,
              maxWidth: 760,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 999,
              overflow: "hidden",
              bgcolor: "#fff",
              transition: "border-color 0.22s ease, box-shadow 0.22s ease, transform 0.2s ease",
              "&:focus-within": {
                borderColor: "brand.main",
                boxShadow: (t: Theme) => `0 0 0 3px ${storefrontBrandMain(t)}40`,
                transform: "translateY(-1px)",
              },
            };

    if (darkMobile && layout === "norexbd") {
      return {
        ...base,
        borderColor: "grey.700",
        bgcolor: "grey.800",
        "&:focus-within": {
          borderColor: "brand.main",
          boxShadow: (t: Theme) => `0 0 0 1px ${storefrontBrandMain(t)}`,
        },
      };
    }
    return base;
  }, [layout, darkMobile]);

  const catFieldSx = useMemo(() => {
    const base =
      layout === "norexbd"
        ? {
            minWidth: { xs: 96, sm: 132 },
            "& .MuiInputBase-input": { py: 1.1, px: 1.25, fontWeight: 700, fontSize: "0.78rem" },
            borderRight: "1px solid",
            borderColor: "divider",
            bgcolor: "grey.100",
          }
        : layout === "orynbd"
          ? {
              minWidth: { xs: 108, sm: 160 },
              "& .MuiInputBase-input": { py: 1.5, px: 2, fontWeight: 800, fontSize: "0.85rem" },
              borderRight: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }
          : {
              minWidth: { xs: 100, sm: 148 },
              "& .MuiInputBase-input": { py: 1.35, px: 1.75, fontWeight: 700, fontSize: "0.8rem" },
              borderRight: "1px solid",
              borderColor: "divider",
              bgcolor: "grey.50",
            };

    if (darkMobile && layout === "norexbd") {
      return {
        minWidth: { xs: 96, sm: 132 },
        "& .MuiInputBase-input": { py: 1.1, px: 1.25, fontWeight: 700, fontSize: "0.78rem", color: "#fff" },
        borderRight: "1px solid",
        borderColor: "grey.700",
        bgcolor: "grey.900",
        "& .MuiSelect-icon": { color: "grey.400" },
      };
    }
    return base;
  }, [layout, darkMobile]);

  const inputPy = layout === "orynbd" ? 1.6 : layout === "norexbd" ? 1.1 : 1.35;

  const inputExtraSx =
    darkMobile && layout === "norexbd"
      ? {
          "& .MuiInputBase-input": {
            py: inputPy,
            px: 1.75,
            color: "#fff",
            "&::placeholder": { color: "grey.500", opacity: 1 },
          },
        }
      : { "& .MuiInputBase-input": { py: inputPy, px: layout === "orynbd" ? 2 : 1.75 } };

  const quickKeywords = popularKeywords.length ? popularKeywords : rotatingKeywords;

  return (
    <ClickAwayListener onClickAway={() => setFocusOpen(false)}>
      <Box ref={wrapRef} sx={{ position: "relative" }}>
        <Box sx={shellSx}>
      {showCat && (
        <TextField
          select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          variant="standard"
          InputProps={{ disableUnderline: true }}
          SelectProps={{
            displayEmpty: true,
            inputProps: { "aria-label": text("Category filter", "ক্যাটাগরি ফিল্টার") },
            renderValue: (selected) => {
              if (selected === "") return text("All", "সব");
              return categories.find((c) => c.slug === selected)?.name ?? String(selected);
            },
          }}
          sx={catFieldSx}
        >
          <MenuItem value="">{text("All", "সব")}</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c.id} value={c.slug}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
      )}
      <TextField
        fullWidth
        placeholder={placeholderWithKeyword}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocusOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && go()}
        variant="standard"
        InputProps={{
          disableUnderline: true,
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={go}
                edge="end"
                color="primary"
                aria-label="Search"
                sx={{
                  mr: layout === "orynbd" ? 0.5 : 0.35,
                  bgcolor: "brand.main",
                  color: "brand.contrastText",
                  borderRadius: layout === "norexbd" ? 0.5 : layout === "orynbd" ? 2 : 999,
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  "&:hover": { bgcolor: "brand.dark", transform: "scale(1.05)" },
                }}
              >
                <SearchIcon fontSize={layout === "orynbd" ? "medium" : "small"} />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={inputExtraSx}
      />
        </Box>
        {focusOpen && quickKeywords.length > 0 ? (
          <Paper
            variant="outlined"
            sx={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              right: 0,
              zIndex: (t) => t.zIndex.modal - 1,
              borderRadius: 2,
              p: 1.25,
            }}
          >
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                Popular Right Now
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {quickKeywords.slice(0, 18).map((kw) => (
                  <Chip
                    key={kw}
                    label={kw}
                    size="small"
                    onClick={() => {
                      setQ(kw);
                      setFocusOpen(false);
                      setLoc(`/shop?q=${encodeURIComponent(kw)}`);
                    }}
                    sx={{ cursor: "pointer" }}
                  />
                ))}
              </Stack>
            </Stack>
          </Paper>
        ) : null}
      </Box>
    </ClickAwayListener>
  );
}
