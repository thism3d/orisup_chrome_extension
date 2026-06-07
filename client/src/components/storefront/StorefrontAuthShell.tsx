import type { ReactNode } from "react";
import { Box, Container, Paper, Typography } from "@mui/material";
import { useStorefrontLayoutTemplate } from "@/contexts/StorefrontUiTemplateContext";
import { storefrontRetailTitleSx } from "@/lib/storefrontUiSurface";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: false | "xs" | "sm" | "md";
};

/** Login / register shell — layout and chrome differ per storefront template. */
export function StorefrontAuthShell({ title, subtitle, children, maxWidth = "xs" }: Props) {
  const t = useStorefrontLayoutTemplate();

  if (t === "norexbd") {
    return (
      <Container maxWidth={maxWidth} sx={{ py: { xs: 4, md: 5 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Typography variant="h5" component="h1" gutterBottom sx={storefrontRetailTitleSx(t)}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.65 }}>
              {subtitle}
            </Typography>
          ) : null}
          {children}
        </Paper>
      </Container>
    );
  }

  if (t === "orynbd") {
    return (
      <Container maxWidth={maxWidth === "xs" ? "sm" : maxWidth} sx={{ py: { xs: 4, md: 6 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 4,
            border: "1px solid",
            borderColor: "divider",
            background: (th) =>
              `linear-gradient(165deg, ${th.palette.grey[50]} 0%, ${th.palette.background.paper} 45%)`,
            boxShadow: "0 24px 64px rgba(11,11,11,0.1)",
            position: "relative",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              width: 4,
              height: "100%",
              bgcolor: "brand.main",
              borderRadius: "4px 0 0 4px",
            },
          }}
        >
          <Box sx={{ pl: { xs: 0, sm: 0.5 } }}>
            <Typography variant="h4" component="h1" gutterBottom sx={storefrontRetailTitleSx(t)}>
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.7, maxWidth: 420 }}>
                {subtitle}
              </Typography>
            ) : null}
            {children}
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth={maxWidth} sx={{ py: 4 }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          border: "1px solid #ECECEC",
          boxShadow: "0 20px 56px rgba(11,11,11,0.08)",
        }}
      >
        <Typography variant="h5" component="h1" gutterBottom sx={storefrontRetailTitleSx(t)}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {subtitle}
          </Typography>
        ) : null}
        {children}
      </Paper>
    </Container>
  );
}
