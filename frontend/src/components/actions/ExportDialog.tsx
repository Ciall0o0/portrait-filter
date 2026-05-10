import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
} from "@mui/material";
import { useAppStore } from "../../store/appStore";
import { exportReport } from "../../api/endpoints";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ExportDialog({ open, onClose }: Props) {
  const currentFolder = useAppStore((s) => s.currentFolder);
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!currentFolder) return;
    setExporting(true);
    try {
      const result = await exportReport(currentFolder, format);
      const blob = new Blob([result.data], {
        type: format === "csv" ? "text/csv" : "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>导出报告</DialogTitle>
      <DialogContent sx={{ pt: 1.5 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          导出当前文件夹的评估结果
        </Typography>
        <FormControl component="fieldset" sx={{ mt: 1 }}>
          <RadioGroup value={format} onChange={(e) => setFormat(e.target.value as "csv" | "json")}>
            <FormControlLabel value="csv" control={<Radio />} label="CSV (Excel 兼容)" />
            <FormControlLabel value="json" control={<Radio />} label="JSON" />
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleExport} disabled={exporting || !currentFolder}>
          {exporting ? "导出中..." : "导出"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
