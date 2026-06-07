import {
  Avatar,
  Box,
  Button,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { Link } from "wouter";
import CloseIcon from "@mui/icons-material/Close";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import FlashOnOutlinedIcon from "@mui/icons-material/FlashOnOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import StoreMallDirectoryOutlinedIcon from "@mui/icons-material/StoreMallDirectoryOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import { useState } from "react";
import type { Category, CategoryNode } from "@/lib/types";
import { CategoryNavIcon } from "@/lib/categoryIcons";
import { mediaAbsoluteUrl } from "@/lib/site";
import { useCategoryTree } from "@/hooks/useCategoryTree";
import { LogoLink } from "@/components/layout/LogoLink";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

type Props = {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  lang: "en" | "bn";
  onToggleLang: () => void;
};

const quickLinks: { href: string; label: string; Icon: typeof HomeOutlinedIcon }[] = [
  { href: "/", label: "Home", Icon: HomeOutlinedIcon },
  { href: "/shop", label: "Shop", Icon: StorefrontOutlinedIcon },
  // { href: "/shop", label: "Top vendors", Icon: GroupsOutlinedIcon },
  // { href: "/shop", label: "Deals", Icon: LocalOfferOutlinedIcon },
  // { href: "/shop", label: "Voucher codes", Icon: ConfirmationNumberOutlinedIcon },
  // { href: "/v/orlenbd-showcase", label: "Vendor store", Icon: StorefrontOutlinedIcon },
  { href: "/account/orders", label: "Track order", Icon: ReceiptLongOutlinedIcon },
  { href: "/shop", label: "Flash deals", Icon: FlashOnOutlinedIcon },
];

function CategoryDrawerAvatar({ node }: { node: CategoryNode | Category }) {
  const url = "imageUrl" in node && node.imageUrl ? mediaAbsoluteUrl(node.imageUrl) ?? node.imageUrl : null;
  if (url) {
    return <Avatar src={url} variant="rounded" sx={{ width: 28, height: 28, bgcolor: "transparent" }} />;
  }
  return (
    <Box sx={{ width: 28, height: 28, display: "grid", placeItems: "center" }}>
      <CategoryNavIcon category={node as Category} fontSize={20} />
    </Box>
  );
}

function CategoryTreeRow({
  node,
  depth,
  onClose,
}: {
  node: CategoryNode;
  depth: number;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hasChildren = node.children.length > 0;
  return (
    <>
      {hasChildren ? (
        <ListItemButton sx={{ pl: 2 + depth * 1.25 }} onClick={() => setOpen((v) => !v)}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <CategoryDrawerAvatar node={node} />
          </ListItemIcon>
          <ListItemText
            primary={node.name}
            primaryTypographyProps={{
              fontWeight: depth === 0 ? 700 : 600,
              fontSize: depth === 0 ? "0.9rem" : "0.85rem",
            }}
          />
          {open ? <ExpandLessRoundedIcon fontSize="small" /> : <ExpandMoreRoundedIcon fontSize="small" />}
        </ListItemButton>
      ) : (
        <ListItemButton
          component={Link}
          href={`/c/${node.slug}`}
          onClick={onClose}
          sx={{ pl: 2 + depth * 1.25 }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <CategoryDrawerAvatar node={node} />
          </ListItemIcon>
          <ListItemText
            primary={node.name}
            primaryTypographyProps={{
              fontWeight: depth === 0 ? 700 : 600,
              fontSize: depth === 0 ? "0.9rem" : "0.85rem",
            }}
          />
        </ListItemButton>
      )}
      {hasChildren ? (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List dense disablePadding>
            <ListItemButton
              component={Link}
              href={`/c/${node.slug}`}
              onClick={onClose}
              sx={{ pl: 2 + (depth + 1) * 1.25 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Box sx={{ width: 28, height: 28 }} />
              </ListItemIcon>
              <ListItemText
                primary={`View all in ${node.name}`}
                primaryTypographyProps={{ fontWeight: 700, fontSize: "0.8rem", color: "primary.main" }}
              />
            </ListItemButton>
            {node.children.map((child) => (
              <CategoryTreeRow key={child.id} node={child} depth={depth + 1} onClose={onClose} />
            ))}
          </List>
        </Collapse>
      ) : null}
    </>
  );
}

export function MobileStoreNavDrawer({ open, onClose, categories, lang, onToggleLang }: Props) {
  const { user, logout } = useAuth();
  const [, setLoc] = useLocation();
  const treeQ = useCategoryTree();
  const tree = treeQ.data ?? [];
  // Fall back to flat categories prop if tree fetch hasn't resolved yet -- guarantees something renders.
  const fallback: CategoryNode[] = categories.map((c) => ({ ...c, children: [] }));
  const items = tree.length ? tree : fallback;

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: "min(100vw - 48px, 320px)",
          maxWidth: "100vw",
          pt: 1,
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1.5, pb: 1, gap: 1 }}>
        <Box onClick={onClose} sx={{ minWidth: 0, flex: 1 }}>
          <LogoLink />
        </Box>
        <IconButton onClick={onClose} aria-label="Close menu" edge="end" size="small" sx={{ flexShrink: 0 }}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />
      <List dense sx={{ py: 0.5 }}>
        {quickLinks.map(({ href, label, Icon }) => (
          <ListItemButton key={`${href}-${label}`} component={Link} href={href} onClick={onClose}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Icon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary={label} primaryTypographyProps={{ fontWeight: 600, fontSize: "0.9rem" }} />
          </ListItemButton>
        ))}
      </List>
      <Divider sx={{ my: 0.5 }} />
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2, py: 1 }}
      >
        <Typography variant="overline" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 1 }}>
          Categories
        </Typography>
        <Button
          component={Link}
          href="/categories"
          size="small"
          startIcon={<GridViewRoundedIcon fontSize="small" />}
          onClick={onClose}
          sx={{ fontWeight: 700, textTransform: "none" }}
        >
          Browse all
        </Button>
      </Stack>
      <List dense sx={{ py: 0, maxHeight: "42vh", overflow: "auto" }}>
        {items.length === 0 ? (
          <ListItemButton disabled>
            <ListItemText primary="No categories yet" secondary="Browse the shop" />
          </ListItemButton>
        ) : (
          items.map((node) => <CategoryTreeRow key={node.id} node={node} depth={0} onClose={onClose} />)
        )}
      </List>
      <Divider sx={{ my: 0.5 }} />
      <List dense>
        <ListItemButton component={Link} href="/faq" onClick={onClose}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <HelpOutlineIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText primary="Help & FAQ" />
        </ListItemButton>
        <ListItemButton component={Link} href="/contact" onClick={onClose}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <MailOutlineIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText primary="Contact us" />
        </ListItemButton>
        <ListItemButton component={Link} href="/vendor" onClick={onClose}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <StoreMallDirectoryOutlinedIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText primary="Become a vendor" />
        </ListItemButton>
      </List>
      <Divider sx={{ my: 0.5 }} />
      {user ? (
        <>
          <List dense>
            <ListItemButton
              onClick={() => {
                void (async () => {
                  await logout();
                  onClose();
                  setLoc("/");
                })();
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <LogoutOutlinedIcon fontSize="small" color="primary" />
              </ListItemIcon>
              <ListItemText primary="Log out" primaryTypographyProps={{ fontWeight: 600, fontSize: "0.9rem" }} />
            </ListItemButton>
          </List>
          <Divider sx={{ my: 0.5 }} />
        </>
      ) : null}
      <Box sx={{ px: 2, py: 1.25 }}>
        <Button fullWidth variant="outlined" onClick={onToggleLang}>
          {lang === "bn" ? "ইংরেজিতে দেখুন" : "বাংলায় দেখুন"}
        </Button>
      </Box>
    </Drawer>
  );
}
