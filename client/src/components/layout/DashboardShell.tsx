import { Box, Container, Tab, Tabs, Typography } from "@mui/material";
import { Link, useLocation } from "wouter";

export type DashTab = { label: string; href: string };

type Props = { title: string; tabs: DashTab[]; children: React.ReactNode };

export function DashboardShell({ title, tabs, children }: Props) {
  const [path] = useLocation();
  const value = tabs.findIndex((t) => path === t.href || path.startsWith(t.href + "/"));

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      <Tabs value={value < 0 ? 0 : value} sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        {tabs.map((t) => (
          <Tab key={t.href} label={t.label} component={Link} href={t.href} />
        ))}
      </Tabs>
      <Box>{children}</Box>
    </Container>
  );
}
