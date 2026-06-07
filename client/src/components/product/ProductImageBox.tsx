import { Box } from "@mui/material";

type Props = { src?: string; ratio?: string };

export function ProductImageBox({ src, ratio = "100%" }: Props) {
  return (
    <Box
      sx={{
        pt: ratio,
        borderRadius: 2,
        bgcolor: "#f5f5f5",
        backgroundImage: src ? `url(${src})` : undefined,
        backgroundSize: "contain",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}
