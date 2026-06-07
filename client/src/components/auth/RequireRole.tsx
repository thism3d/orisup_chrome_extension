import { Box, CircularProgress, Container, Typography } from "@mui/material";
import { useLayoutEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";

type Props = {
  roles: string[];
  children: React.ReactNode;
  /** When set, unauthenticated users are sent here (SPA navigation). */
  redirectIfUnauthenticated?: string;
};

export function RequireRole({ roles, children, redirectIfUnauthenticated }: Props) {
  const { user, loading } = useAuth();
  const [, setLoc] = useLocation();

  useLayoutEffect(() => {
    if (!loading && !user && redirectIfUnauthenticated) {
      setLoc(redirectIfUnauthenticated);
    }
  }, [loading, user, redirectIfUnauthenticated, setLoc]);

  if (loading) {
    return (
      <Container sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }
  if (!user) {
    if (redirectIfUnauthenticated) {
      return (
        <Box sx={{ minHeight: "40vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      );
    }
    return (
      <Container sx={{ py: 4 }}>
        <Typography gutterBottom>Please login.</Typography>
        <Link href="/login">Go to login</Link>
      </Container>
    );
  }
  if (!roles.includes(user.role)) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography color="error">You do not have access to this area.</Typography>
      </Container>
    );
  }
  return <>{children}</>;
}
