import { Link } from "wouter";
import { Box } from "@mui/material";
import { usePublicSiteMeta, useSiteBrand } from "@/contexts/PublicSiteMetaContext";
import { mediaAbsoluteUrl } from "@/lib/site";
import { resizedImg } from "@/lib/responsiveImg";

type Props = {
  /** Invert logo on small screens (e.g. Norexbd dark mobile header). */
  onDarkMobile?: boolean;
};

export function LogoLink({ onDarkMobile }: Props) {
  const meta = usePublicSiteMeta();
  const brand = useSiteBrand();
  const rawSrc = mediaAbsoluteUrl(meta?.logo_url?.trim()) ?? "/orlenbd-logo.png";
  // Logo renders ~80x32 above the fold — request a small variant for /uploads logos.
  const src = resizedImg(rawSrc, 192);

  return (
    <Link href="/">
      <Box
        component="img"
        src={src}
        alt={brand}
        width={80}
        height={32}
        decoding="async"
        fetchPriority="high"
        sx={{
          height: { xs: 32, sm: 38 },
          width: "auto",
          cursor: "pointer",
          display: "block",
          transition: "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), filter 0.25s ease",
          ...(onDarkMobile
            ? {
                filter: { xs: "brightness(0) invert(1)", md: "none" },
                "&:hover": {
                  transform: "scale(1.04)",
                  filter: { xs: "brightness(0) invert(1) brightness(1.08)", md: "brightness(1.05)" },
                },
              }
            : {
                "&:hover": {
                  transform: "scale(1.04)",
                  filter: "brightness(1.05)",
                },
              }),
          "&:active": { transform: "scale(0.98)" },
        }}
      />
    </Link>
  );
}
