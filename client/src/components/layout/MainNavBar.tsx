import {
  Avatar,
  Box,
  Button,
  Chip,
  ClickAwayListener,
  Divider,
  Fade,
  Paper,
  Popper,
  Stack,
  Typography,
} from "@mui/material";
import { Link, useLocation } from "wouter";
import { useMemo, useRef, useState } from "react";
import type { Category, CategoryNode } from "@/lib/types";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import MenuIcon from "@mui/icons-material/Menu";
import { CategoryNavIcon } from "@/lib/categoryIcons";
import { mediaAbsoluteUrl } from "@/lib/site";
import { useStorefrontLayoutTemplate } from "@/contexts/StorefrontUiTemplateContext";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";
import type { StorefrontUiTemplateId } from "@/lib/storefrontUiTemplate";
import { useCategoryTree } from "@/hooks/useCategoryTree";

type Props = { categories: Category[] };

const navBtnOrlenbdSx = {
  fontWeight: 600,
  borderRadius: 2,
  transition: "background 0.2s ease, color 0.2s ease, transform 0.18s ease",
  "&:hover": { bgcolor: "action.hover", transform: "translateY(-1px)" },
} as const;

function CategoryAvatar({ node, size = 28 }: { node: CategoryNode; size?: number }) {
  const src = node.imageUrl ? mediaAbsoluteUrl(node.imageUrl) ?? node.imageUrl : null;
  if (src) {
    return (
      <Avatar
        src={src}
        variant="rounded"
        sx={{ width: size, height: size, bgcolor: "transparent" }}
      />
    );
  }
  return (
    <Box sx={{ width: size, height: size, display: "grid", placeItems: "center", color: "text.secondary" }}>
      <CategoryNavIcon category={node as Category} fontSize={Math.round(size * 0.78)} />
    </Box>
  );
}

function MegaMenuRow({
  node,
  active,
  onHover,
  onNavigate,
  hasChildren,
  size,
}: {
  node: CategoryNode;
  active: boolean;
  onHover: () => void;
  onNavigate: () => void;
  hasChildren: boolean;
  size: "md" | "sm";
}) {
  const fontSize = size === "md" ? "0.95rem" : "0.875rem";
  return (
    <Stack
      component={Link}
      href={`/c/${node.slug}`}
      onMouseEnter={onHover}
      onFocus={onHover}
      onClick={onNavigate}
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{
        px: 1.25,
        py: 0.85,
        borderRadius: 1.25,
        textDecoration: "none",
        color: active ? "primary.main" : "text.primary",
        bgcolor: active ? "action.hover" : "transparent",
        fontWeight: active ? 800 : 600,
        cursor: "pointer",
        transition: "background 0.12s ease, color 0.12s ease",
        "&:hover": { bgcolor: "action.hover", color: "primary.main" },
      }}
    >
      <CategoryAvatar node={node} size={size === "md" ? 32 : 26} />
      <Typography sx={{ flex: 1, fontSize, fontWeight: "inherit" }} noWrap>
        {node.name}
      </Typography>
      {hasChildren ? <KeyboardArrowRightRoundedIcon fontSize="small" sx={{ color: "text.disabled" }} /> : null}
    </Stack>
  );
}

function CategoryDropdown({ template }: { template: StorefrontUiTemplateId }) {
  const treeQ = useCategoryTree();
  const tree = useMemo<CategoryNode[]>(() => treeQ.data ?? [], [treeQ.data]);
  const [, setLocation] = useLocation();

  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const [activeRootId, setActiveRootId] = useState<string | null>(null);
  const [activeSubId, setActiveSubId] = useState<string | null>(null);
  const { text } = useStorefrontLanguage();

  const activeRoot = useMemo(() => tree.find((r) => r.id === activeRootId) ?? tree[0] ?? null, [tree, activeRootId]);
  const subs = activeRoot?.children ?? [];
  const activeSub = useMemo(() => subs.find((s) => s.id === activeSubId) ?? subs[0] ?? null, [subs, activeSubId]);
  const subSubs = activeSub?.children ?? [];

  const closeAndGo = (slug?: string) => {
    setOpen(false);
    if (slug) setLocation(`/c/${slug}`);
  };

  const handleToggle = () => {
    setOpen((v) => !v);
    if (!activeRootId && tree[0]) setActiveRootId(tree[0].id);
  };

  const btn =
    template === "orlenbd" ? (
      <Button
        ref={anchorRef}
        variant="contained"
        color="primary"
        startIcon={<MenuIcon />}
        endIcon={<KeyboardArrowDownIcon />}
        onClick={handleToggle}
        sx={{
          color: "text.primary",
          fontWeight: 800,
          borderRadius: 2,
          px: 2,
          boxShadow: "none",
          "& .MuiButton-startIcon, & .MuiButton-endIcon": { color: "inherit" },
          "&:hover": { color: "text.primary", boxShadow: 2 },
        }}
      >
        {text("Browse categories", "ক্যাটাগরি ব্রাউজ করুন")}
      </Button>
    ) : template === "norexbd" || template === "adorashop" ? (
      <Button
        ref={anchorRef}
        variant="outlined"
        color="inherit"
        size="small"
        startIcon={<MenuIcon />}
        endIcon={<KeyboardArrowDownIcon />}
        onClick={handleToggle}
        sx={{ fontWeight: 700, borderRadius: 1, px: 1.5, borderColor: "divider" }}
      >
        {text("Categories", "ক্যাটাগরি")}
      </Button>
    ) : template === "masumtraders" ? (
      <Button
        ref={anchorRef}
        variant="contained"
        color="primary"
        startIcon={<MenuIcon />}
        endIcon={<KeyboardArrowDownIcon />}
        onClick={handleToggle}
        sx={{ fontWeight: 800, borderRadius: 2, px: 2.25, py: 0.95, boxShadow: "none", "&:hover": { boxShadow: 2 } }}
      >
        {text("Shop departments", "বিভাগ অনুযায়ী কেনাকাটা")}
      </Button>
    ) : template === "uttorasteel" ? (
      <Button
        ref={anchorRef}
        variant="contained"
        color="primary"
        startIcon={<MenuIcon />}
        endIcon={<KeyboardArrowDownIcon />}
        onClick={handleToggle}
        sx={{ fontWeight: 800, borderRadius: 1.5, px: 2.1, py: 0.9, boxShadow: "none", "&:hover": { boxShadow: 2 } }}
      >
        {text("Steel catalog", "স্টিল ক্যাটালগ")}
      </Button>
    ) : (
      <Button
        ref={anchorRef}
        variant="contained"
        color="primary"
        startIcon={<MenuIcon />}
        endIcon={<KeyboardArrowDownIcon />}
        onClick={handleToggle}
        sx={{ fontWeight: 800, borderRadius: 2, px: 2.25, py: 1 }}
      >
        {text("All categories", "সব ক্যাটাগরি")}
      </Button>
    );

  const showSubs = subs.length > 0;
  const showSubSubs = subSubs.length > 0;

  return (
    <>
      {btn}
      <Popper
        open={open}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        transition
        modifiers={[{ name: "offset", options: { offset: [0, 8] } }]}
        style={{ zIndex: 1300 }}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={180}>
            <Paper
              elevation={6}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: template === "norexbd" || template === "adorashop" ? 1.5 : 2,
                boxShadow: "0 16px 48px rgba(11,11,11,0.16)",
                overflow: "hidden",
                width: { xs: "92vw", md: showSubSubs ? 760 : showSubs ? 540 : 320 },
                maxWidth: "92vw",
              }}
            >
              <ClickAwayListener onClickAway={() => setOpen(false)}>
                <Stack direction="row" sx={{ minHeight: 320 }}>
                  {/* Roots column */}
                  <Stack
                    sx={{
                      width: { xs: "50%", md: showSubSubs ? 240 : showSubs ? 260 : "100%" },
                      borderRight: showSubs ? "1px solid" : "none",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                      maxHeight: 440,
                      overflowY: "auto",
                      p: 0.75,
                    }}
                    spacing={0.25}
                    onMouseLeave={() => undefined}
                  >
                    {tree.length === 0 ? (
                      <Typography color="text.secondary" sx={{ p: 2 }}>
                        {text("No categories yet", "এখনও কোনো ক্যাটাগরি নেই")}
                      </Typography>
                    ) : (
                      tree.map((root) => (
                        <MegaMenuRow
                          key={root.id}
                          node={root}
                          active={root.id === activeRoot?.id}
                          onHover={() => {
                            setActiveRootId(root.id);
                            setActiveSubId(root.children[0]?.id ?? null);
                          }}
                          onNavigate={() => closeAndGo(root.slug)}
                          hasChildren={root.children.length > 0}
                          size="md"
                        />
                      ))
                    )}
                  </Stack>

                  {/* Subs column */}
                  {showSubs ? (
                    <Stack
                      sx={{
                        width: { xs: "50%", md: showSubSubs ? 240 : 280 },
                        borderRight: showSubSubs ? "1px solid" : "none",
                        borderColor: "divider",
                        maxHeight: 440,
                        overflowY: "auto",
                        p: 0.75,
                      }}
                      spacing={0.25}
                    >
                      {subs.map((sub) => (
                        <MegaMenuRow
                          key={sub.id}
                          node={sub}
                          active={sub.id === activeSub?.id}
                          onHover={() => setActiveSubId(sub.id)}
                          onNavigate={() => closeAndGo(sub.slug)}
                          hasChildren={sub.children.length > 0}
                          size="sm"
                        />
                      ))}
                    </Stack>
                  ) : null}

                  {/* Sub-subs column */}
                  {showSubSubs ? (
                    <Stack
                      sx={{
                        flex: 1,
                        maxHeight: 440,
                        overflowY: "auto",
                        p: 0.75,
                        display: { xs: "none", md: "flex" },
                      }}
                      spacing={0.25}
                    >
                      {subSubs.map((leaf) => (
                        <MegaMenuRow
                          key={leaf.id}
                          node={leaf}
                          active={false}
                          onHover={() => undefined}
                          onNavigate={() => closeAndGo(leaf.slug)}
                          hasChildren={false}
                          size="sm"
                        />
                      ))}
                    </Stack>
                  ) : null}
                </Stack>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  );
}

function MainNavOrlenbd({ categories }: Props) {
  const { text } = useStorefrontLanguage();
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.5}
      sx={{
        flexWrap: "wrap",
        py: 1.25,
        gap: 0.75,
        rowGap: 1,
      }}
    >
      <CategoryDropdown template="orlenbd" />
      <Button component={Link} href="/" color="inherit" sx={navBtnOrlenbdSx}>
        {text("Home", "হোম")}
      </Button>
      <Button component={Link} href="/shop" color="inherit" sx={navBtnOrlenbdSx}>
        {text("Shop", "শপ")}
      </Button>
      {/* <Button component={Link} href="/shop" color="inherit" sx={navBtnOrlenbdSx}>
        {text("Top vendors", "শীর্ষ ভেন্ডর")}
      </Button>
      <Button component={Link} href="/shop" color="inherit" sx={navBtnOrlenbdSx}>
        {text("Deals", "ডিলস")}
      </Button>
      <Button component={Link} href="/shop" color="inherit" sx={navBtnOrlenbdSx}>
        {text("Voucher codes", "ভাউচার কোড")}
      </Button>
      <Button component={Link} href="/v/orlenbd-showcase" color="inherit" sx={navBtnOrlenbdSx}>
        {text("Vendor store", "ভেন্ডর স্টোর")}
      </Button>
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5, display: { xs: "none", sm: "block" } }} /> */}
      <Typography
        component={Link}
        href="/account/orders"
        sx={{
          color: "primary.main",
          fontWeight: 800,
          cursor: "pointer",
          fontSize: "0.9rem",
          textDecoration: "none",
          position: "relative",
          px: 1,
          py: 0.5,
          borderRadius: 1,
          transition: "color 0.2s ease, background 0.2s ease",
          "&:hover": { color: "primary.dark", bgcolor: "action.hover" },
          "&::after": {
            content: '""',
            position: "absolute",
            left: 8,
            right: 8,
            bottom: 4,
            height: 2,
            bgcolor: "brand.main",
            transform: "scaleX(0)",
            transformOrigin: "left",
            transition: "transform 0.22s ease",
          },
          "&:hover::after": { transform: "scaleX(1)" },
        }}
      >
        {text("Track order", "অর্ডার ট্র্যাক")}
      </Typography>
      <Typography
        component={Link}
        href="/shop"
        sx={{
          color: "primary.main",
          fontWeight: 800,
          cursor: "pointer",
          ml: { xs: 0, md: "auto" },
          fontSize: "0.9rem",
          textDecoration: "none",
          position: "relative",
          px: 1,
          py: 0.5,
          borderRadius: 1,
          transition: "color 0.2s ease, background 0.2s ease",
          "&:hover": { color: "primary.dark", bgcolor: "action.hover" },
          "&::after": {
            content: '""',
            position: "absolute",
            left: 8,
            right: 8,
            bottom: 4,
            height: 2,
            bgcolor: "brand.main",
            transform: "scaleX(0)",
            transformOrigin: "left",
            transition: "transform 0.22s ease",
          },
          "&:hover::after": { transform: "scaleX(1)" },
        }}
      >
        {text("Flash deals", "ফ্ল্যাশ ডিলস")}
      </Typography>
    </Stack>
  );
}

const norexLinkSx = {
  fontWeight: 600,
  fontSize: "0.8125rem",
  color: "text.primary",
  textDecoration: "none",
  px: 1,
  py: 0.5,
  borderRadius: 1,
  "&:hover": { bgcolor: "action.hover", color: "primary.main" },
} as const;

function MainNavNorexbd({ categories }: Props) {
  const { text } = useStorefrontLanguage();
  return (
    <Stack direction="row" alignItems="center" spacing={0.25} sx={{ flexWrap: "wrap", py: 0.85, gap: 0.5, rowGap: 0.75 }}>
      <CategoryDropdown template="norexbd" />
      <Typography component={Link} href="/" sx={norexLinkSx}>
        {text("Home", "হোম")}
      </Typography>
      <Typography component={Link} href="/shop" sx={norexLinkSx}>
        {text("Shop", "শপ")}
      </Typography>
      <Typography component={Link} href="/account/orders" sx={norexLinkSx}>
        {text("Orders", "অর্ডার")}
      </Typography>
      <Typography component={Link} href="/wishlist" sx={norexLinkSx}>
        {text("Wishlist", "ইচ্ছেতালিকা")}
      </Typography>
      <Box sx={{ flex: 1 }} />
      <Typography component={Link} href="/shop" sx={{ ...norexLinkSx, color: "primary.main", fontWeight: 700 }}>
        {text("Deals", "ডিলস")}
      </Typography>
    </Stack>
  );
}

const forexCatLinkSx = {
  fontWeight: 600,
  fontSize: "0.8125rem",
  color: "text.secondary",
  textDecoration: "none",
  whiteSpace: "nowrap",
  px: 0.75,
  py: 0.5,
  borderRadius: 1,
  "&:hover": { color: "primary.main", bgcolor: "action.hover" },
} as const;

function MainNavOrynbd({ categories }: Props) {
  const { text } = useStorefrontLanguage();
  const chipSx = {
    fontWeight: 700,
    borderRadius: 2,
    border: "1px solid",
    borderColor: "divider",
    bgcolor: "background.paper",
    "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
  };

  // Show only root categories in the desktop chip rail; deeper levels live in the mega-menu.
  const topCats = categories.filter((c) => !c.parentId).slice(0, 10);

  return (
    <Stack spacing={1}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: "wrap", py: 0.5, gap: 1, rowGap: 1 }}>
        <CategoryDropdown template="orynbd" />
        <Box
          sx={{
            display: { xs: "none", lg: "flex" },
            alignItems: "center",
            gap: 0.5,
            overflowX: "auto",
            flex: 1,
            minWidth: 0,
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {topCats.map((c) => (
            <Typography key={c.id} component={Link} href={`/c/${c.slug}`} sx={forexCatLinkSx}>
              {c.name}
            </Typography>
          ))}
        </Box>
        <Box sx={{ flex: 1, minWidth: 8, display: { xs: "none", lg: "block" } }} />
        <Chip
          component={Link}
          href="/shop"
          label={text("Best deals", "সেরা ডিল")}
          clickable
          variant="outlined"
          sx={chipSx}
        />
        <Button component={Link} href="/shop" color="secondary" variant="contained" size="small" sx={{ fontWeight: 800 }}>
          {text("Express picks", "এক্সপ্রেস পিকস")}
        </Button>
      </Stack>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: "wrap", py: 0.25, display: { lg: "none" } }}>
        <Chip component={Link} href="/" label={text("Home", "হোম")} clickable variant="outlined" sx={chipSx} />
        <Chip component={Link} href="/shop" label={text("All products", "সব পণ্য")} clickable variant="outlined" sx={chipSx} />
        <Chip component={Link} href="/account/orders" label={text("Your orders", "আপনার অর্ডার")} clickable variant="outlined" sx={chipSx} />
        <Chip
          component={Link}
          href="/v/orlenbd-showcase"
          label={text("Featured store", "ফিচার্ড স্টোর")}
          clickable
          variant="outlined"
          sx={chipSx}
        />
      </Stack>
    </Stack>
  );
}

function MainNavUttoraSteel({ categories }: Props) {
  const { text } = useStorefrontLanguage();
  const topCats = categories.filter((c) => !c.parentId).slice(0, 8);
  const chipSx = {
    fontWeight: 700,
    borderRadius: 1.5,
    border: "1px solid",
    borderColor: "divider",
    bgcolor: "background.paper",
    "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
  };

  return (
    <Stack spacing={0.75}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: "wrap", py: 0.6, gap: 0.9, rowGap: 0.9 }}>
        <CategoryDropdown template="uttorasteel" />
        <Button component={Link} href="/" color="inherit" sx={navBtnOrlenbdSx}>
          {text("Home", "হোম")}
        </Button>
        <Button component={Link} href="/shop" color="inherit" sx={navBtnOrlenbdSx}>
          {text("Shop", "শপ")}
        </Button>
        <Button component={Link} href="/shop" color="inherit" sx={navBtnOrlenbdSx}>
          {text("Bedroom & furniture", "বেডরুম ও ফার্নিচার")}
        </Button>
        <Button component={Link} href="/shop" color="inherit" sx={navBtnOrlenbdSx}>
          {text("Office steel", "অফিস স্টিল")}
        </Button>
        <Button component={Link} href="/shop" color="inherit" sx={navBtnOrlenbdSx}>
          {text("Kitchen & racks", "কিচেন ও র্যাক")}
        </Button>
        <Button component={Link} href="/shop" color="inherit" sx={navBtnOrlenbdSx}>
          {text("Offers", "অফার")}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button component={Link} href="/account/orders" color="primary" variant="contained" size="small" sx={{ fontWeight: 800 }}>
          {text("Track order", "অর্ডার ট্র্যাক")}
        </Button>
      </Stack>
      <Stack direction="row" alignItems="center" spacing={0.8} sx={{ flexWrap: "wrap", pb: 0.4, display: { xs: "none", lg: "flex" } }}>
        {topCats.map((c) => (
          <Chip key={c.id} component={Link} href={`/c/${c.slug}`} label={c.name} clickable variant="outlined" sx={chipSx} />
        ))}
      </Stack>
    </Stack>
  );
}

function MainNavMasumTraders({ categories }: Props) {
  const { text } = useStorefrontLanguage();
  const topCats = categories.filter((c) => !c.parentId).slice(0, 8);
  const chipSx = {
    fontWeight: 700,
    borderRadius: 2,
    border: "1px solid",
    borderColor: "divider",
    bgcolor: "background.paper",
    "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
  };

  return (
    <Stack spacing={0.75}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: "wrap", py: 0.6, gap: 0.9, rowGap: 0.9 }}>
        <CategoryDropdown template="masumtraders" />
        <Button component={Link} href="/" color="inherit" sx={navBtnOrlenbdSx}>
          {text("Home", "হোম")}
        </Button>
        <Button component={Link} href="/shop" color="inherit" sx={navBtnOrlenbdSx}>
          {text("Shop", "শপ")}
        </Button>
        <Button component={Link} href="/shop" color="inherit" sx={navBtnOrlenbdSx}>
          {text("Daily essentials", "দৈনিক প্রয়োজন")}
        </Button>
        <Button component={Link} href="/shop" color="inherit" sx={navBtnOrlenbdSx}>
          {text("Bulk packs", "বাল্ক প্যাক")}
        </Button>
        <Button component={Link} href="/shop" color="inherit" sx={navBtnOrlenbdSx}>
          {text("Offers", "অফার")}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button component={Link} href="/account/orders" color="primary" variant="contained" size="small" sx={{ fontWeight: 800 }}>
          {text("Track order", "অর্ডার ট্র্যাক")}
        </Button>
      </Stack>
      <Stack direction="row" alignItems="center" spacing={0.8} sx={{ flexWrap: "wrap", pb: 0.4, display: { xs: "none", lg: "flex" } }}>
        {topCats.map((c) => (
          <Chip key={c.id} component={Link} href={`/c/${c.slug}`} label={c.name} clickable variant="outlined" sx={chipSx} />
        ))}
      </Stack>
    </Stack>
  );
}

export function MainNavBar({ categories }: Props) {
  const template = useStorefrontLayoutTemplate();
  if (template === "norexbd" || template === "adorashop") return <MainNavNorexbd categories={categories} />;
  if (template === "orynbd") return <MainNavOrynbd categories={categories} />;
  if (template === "masumtraders") return <MainNavMasumTraders categories={categories} />;
  if (template === "uttorasteel") return <MainNavUttoraSteel categories={categories} />;
  return <MainNavOrlenbd categories={categories} />;
}
