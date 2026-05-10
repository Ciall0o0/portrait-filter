import {
  Toolbar,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  Slider,
  Typography,
  Box,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  SelectAll as SelectAllIcon,
  Deselect as DeselectIcon,
} from "@mui/icons-material";
import { useAppStore } from "../../store/appStore";

interface Props {
  onAssess: () => void;
  onDeleteSelected: () => void;
}

export default function GalleryToolbar({ onAssess, onDeleteSelected }: Props) {
  const filterPortraitOnly = useAppStore((s) => s.filterPortraitOnly);
  const setFilterPortraitOnly = useAppStore((s) => s.setFilterPortraitOnly);
  const filterMinScore = useAppStore((s) => s.filterMinScore);
  const setFilterMinScore = useAppStore((s) => s.setFilterMinScore);
  const selectedIds = useAppStore((s) => s.selectedIds);
  const selectAll = useAppStore((s) => s.selectAll);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const images = useAppStore((s) => s.images);
  const batchStatus = useAppStore((s) => s.batchStatus);

  const isRunning = batchStatus?.status === "running";
  const selectedCount = selectedIds.size;

  return (
    <Toolbar
      variant="dense"
      sx={{
        gap: 1.5,
        borderBottom: 1,
        borderColor: "divider",
        px: 2,
        bgcolor: "background.paper",
        minHeight: 48,
      }}
    >
      <ToggleButtonGroup
        size="small"
        value={filterPortraitOnly ? "portrait" : "all"}
        exclusive
        onChange={(_, v) => v && setFilterPortraitOnly(v === "portrait")}
        sx={{
          "& .MuiToggleButton-root": {
            borderRadius: 20,
            px: 2,
            py: 0.5,
          },
        }}
      >
        <ToggleButton value="all">全部</ToggleButton>
        <ToggleButton value="portrait">仅人像</ToggleButton>
      </ToggleButtonGroup>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: 180 }}>
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
          最低评分
        </Typography>
        <Slider
          size="small"
          value={filterMinScore}
          onChange={(_, v) => setFilterMinScore(v as number)}
          min={0}
          max={100}
          step={5}
          valueLabelDisplay="auto"
        />
      </Box>

      <Button
        size="small"
        startIcon={<SelectAllIcon />}
        onClick={selectAll}
        disabled={images.length === 0}
        variant="text"
      >
        全选
      </Button>
      <Button
        size="small"
        startIcon={<DeselectIcon />}
        onClick={clearSelection}
        disabled={selectedCount === 0}
        variant="text"
      >
        取消
      </Button>

      <Box sx={{ flex: 1 }} />

      <Button
        variant="contained"
        color="primary"
        startIcon={<PlayIcon />}
        onClick={onAssess}
        disabled={isRunning || images.length === 0}
        size="small"
      >
        {isRunning ? "评估中..." : "开始评估"}
      </Button>

      <Button
        variant="contained"
        color="error"
        startIcon={<DeleteIcon />}
        onClick={onDeleteSelected}
        disabled={selectedCount === 0}
        size="small"
      >
        删除所选 ({selectedCount})
      </Button>
    </Toolbar>
  );
}
