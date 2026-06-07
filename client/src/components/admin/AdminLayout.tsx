import { Fragment, useEffect, useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
  Button,
  Tooltip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import MarkEmailReadRoundedIcon from "@mui/icons-material/MarkEmailReadRounded";
import RateReviewRoundedIcon from "@mui/icons-material/RateReviewRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import { Link, useLocation as useWouterLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Seo } from "@/components/seo/Seo";
import { useSiteBrand } from "@/contexts/PublicSiteMetaContext";
import { mediaAbsoluteUrl } from "@/lib/site";
import { userAvatarImgSrc, userInitials } from "@/lib/userAvatar";
import { usePublicSiteMeta } from "@/contexts/PublicSiteMetaContext";
import { getAdminPageMeta } from "./adminMeta";
import { useAdminPermission } from "@/contexts/AdminPermissionContext";
import { adminModuleForPath } from "@/lib/adminPathModule";

const DRAWER_W = 272;
const ORLENPAY_SIDEBAR_ICON = (
  <Box
    component="img"
    src="/orlenpay-logo.png"
    alt=""
    sx={{ width: 18, height: 18, objectFit: "contain", borderRadius: 0.75 }}
  />
);

type NavItem = { label: string; href: string; icon: React.ReactNode };
type NavSection = { label: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/", icon: <DashboardRoundedIcon /> }],
  },
  {
    label: "Commerce",
    items: [
      { label: "Orders", href: "/orders", icon: <ReceiptLongRoundedIcon /> },
      { label: "Products", href: "/products", icon: <Inventory2RoundedIcon /> },
      { label: "Vendors", href: "/vendors", icon: <StorefrontRoundedIcon /> },
      { label: "Couriers", href: "/couriers", icon: <LocalShippingRoundedIcon /> },
    ],
  },
  {
    label: "Catalog",
    items: [
      { label: "Categories", href: "/categories", icon: <CategoryRoundedIcon /> },
      { label: "Banners", href: "/banners", icon: <ImageRoundedIcon /> },
    ],
  },
  {
    label: "People & access",
    items: [
      { label: "Users", href: "/users", icon: <PeopleRoundedIcon /> },
      { label: "Roles", href: "/roles", icon: <SecurityRoundedIcon /> },
      { label: "Newsletter", href: "/newsletter", icon: <MarkEmailReadRoundedIcon /> },
      { label: "Reviews", href: "/reviews", icon: <RateReviewRoundedIcon /> },
      { label: "Wishlist stats", href: "/wishlist-stats", icon: <FavoriteRoundedIcon /> },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Brand Trust Pages", href: "/brand-trust-pages", icon: <ArticleRoundedIcon /> },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Settings", href: "/settings", icon: <SettingsRoundedIcon /> },
      { label: "Payment gateway", href: "/payment-gateway", icon: ORLENPAY_SIDEBAR_ICON },
      { label: "Audit logs", href: "/audit-logs", icon: <HistoryRoundedIcon /> },
    ],
  },
];

type Props = { children: React.ReactNode };

export function AdminLayout({ children }: Props) {
  const brand = useSiteBrand();
  const siteMeta = usePublicSiteMeta();
  const logoUrl = mediaAbsoluteUrl(siteMeta?.logo_url ?? null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountEl, setAccountEl] = useState<null | HTMLElement>(null);
  const [path, setPath] = useWouterLocation();
  const { user, logout } = useAuth();
  const { can, loading: permLoading } = useAdminPermission();
  const normPath = path === "" ? "/" : path;
  const meta = getAdminPageMeta(normPath);
  const adminCanonical = normPath === "/" ? "/admin" : `/admin${normPath}`;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [path]);

  const renderNavItem = (item: NavItem) => {
    const atRoot = path === "/" || path === "";
    const active =
      item.href === "/" ? atRoot : path === item.href || path.startsWith(`${item.href}/`);
    return (
      <ListItemButton
        key={item.href}
        component={Link}
        href={item.href}
        selected={active}
        onClick={() => setMobileOpen(false)}
        sx={{
          borderRadius: 2,
          mb: 0.25,
          mx: 0.5,
          "&.Mui-selected": {
            bgcolor: "rgba(198, 227, 0, 0.12)",
            borderLeft: "3px solid",
            borderColor: "primary.main",
            pl: 1.375,
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 40, color: active ? "primary.main" : "text.secondary" }}>
          {item.icon}
        </ListItemIcon>
        <ListItemText
          primary={item.label}
          primaryTypographyProps={{ fontWeight: active ? 700 : 600, fontSize: "0.92rem" }}
        />
      </ListItemButton>
    );
  };

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ px: 2.5, py: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", minHeight: 48, mb: logoUrl ? 0.75 : 0 }}>
          {logoUrl ? (
            <Box
              component="img"
              src={logoUrl}
              alt={brand}
              sx={{ maxHeight: 44, width: "100%", maxWidth: 208, objectFit: "contain", objectPosition: "left center" }}
            />
          ) : (
            <Typography variant="subtitle1" fontWeight={800} sx={{ letterSpacing: -0.3 }}>
              {brand}
            </Typography>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block" }}>
          Platform admin
        </Typography>
      </Box>
      <Divider sx={{ borderColor: "divider" }} />
      <List sx={{ px: 0.5, py: 1.5, flex: 1, overflowY: "auto" }}>
        {NAV_SECTIONS.map((section) => {
          const items = permLoading
            ? section.items
            : section.items.filter((it) => can(adminModuleForPath(it.href), "view"));
          if (!items.length) return null;
          return (
            <Fragment key={section.label}>
              <ListSubheader
                disableSticky
                sx={{
                  bgcolor: "background.paper",
                  color: "text.secondary",
                  fontWeight: 800,
                  fontSize: "0.65rem",
                  letterSpacing: "0.14em",
                  lineHeight: 2.8,
                  py: 0,
                }}
              >
                {section.label}
              </ListSubheader>
              {items.map(renderNavItem)}
            </Fragment>
          );
        })}
      </List>
      <Divider sx={{ borderColor: "divider" }} />
      <Box sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1 }}>
          <Avatar
            src={userAvatarImgSrc(user?.avatarUrl)}
            alt=""
            sx={{ width: 36, height: 36, fontSize: "0.85rem", fontWeight: 800 }}
          >
            {user ? userInitials(user.fullName) : "?"}
          </Avatar>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ fontWeight: 600, minWidth: 0 }}>
            {user?.email ?? user?.phone ?? "Signed in"}
          </Typography>
        </Stack>
        <Button
          fullWidth
          size="small"
          component={Link}
          href="~/"
          startIcon={<OpenInNewRoundedIcon />}
          sx={{ color: "primary.main", fontWeight: 700 }}
        >
          View storefront
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
        width: "100%",
        maxWidth: "100vw",
        overflowX: "hidden",
      }}
    >
      <Seo title={meta.title} description={meta.subtitle} canonicalPath={adminCanonical} noindex />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_W}px)` },
          ml: { md: `${DRAWER_W}px` },
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Toolbar sx={{ gap: 2, minHeight: { xs: 56, md: 64 } }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { md: "none" }, color: "text.primary" }}
            aria-label="Open menu"
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800} noWrap>
              {meta.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap sx={{ display: { xs: "none", sm: "block" } }}>
              {meta.subtitle}
            </Typography>
          </Box>
          <Tooltip title="Open live site">
            <IconButton
              component={Link}
              href="~/"
              color="inherit"
              aria-label="Open live site"
              sx={{ color: "primary.main" }}
            >
              <OpenInNewRoundedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Account">
            <IconButton
              onClick={(e) => setAccountEl(e.currentTarget)}
              aria-label="Account"
              sx={{ ml: { xs: 0, md: -0.5 }, color: "text.primary", borderRadius: "50%" }}
              aria-haspopup="true"
              aria-expanded={Boolean(accountEl)}
            >
              <Avatar
                src={userAvatarImgSrc(user?.avatarUrl)}
                alt=""
                sx={{ width: 34, height: 34, fontSize: "0.9rem", fontWeight: 800, bgcolor: "rgba(198, 227, 0, 0.35)", color: "text.primary", border: "1px solid", borderColor: "divider" }}
              >
                {user ? userInitials(user.fullName) : "?"}
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={accountEl}
            open={Boolean(accountEl)}
            onClose={() => setAccountEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{
              paper: { sx: { minWidth: 220, mt: 1 } },
              list: { dense: true },
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 1, display: "block" }}>
              Signed in as
              <Typography component="span" variant="body2" color="text.primary" fontWeight={700} display="block" noWrap>
                {user?.email ?? user?.phone ?? "—"}
              </Typography>
            </Typography>
            <Divider sx={{ mb: 0.5 }} />
            <MenuItem component={Link} href="/profile" onClick={() => setAccountEl(null)}>
              <ListItemIcon>
                <PersonRoundedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primaryTypographyProps={{ fontWeight: 600 }} primary="Profile" />
            </MenuItem>
            <MenuItem component={Link} href="/profile#password" onClick={() => setAccountEl(null)}>
              <ListItemIcon>
                <KeyRoundedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primaryTypographyProps={{ fontWeight: 600 }} primary="Change password" />
            </MenuItem>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem
              onClick={async () => {
                setAccountEl(null);
                await logout();
                setPath("/login");
              }}
            >
              <ListItemIcon>
                <LogoutRoundedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primaryTypographyProps={{ fontWeight: 600 }} primary="Logout" />
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_W }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_W,
              maxWidth: "min(100vw - 32px, 300px)",
              bgcolor: "background.paper",
              borderRight: "1px solid",
              borderColor: "divider",
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_W,
              bgcolor: "background.paper",
              borderRight: "1px solid",
              borderColor: "divider",
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          flexShrink: 1,
          minWidth: 0,
          width: { xs: "100%", md: `calc(100% - ${DRAWER_W}px)` },
          maxWidth: { md: `calc(100vw - ${DRAWER_W}px)` },
          minHeight: "100vh",
          pt: { xs: 8, md: 9 },
          pb: 4,
          px: { xs: 1.5, sm: 2.5, md: 3 },
          boxSizing: "border-box",
        }}
      >
        <Box sx={{ width: "100%", maxWidth: "100%" }}>{children}</Box>
      </Box>
    </Box>
  );
}
