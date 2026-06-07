import { Avatar, Badge, Box, IconButton, Paper, Stack, Typography } from "@mui/material";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import AppsRoundedIcon from "@mui/icons-material/AppsRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import { Link, useLocation } from "wouter";
import type { ReactNode } from "react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { userAvatarImgSrc, userInitials } from "@/lib/userAvatar";

function NavItem({
  href,
  label,
  active,
  icon,
  badge,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: ReactNode;
  badge?: number;
}) {
  return (
    <Box
      component={Link}
      href={href}
      sx={{
        textDecoration: "none",
        color: active ? "primary.main" : "text.secondary",
        flex: 1,
      }}
      aria-label={label}
    >
      <Stack alignItems="center" spacing={0.35}>
        <IconButton
          size="small"
          tabIndex={-1}
          aria-hidden="true"
          component="span"
          sx={{
            color: "inherit",
            bgcolor: active ? "rgba(212,232,0,0.26)" : "transparent",
            border: active ? "1px solid" : "1px solid transparent",
            borderColor: active ? "primary.main" : "transparent",
            transition: "all 0.2s ease",
          }}
        >
          {typeof badge === "number" && badge > 0 ? (
            <Badge color="primary" badgeContent={badge > 99 ? "99+" : badge} max={99}>
              {icon}
            </Badge>
          ) : (
            icon
          )}
        </IconButton>
        <Typography variant="caption" sx={{ fontSize: "0.68rem", fontWeight: active ? 800 : 700 }}>
          {label}
        </Typography>
      </Stack>
    </Box>
  );
}

export function MobileBottomBar() {
  const [location] = useLocation();
  const { count } = useCart();
  const { user } = useAuth();
  const accountActive =
    location.startsWith("/account") || location === "/login" || location === "/register";

  return (
    <Paper
      elevation={0}
      sx={{
        display: { xs: "block", md: "none" },
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: (t) => t.zIndex.appBar + 3,
        borderTop: "1px solid",
        borderColor: "divider",
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        px: 1.25,
        pt: 0.9,
        pb: "calc(8px + env(safe-area-inset-bottom, 0px))",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,251,255,0.98) 100%)",
        boxShadow: "0 -10px 30px rgba(15,23,42,0.12)",
        backdropFilter: "blur(8px)",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.25}>
        <NavItem href="/" label="Home" active={location === "/"} icon={<HomeRoundedIcon fontSize="small" />} />
        <NavItem
          href="/categories"
          label="Categories"
          active={location === "/categories" || location.startsWith("/c/")}
          icon={<AppsRoundedIcon fontSize="small" />}
        />
        <NavItem
          href="/cart"
          label="Cart"
          active={location === "/cart" || location === "/checkout"}
          icon={<ShoppingCartRoundedIcon fontSize="small" />}
          badge={count}
        />
        <NavItem
          href={user ? "/account" : "/login"}
          label={user ? "Account" : "Login"}
          active={accountActive}
          icon={
            user ? (
              <Avatar
                src={userAvatarImgSrc(user.avatarUrl)}
                alt=""
                sx={{
                  width: 22,
                  height: 22,
                  fontSize: "0.6rem",
                  fontWeight: 800,
                  bgcolor: accountActive ? "primary.main" : "action.hover",
                  color: accountActive ? "primary.contrastText" : "text.secondary",
                }}
              >
                {userInitials(user.fullName)}
              </Avatar>
            ) : (
              <PersonRoundedIcon fontSize="small" />
            )
          }
        />
      </Stack>
    </Paper>
  );
}
