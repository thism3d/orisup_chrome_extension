import { useEffect, useMemo } from "react";
import { Box, Button, Container, Paper, Typography } from "@mui/material";
import { Link, useLocation } from "wouter";
import { useSearch } from "wouter/use-browser-location";
import { LoginForm } from "@/components/auth/LoginForm";
import { useAuth } from "@/hooks/useAuth";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { Seo } from "@/components/seo/Seo";
import { useSiteBrand } from "@/contexts/PublicSiteMetaContext";
import type { SessionUser } from "@/lib/types";

export function AdminLoginPage() {
  const brand = useSiteBrand();
  const { user, loading } = useAuth();
  const [, setLoc] = useLocation();
  const search = useSearch();
  const prefilledEmail = useMemo(() => {
    const q = search.startsWith("?") ? search.slice(1) : search;
    const e = new URLSearchParams(q).get("e")?.trim() ?? "";
    return e;
  }, [search]);

  useEffect(() => {
    if (!loading && user?.role === "platform_admin") {
      setLoc("/");
    }
  }, [loading, user, setLoc]);

  const handleLoginSuccess = async (_u: SessionUser) => {
    setLoc("/");
  };

  if (loading || (user && user.role === "platform_admin")) {
    return (
      <>
        <Seo title="Admin" description="Loading…" noindex canonicalPath="/admin/login" />
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "background.default",
          }}
        >
          <Typography color="text.secondary">Loading…</Typography>
        </Box>
      </>
    );
  }

  return (
    <>
      <Seo
        title="Admin sign-in"
        description={`Platform administrator access for ${brand}.`}
        noindex
        canonicalPath="/admin/login"
      />
    <FadeInSection>
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          py: 4,
          px: 2,
          background: "radial-gradient(ellipse 120% 80% at 50% -20%, rgba(198, 227, 0, 0.25), transparent 55%), #0b0d10",
        }}
      >
        <Container maxWidth="xs">
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
            }}
          >
            <Typography variant="overline" fontWeight={800} color="primary" sx={{ letterSpacing: 1 }}>
              {brand.toUpperCase()}
            </Typography>
            <Typography variant="h5" fontWeight={800} gutterBottom sx={{ letterSpacing: -0.4, mt: 0.5 }}>
              Admin sign-in
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Platform administrator access only. Customers should use the{" "}
              <Link href="~/login">store login</Link>.
            </Typography>
            <LoginForm
              onLoginSuccess={handleLoginSuccess}
              showRegisterLink={false}
              loginEndpoint="/api/auth/admin/login"
              defaultEmail={prefilledEmail}
            />
            <Button component={Link} href="~/" variant="text" fullWidth sx={{ mt: 2, fontWeight: 600 }}>
              ← Back to store
            </Button>
          </Paper>
        </Container>
      </Box>
    </FadeInSection>
    </>
  );
}
