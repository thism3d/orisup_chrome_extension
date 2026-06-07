import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import PhoneInTalkOutlinedIcon from "@mui/icons-material/PhoneInTalkOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import HowToRegOutlinedIcon from "@mui/icons-material/HowToRegOutlined";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useStoreAuthModal } from "@/contexts/StoreAuthModalContext";
import { useCart } from "@/hooks/useCart";
import { useStorefrontContact } from "@/hooks/useStorefrontContact";
import { formatBdt } from "@/lib/format";
import { headerContactTooltip } from "@/lib/storefrontContactFromMeta";
import { apiJson } from "@/lib/api";
import { parseDecimalString } from "@shared/parseDecimalString";
import { userAvatarImgSrc, userInitials } from "@/lib/userAvatar";

export function HeaderActions() {
  const { user, loading, logout } = useAuth();
  const { openLogin, openRegister } = useStoreAuthModal();
  const contact = useStorefrontContact();
  const callHref = contact.supportPhoneTel || "/contact";
  const isTel = callHref.startsWith("tel:");
  const { count, data: cartData } = useCart();
  const { data: wishlistCountData } = useQuery({
    queryKey: ["wishlist-count"],
    queryFn: () => apiJson<{ count: number }>("/api/wishlist/count"),
    enabled: Boolean(user),
    staleTime: 30_000,
  });
  const wishlistCount = wishlistCountData?.count ?? 0;
  const [, setLoc] = useLocation();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const subtotal = useMemo(() => {
    if (!cartData?.lines?.length) return 0;
    return cartData.lines.reduce((sum, row) => {
      const p = row.variant ? parseDecimalString(row.variant.price) : parseDecimalString(row.product.price);
      const q = row.line.quantity;
      if (Number.isNaN(p)) return sum;
      return sum + p * q;
    }, 0);
  }, [cartData?.lines]);

  const closeMenu = () => setMenuAnchor(null);

  const handleLogout = async () => {
    closeMenu();
    await logout();
    setLoc("/");
  };

  return (
    <Stack direction="row" alignItems="center" spacing={{ xs: 0.5, sm: 1 }}>
      <Tooltip title={headerContactTooltip(contact.supportPhoneDisplay)}>
        {isTel ? (
          <IconButton component="a" href={callHref} color="inherit" aria-label="Call support" sx={{ mr: 0.25 }}>
            <PhoneInTalkOutlinedIcon />
          </IconButton>
        ) : (
          <IconButton component={Link} href={callHref} color="inherit" aria-label="Contact us" sx={{ mr: 0.25 }}>
            <PhoneInTalkOutlinedIcon />
          </IconButton>
        )}
      </Tooltip>

      {user && (
        <Tooltip title="Wishlist">
          <IconButton component={Link} href="/wishlist" color="inherit" aria-label="Wishlist">
            <Badge badgeContent={wishlistCount > 0 ? wishlistCount : 0} color="primary" max={99} invisible={wishlistCount === 0}>
              <FavoriteBorderIcon />
            </Badge>
          </IconButton>
        </Tooltip>
      )}

      <Tooltip title="Cart">
        <Box
          component={Link}
          href="/cart"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            textDecoration: "none",
            color: "inherit",
            borderRadius: 2,
            px: { xs: 0, sm: 0.5 },
            py: 0.25,
            transition: "background 0.2s ease",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <Badge badgeContent={count > 0 ? count : 0} color="primary" invisible={count === 0} max={99}>
            <ShoppingBagOutlinedIcon />
          </Badge>
          <Typography
            variant="body2"
            fontWeight={800}
            sx={{ display: { xs: "none", md: "block" }, color: "primary.main", minWidth: 48 }}
          >
            {formatBdt(subtotal)}
          </Typography>
        </Box>
      </Tooltip>

      {!loading && (
        <>
          {user ? (
            <>
              <IconButton
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                aria-label="Account menu"
                aria-haspopup="true"
                aria-expanded={Boolean(menuAnchor)}
                sx={{ ml: { xs: 0, sm: 0.5 }, p: 0.5 }}
              >
                <Avatar
                  src={userAvatarImgSrc(user.avatarUrl)}
                  alt=""
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: "brand.main",
                    color: "brand.contrastText",
                    fontWeight: 800,
                    fontSize: "0.85rem",
                    border: "2px solid",
                    borderColor: "divider",
                  }}
                >
                  {userInitials(user.fullName)}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={closeMenu}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                slotProps={{
                  paper: {
                    sx: { mt: 1, minWidth: 240, borderRadius: 2, boxShadow: "0 16px 48px rgba(11,11,11,0.14)" },
                  },
                }}
              >
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight={800} noWrap>
                    {user.fullName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {user.email ?? user.phone ?? "Signed in"}
                  </Typography>
                </Box>
                <Divider />
                <MenuItem component={Link} href="/account" onClick={closeMenu}>
                  <ListItemIcon>
                    <PersonOutlineIcon fontSize="small" />
                  </ListItemIcon>
                  My account
                </MenuItem>
                <MenuItem component={Link} href="/account/orders" onClick={closeMenu}>
                  <ListItemIcon>
                    <ReceiptLongOutlinedIcon fontSize="small" />
                  </ListItemIcon>
                  My orders
                </MenuItem>
                <MenuItem component={Link} href="/wishlist" onClick={closeMenu}>
                  <ListItemIcon>
                    <FavoriteBorderIcon fontSize="small" />
                  </ListItemIcon>
                  Wishlist
                </MenuItem>
                {user.role === "vendor_staff" && (
                  <MenuItem component={Link} href="/vendor" onClick={closeMenu}>
                    <ListItemIcon>
                      <StorefrontOutlinedIcon fontSize="small" />
                    </ListItemIcon>
                    Vendor portal
                  </MenuItem>
                )}
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutOutlinedIcon fontSize="small" />
                  </ListItemIcon>
                  Log out
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: { xs: 0, sm: 0.5 } }}>
              <Button
                type="button"
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<LoginOutlinedIcon />}
                onClick={() => openLogin()}
                sx={{ display: { xs: "none", sm: "inline-flex" }, fontWeight: 700 }}
              >
                Login
              </Button>
              <Tooltip title="Login">
                <IconButton type="button" onClick={() => openLogin()} color="inherit" aria-label="Login" sx={{ display: { xs: "inline-flex", sm: "none" } }}>
                  <PersonOutlineIcon />
                </IconButton>
              </Tooltip>
              <Button
                type="button"
                variant="contained"
                color="primary"
                size="small"
                startIcon={<HowToRegOutlinedIcon />}
                onClick={() => openRegister()}
                sx={{ display: { xs: "none", md: "inline-flex" }, fontWeight: 700 }}
              >
                Register
              </Button>
            </Stack>
          )}
        </>
      )}
    </Stack>
  );
}
