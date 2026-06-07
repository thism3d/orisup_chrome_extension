import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
  Collapse,
} from "@mui/material";
import { Link } from "wouter";
import { useState } from "react";
import type { Category } from "@/lib/types";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { CategoryNavIcon } from "@/lib/categoryIcons";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";

type Props = { categories: Category[] };

export function CategorySidebarNav({ categories }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const { text } = useStorefrontLanguage();

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
        height: "100%",
        minHeight: { xs: "auto", md: 380 },
        transition: "box-shadow 0.25s ease",
        "&:hover": { boxShadow: "0 12px 40px rgba(11,11,11,0.08)" },
      }}
    >
      <Box sx={{ bgcolor: "brand.main", px: 2, py: 1.35 }}>
        <Typography fontWeight={800} sx={{ color: "brand.contrastText", letterSpacing: "0.02em" }}>
          {text("Browse categories", "ক্যাটাগরি ব্রাউজ করুন")}
        </Typography>
      </Box>
      <List disablePadding dense sx={{ py: 0.5 }}>
        {categories.map((c) => {
          const isOpen = open === c.id;
          return (
            <Box
              key={c.id}
              onMouseEnter={() => setOpen(c.id)}
              onMouseLeave={() => setOpen(null)}
            >
              <ListItemButton
                component={Link}
                href={`/c/${c.slug}`}
                sx={{
                  py: 1.1,
                  transition: "background 0.18s ease, padding-left 0.18s ease",
                  "&:hover": {
                    bgcolor: "action.hover",
                    pl: 2.25,
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <CategoryNavIcon category={c} fontSize={22} />
                </ListItemIcon>
                <ListItemText
                  primary={c.name}
                  primaryTypographyProps={{ fontWeight: 600, fontSize: "0.9rem", color: "text.primary" }}
                />
                <ChevronRightIcon sx={{ fontSize: 18, color: "text.disabled", transition: "transform 0.2s ease" }} />
              </ListItemButton>
              <Collapse in={isOpen} timeout="auto" unmountOnExit>
                <Box
                  component={Link}
                  href={`/c/${c.slug}`}
                  sx={{ display: "block", pl: 4, pr: 2, pb: 1, textDecoration: "none" }}
                >
                  <Typography variant="caption" color="primary" fontWeight={700}>
                    View all in {c.name} →
                  </Typography>
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </List>
      {categories.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          No categories yet. Add categories in admin or <Link href="/shop">browse the shop</Link>.
        </Typography>
      )}
    </Paper>
  );
}
