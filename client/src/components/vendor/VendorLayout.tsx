import { useEffect, useState } from "react";
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Button,
  Tooltip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import HowToRegRoundedIcon from "@mui/icons-material/HowToRegRounded";
import { Link, useLocation as useWouterLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useSiteBrand } from "@/contexts/PublicSiteMetaContext";
import { getVendorPageMeta } from "./vendorMeta";

const DRAWER_W = 268;

type NavItem = { label: string; href: string; icon: React.ReactNode };

type Props = {
  children: React.ReactNode;
  /** Apply flow: only “Apply” in nav */
  mode: "apply" | "full";
  vendorName?: string;
  vendorStatus?: string;
};

export function VendorLayout({ children, mode, vendorName, vendorStatus }: Props) {
  const brand = useSiteBrand();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [path, setPath] = useWouterLocation();
  const { user, logout } = useAuth();
  const metaPath = mode === "apply" ? "/apply" : path === "" ? "/" : path;
  const meta = getVendorPageMeta(metaPath);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [path]);

  const nav: NavItem[] =
    mode === "apply"
      ? [{ label: "Apply to sell", href: "/", icon: <HowToRegRoundedIcon /> }]
      : [
          { label: "Overview", href: "/", icon: <DashboardRoundedIcon /> },
          { label: "Products", href: "/products", icon: <Inventory2RoundedIcon /> },
          { label: "Orders", href: "/orders", icon: <ReceiptLongRoundedIcon /> },
        ];

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ px: 2.5, py: 2.5 }}>
        <Typography variant="subtitle1" fontWeight={800} sx={{ letterSpacing: -0.3 }}>
          Seller hub
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {vendorName ? `${vendorName} · ${vendorStatus ?? ""}` : `${brand} marketplace`}
        </Typography>
      </Box>
      <Divider sx={{ borderColor: "divider" }} />
      <List sx={{ px: 1.5, py: 2, flex: 1 }}>
        {nav.map((item) => {
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
                mb: 0.5,
                "&.Mui-selected": {
                  bgcolor: "rgba(45, 212, 191, 0.14)",
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
                primaryTypographyProps={{ fontWeight: active ? 700 : 600, fontSize: "0.95rem" }}
              />
            </ListItemButton>
          );
        })}
      </List>
      <Divider sx={{ borderColor: "divider" }} />
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ mb: 1 }}>
          {user?.email ?? user?.phone ?? "Signed in"}
        </Typography>
        <Button
          fullWidth
          size="small"
          variant="outlined"
          color="inherit"
          startIcon={<LogoutRoundedIcon />}
          onClick={async () => {
            await logout();
            setPath("/");
            window.location.assign("/vendor");
          }}
          sx={{ borderColor: "divider", color: "text.secondary" }}
        >
          Sign out
        </Button>
        <Button
          fullWidth
          size="small"
          component={Link}
          href="~/"
          startIcon={<OpenInNewRoundedIcon />}
          sx={{ mt: 1, color: "primary.main", fontWeight: 700 }}
        >
          View storefront
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
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
          width: { md: `calc(100% - ${DRAWER_W}px)` },
          minHeight: "100vh",
          pt: { xs: 8, md: 9 },
          pb: 4,
          px: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: "auto" }}>{children}</Box>
      </Box>
    </Box>
  );
}
