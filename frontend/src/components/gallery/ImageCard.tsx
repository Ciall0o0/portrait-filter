import { useState, useEffect } from "react";
import {
  Card,
  CardMedia,
  CardContent,
  Typography,
  Checkbox,
  Box,
  Skeleton,
} from "@mui/material";
import { useAppStore } from "../../store/appStore";
import { getThumbnail } from "../../api/endpoints";
import type { ImageInfo } from "../../types";
import QualityBadge from "./QualityBadge";

interface Props {
  image: ImageInfo;
  onClick: () => void;
}

export default function ImageCard({ image, onClick }: Props) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const selectedIds = useAppStore((s) => s.selectedIds);
  const toggleSelect = useAppStore((s) => s.toggleSelect);
  const result = useAppStore((s) => s.results[image.id]);
  const config = useAppStore((s) => s.config);

  const isSelected = selectedIds.has(image.id);

  useEffect(() => {
    let cancelled = false;
    getThumbnail(image.id, image.path)
      .then((res) => {
        if (!cancelled) {
          setThumbnail(res.data_uri);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [image.id, image.path]);

  return (
    <Card
      sx={{
        position: "relative",
        cursor: "pointer",
        border: isSelected ? 2 : 1,
        borderColor: isSelected ? "primary.main" : "divider",
        borderRadius: 3,
        overflow: "hidden",
        transition: "border-color 200ms ease, box-shadow 200ms ease",
        "&:hover": {
          borderColor: isSelected ? "primary.main" : "grey.600",
          boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
        },
      }}
      onClick={onClick}
    >
      <Checkbox
        checked={isSelected}
        onClick={(e) => {
          e.stopPropagation();
          toggleSelect(image.id);
        }}
        sx={{
          position: "absolute",
          top: 2,
          left: 2,
          zIndex: 2,
          bgcolor: "rgba(0,0,0,0.5)",
          borderRadius: "8px",
          color: "white",
          "&.Mui-checked": { color: "primary.main" },
        }}
      />

      {result && (
        <Box sx={{ position: "absolute", top: 6, right: 6, zIndex: 2 }}>
          <QualityBadge
            score={result.overall_score}
            thresholdGood={config?.quality_threshold_good ?? 80}
            thresholdWarn={config?.quality_threshold_warn ?? 50}
          />
        </Box>
      )}

      {loading ? (
        <Skeleton variant="rectangular" height={200} />
      ) : thumbnail ? (
        <CardMedia
          component="img"
          height="200"
          image={thumbnail}
          alt={image.filename}
          sx={{ objectFit: "cover" }}
        />
      ) : (
        <Box
          sx={{
            height: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "grey.800",
            color: "grey.500",
          }}
        >
          <Typography variant="body2">加载失败</Typography>
        </Box>
      )}

      <CardContent sx={{ py: 1, px: 1.5 }}>
        <Typography variant="caption" noWrap title={image.filename} sx={{ fontWeight: 500, display: "block" }}>
          {image.filename}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
          {image.width} x {image.height}
        </Typography>
        {result && !result.is_portrait && (
          <Typography variant="caption" color="warning.main" sx={{ display: "block", mt: 0.25 }}>
            非人像
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
