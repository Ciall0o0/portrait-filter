import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  Slider,
  Typography,
  Button,
  Box,
  FormControl,
  InputLabel,
  Alert,
} from "@mui/material";
import { getConfig, updateConfig } from "../../api/endpoints";
import { useAppStore } from "../../store/appStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ConfigDialog({ open, onClose }: Props) {
  const setConfig = useAppStore((s) => s.setConfig);
  const config = useAppStore((s) => s.config);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [model, setModel] = useState("gpt-4o-mini");
  const [batchSize, setBatchSize] = useState(5);
  const [thresholdGood, setThresholdGood] = useState(80);
  const [thresholdWarn, setThresholdWarn] = useState(50);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (open) {
      getConfig().then((c) => {
        setBaseUrl(c.openai_base_url);
        setModel(c.openai_model);
        setBatchSize(c.batch_size);
        setThresholdGood(c.quality_threshold_good);
        setThresholdWarn(c.quality_threshold_warn);
        setConfig(c);
      });
    }
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, [open, setConfig]);

  const handleSave = async () => {
    try {
      await updateConfig({
        openai_api_key: apiKey || undefined,
        openai_base_url: baseUrl,
        openai_model: model,
        batch_size: batchSize,
        quality_threshold_good: thresholdGood,
        quality_threshold_warn: thresholdWarn,
      });
      setSaved(true);
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
    } catch {
      // Config save failure is non-critical
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>设置</DialogTitle>
      <DialogContent sx={{ pt: 1.5 }}>
        {saved && <Alert severity="success" sx={{ mb: 2 }}>设置已保存</Alert>}

        <TextField
          label="API Key"
          type="password"
          fullWidth
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={config?.has_api_key ? "已设置 (留空不变)" : "请输入 API Key"}
          margin="normal"
          size="small"
        />

        <TextField
          label="API Base URL"
          fullWidth
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          margin="normal"
          size="small"
          helperText="支持任何兼容 OpenAI Chat Completions 的 API"
        />

        <FormControl fullWidth margin="normal" size="small">
          <InputLabel>模型</InputLabel>
          <Select value={model} label="模型" onChange={(e) => setModel(e.target.value)}>
            <MenuItem value="gpt-4o-mini">gpt-4o-mini (推荐，成本低)</MenuItem>
            <MenuItem value="gpt-4o">gpt-4o (高精度)</MenuItem>
            <MenuItem value="Qwen/QVQ-72B-Preview">Qwen/QVQ-72B (通义千问视觉)</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ mt: 2 }}>
          <Typography gutterBottom>并发批处理数量: {batchSize}</Typography>
          <Slider
            value={batchSize}
            onChange={(_, v) => setBatchSize(v as number)}
            min={1}
            max={20}
            step={1}
            valueLabelDisplay="auto"
          />
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography gutterBottom>优质阈值: {thresholdGood}</Typography>
          <Slider
            value={thresholdGood}
            onChange={(_, v) => setThresholdGood(v as number)}
            min={60}
            max={95}
            step={5}
            valueLabelDisplay="auto"
          />
          <Typography variant="caption" color="text.secondary">
            评分 &ge; 此值为绿色(优质)
          </Typography>
        </Box>

        <Box sx={{ mt: 1 }}>
          <Typography gutterBottom>警告阈值: {thresholdWarn}</Typography>
          <Slider
            value={thresholdWarn}
            onChange={(_, v) => setThresholdWarn(v as number)}
            min={30}
            max={75}
            step={5}
            valueLabelDisplay="auto"
          />
          <Typography variant="caption" color="text.secondary">
            评分 &ge; 此值为黄色(一般)，低于此值为红色(低质)
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSave}>保存</Button>
      </DialogActions>
    </Dialog>
  );
}
