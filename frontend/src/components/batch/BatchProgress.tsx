import { Box, LinearProgress, Typography, Button } from "@mui/material";
import { useAppStore } from "../../store/appStore";

interface Props {
  onCancel: () => void;
}

export default function BatchProgress({ onCancel }: Props) {
  const batchStatus = useAppStore((s) => s.batchStatus);

  if (!batchStatus || batchStatus.status === "pending") return null;

  const isDone = batchStatus.status === "completed";

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1400,
        bgcolor: "background.paper",
        border: 1,
        borderColor: "divider",
        borderRadius: 3,
        boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
        px: 3,
        py: 2,
        minWidth: 400,
        maxWidth: "90vw",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {isDone
            ? `评估完成: ${batchStatus.completed} 张图片`
            : `评估中: ${batchStatus.completed} / ${batchStatus.total}`}
        </Typography>
        {!isDone && (
          <Button size="small" onClick={onCancel} color="inherit" sx={{ borderRadius: 16 }}>
            取消
          </Button>
        )}
        {isDone && (
          <Button
            size="small"
            onClick={() => useAppStore.getState().setBatchStatus(null)}
            color="primary"
            variant="text"
            sx={{ borderRadius: 16 }}
          >
            关闭
          </Button>
        )}
      </Box>
      <LinearProgress
        variant={isDone ? "determinate" : "indeterminate"}
        value={isDone ? 100 : undefined}
        color={isDone ? "success" : "primary"}
        sx={{ height: 4, borderRadius: 2 }}
      />
    </Box>
  );
}
