import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
  Divider,
} from "@mui/material";
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  CheckCircle as GoodIcon,
} from "@mui/icons-material";
import { useAppStore } from "../../store/appStore";
import { QualityIssueLabels } from "../../types";

export default function ImageDetail() {
  const detailImageId = useAppStore((s) => s.detailImageId);
  const result = useAppStore((s) =>
    detailImageId ? s.results[detailImageId] : null
  );
  const config = useAppStore((s) => s.config);
  const image = useAppStore((s) =>
    detailImageId ? s.images.find((i) => i.id === detailImageId) : null
  );

  if (!detailImageId) return null;

  const tGood = config?.quality_threshold_good ?? 80;
  const tWarn = config?.quality_threshold_warn ?? 50;
  const scoreColor =
    (result?.overall_score ?? 0) >= tGood
      ? "success"
      : (result?.overall_score ?? 0) >= tWarn
        ? "warning"
        : "error";

  return (
    <Box
      sx={{
        width: 380,
        borderLeft: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        height: "100%",
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ p: 2.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
          <Typography variant="subtitle1" noWrap sx={{ fontWeight: 500 }}>
            {image?.filename ?? "详情"}
          </Typography>
          <Chip
            label={result ? `评分: ${result.overall_score}` : "未评估"}
            color={scoreColor}
            size="small"
            variant="filled"
          />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: "block" }}>
          {image ? `${image.width} x ${image.height} | ${(image.size_bytes / 1024).toFixed(0)} KB` : ""}
        </Typography>
      </Box>

      <Divider />

      {result ? (
        <Box sx={{ p: 2.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
            问题列表
          </Typography>
          {result.quality_issues.length > 0 ? (
            <List dense>
              {result.quality_issues.map((issue) => (
                <ListItem key={issue}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <ErrorIcon color="error" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={QualityIssueLabels[issue] ?? issue} />
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <GoodIcon color="success" fontSize="small" />
              <Typography variant="body2" color="success.main">
                未发现质量问题
              </Typography>
            </Box>
          )}

          {!result.is_portrait && (
            <Chip
              label="非人像"
              color="warning"
              size="small"
              icon={<WarningIcon />}
              sx={{ mt: 1.5 }}
            />
          )}

          {result.ai_comment && (
            <Box sx={{ mt: 2.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 500 }}>
                AI 评语
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                {result.ai_comment}
              </Typography>
            </Box>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
            评估时间: {new Date(result.assessed_at).toLocaleString()}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ p: 2.5 }}>
          <Typography variant="body2" color="text.secondary">
            尚未评估，请点击"开始评估"按钮。
          </Typography>
        </Box>
      )}
    </Box>
  );
}
