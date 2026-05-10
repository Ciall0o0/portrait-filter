import { type ReactElement } from "react";
import { Chip } from "@mui/material";
import { CheckCircle, Warning, Error } from "@mui/icons-material";

interface Props {
  score: number;
  thresholdGood?: number;
  thresholdWarn?: number;
}

export default function QualityBadge({ score, thresholdGood = 80, thresholdWarn = 50 }: Props) {
  const iconProps: { icon: ReactElement; color: "success" | "warning" | "error" } =
    score >= thresholdGood
      ? { icon: <CheckCircle />, color: "success" }
      : score >= thresholdWarn
        ? { icon: <Warning />, color: "warning" }
        : { icon: <Error />, color: "error" };

  return (
    <Chip
      {...iconProps}
      label={`${score}`}
      size="small"
      variant="filled"
      sx={{
        borderRadius: 8,
        fontWeight: 600,
        height: 24,
        minWidth: 36,
      }}
    />
  );
}
