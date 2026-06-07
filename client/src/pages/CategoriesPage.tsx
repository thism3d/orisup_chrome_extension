import {
  Avatar,
  Box,
  Container,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import { Link, useLocation } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { Seo } from "@/components/seo/Seo";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";
import { useCategoryTree } from "@/hooks/useCategoryTree";
import { mediaAbsoluteUrl } from "@/lib/site";
import type { CategoryNode } from "@/lib/types";
import { CategoryNavIcon } from "@/lib/categoryIcons";
import { categoryPreviewUrl } from "@/lib/categoryPreviewImages";

function railImg(node: CategoryNode): string | null {
  if (node.imageUrl) return mediaAbsoluteUrl(node.imageUrl) ?? node.imageUrl;
  return null;
}

function tileImg(node: CategoryNode): string | null {
  if (node.imageUrl) return mediaAbsoluteUrl(node.imageUrl) ?? node.imageUrl;
  return categoryPreviewUrl(node.slug);
}

function RootRailItem({
  node,
  active,
  onSelect,
}: {
  node: CategoryNode;
  active: boolean;
  onSelect: () => void;
}) {
  const img = railImg(node);
  return (
    <Stack
      onClick={onSelect}
      role="button"
      aria-pressed={active}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      alignItems="center"
      spacing={0.5}
      sx={{
        py: 1.25,
        px: 0.75,
        borderRight: "3px solid",
        borderColor: active ? "primary.main" : "transparent",
        bgcolor: active ? "action.selected" : "transparent",
        cursor: "pointer",
        transition: "background 0.18s ease, border-color 0.18s ease",
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Avatar
        src={img ?? undefined}
        variant="rounded"
        sx={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          bgcolor: img ? "transparent" : "action.hover",
          border: active ? "2px solid" : "1px solid",
          borderColor: active ? "primary.main" : "divider",
        }}
      >
        {!img ? <CategoryNavIcon category={node} fontSize={28} /> : null}
      </Avatar>
      <Typography
        variant="caption"
        align="center"
        sx={{
          fontWeight: active ? 800 : 600,
          color: active ? "primary.main" : "text.primary",
          lineHeight: 1.15,
          maxWidth: 78,
        }}
      >
        {node.name}
      </Typography>
    </Stack>
  );
}

function LeafTile({ node }: { node: CategoryNode }) {
  const img = tileImg(node);
  return (
    <Stack
      component={Link}
      href={`/c/${node.slug}`}
      alignItems="center"
      spacing={0.75}
      sx={{
        textDecoration: "none",
        color: "text.primary",
        py: 1,
      }}
    >
      <Avatar
        src={img ?? undefined}
        variant="rounded"
        sx={{
          width: 64,
          height: 64,
          bgcolor: img ? "transparent" : "action.hover",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        {!img ? <CategoryRoundedIcon /> : null}
      </Avatar>
      <Typography
        variant="caption"
        align="center"
        sx={{ fontWeight: 600, lineHeight: 1.15, maxWidth: 96 }}
      >
        {node.name}
      </Typography>
    </Stack>
  );
}

function SubSection({ sub }: { sub: CategoryNode }) {
  const leaves = sub.children;
  return (
    <Stack spacing={1} sx={{ py: 1.5 }}>
      <Stack
        component={Link}
        href={`/c/${sub.slug}`}
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ textDecoration: "none", color: "text.primary" }}
      >
        <Typography variant="subtitle1" fontWeight={800}>
          {sub.name}
        </Typography>
      </Stack>
      {leaves.length === 0 ? (
        <Stack
          component={Link}
          href={`/c/${sub.slug}`}
          direction="row"
          alignItems="center"
          spacing={1.25}
          sx={{ textDecoration: "none", color: "text.secondary", py: 1 }}
        >
          <Avatar
            src={tileImg(sub) ?? undefined}
            variant="rounded"
            sx={{ width: 48, height: 48, bgcolor: "action.hover" }}
          >
            {!sub.imageUrl ? <CategoryRoundedIcon /> : null}
          </Avatar>
          <Typography variant="body2" fontWeight={600}>
            View all in {sub.name}
          </Typography>
        </Stack>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 1,
          }}
        >
          {leaves.map((leaf) => (
            <LeafTile key={leaf.id} node={leaf} />
          ))}
        </Box>
      )}
    </Stack>
  );
}

export function CategoriesPage() {
  const { text } = useStorefrontLanguage();
  const [location] = useLocation();
  const treeQ = useCategoryTree();
  const tree = useMemo(() => treeQ.data ?? [], [treeQ.data]);
  const [activeRootId, setActiveRootId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeRootId && tree[0]) setActiveRootId(tree[0].id);
    if (activeRootId && tree.length && !tree.some((t) => t.id === activeRootId)) {
      setActiveRootId(tree[0]?.id ?? null);
    }
  }, [tree, activeRootId, location]);

  const activeRoot = useMemo(() => tree.find((t) => t.id === activeRootId) ?? tree[0] ?? null, [tree, activeRootId]);

  return (
    <>
      <Seo
        title={text("Browse all categories", "সব ক্যাটাগরি দেখুন")}
        description={text(
          "Explore the full Orlenbd category tree — from electronics and fashion to groceries and home essentials.",
          "ইলেকট্রনিক্স, ফ্যাশন, গ্রোসারি, হোম এসেনশিয়ালস — সব ক্যাটাগরি ব্রাউজ করুন।",
        )}
        canonicalPath="/categories"
      />
      <Container maxWidth="lg" disableGutters sx={{ px: { xs: 0, md: 2 }, py: { xs: 0, md: 2 } }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ px: 2, py: 1.5, borderBottom: { xs: "1px solid", md: "none" }, borderColor: "divider" }}
        >
          <Typography variant="h6" fontWeight={800}>
            {text("Categories", "ক্যাটাগরি")}
          </Typography>
        </Stack>

        {treeQ.isLoading ? (
          <Stack direction="row" sx={{ minHeight: 480 }}>
            <Box sx={{ width: 110, p: 1 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} variant="circular" width={56} height={56} sx={{ mx: "auto", mb: 2 }} />
              ))}
            </Box>
            <Box sx={{ flex: 1, p: 2 }}>
              <Skeleton variant="rectangular" height={32} sx={{ mb: 2, borderRadius: 1 }} />
              <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
            </Box>
          </Stack>
        ) : tree.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              {text("No categories yet.", "এখনও কোনো ক্যাটাগরি নেই।")}
            </Typography>
          </Box>
        ) : (
          <Stack direction="row" sx={{ minHeight: { xs: "calc(100vh - 200px)", md: 600 }, alignItems: "stretch" }}>
            <Box
              sx={{
                width: { xs: 110, sm: 130 },
                flexShrink: 0,
                bgcolor: "background.paper",
                borderRight: "1px solid",
                borderColor: "divider",
                overflowY: "auto",
                position: "sticky",
                top: 0,
                maxHeight: { xs: "calc(100vh - 180px)", md: 700 },
              }}
            >
              {tree.map((root) => (
                <RootRailItem
                  key={root.id}
                  node={root}
                  active={root.id === activeRoot?.id}
                  onSelect={() => setActiveRootId(root.id)}
                />
              ))}
            </Box>

            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                px: { xs: 1.5, md: 3 },
                py: { xs: 1, md: 2 },
                overflowY: "auto",
                maxHeight: { xs: "calc(100vh - 180px)", md: 700 },
              }}
            >
              {activeRoot ? (
                activeRoot.children.length === 0 ? (
                  <Stack
                    component={Link}
                    href={`/c/${activeRoot.slug}`}
                    alignItems="center"
                    justifyContent="center"
                    spacing={1}
                    sx={{
                      textDecoration: "none",
                      color: "text.primary",
                      py: 6,
                    }}
                  >
                    <Avatar
                      src={tileImg(activeRoot) ?? undefined}
                      variant="rounded"
                      sx={{ width: 96, height: 96, bgcolor: "action.hover" }}
                    >
                      {!activeRoot.imageUrl ? <CategoryRoundedIcon fontSize="large" /> : null}
                    </Avatar>
                    <Typography fontWeight={800}>{activeRoot.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {text("Browse all products", "সব পণ্য দেখুন")}
                    </Typography>
                  </Stack>
                ) : (
                  <Stack divider={<Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />}>
                    {activeRoot.children.map((sub) => (
                      <SubSection key={sub.id} sub={sub} />
                    ))}
                  </Stack>
                )
              ) : null}
            </Box>
          </Stack>
        )}
      </Container>
    </>
  );
}
