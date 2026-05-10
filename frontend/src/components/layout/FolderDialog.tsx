import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Button,
  Typography,
  IconButton,
  Box,
  Alert,
} from "@mui/material";
import {
  Folder as FolderIcon,
  ArrowUpward as UpIcon,
} from "@mui/icons-material";
import { useAppStore } from "../../store/appStore";
import { browseFolder, BACKEND_CONNECTION_ERROR } from "../../api/endpoints";
import type { FolderBrowseResult } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onFolderSelected: (path: string) => void;
}

export default function FolderDialog({ open, onClose, onFolderSelected }: Props) {
  const [path, setPath] = useState("");
  const [browse, setBrowse] = useState<FolderBrowseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const currentFolder = useAppStore((s) => s.currentFolder);

  useEffect(() => {
    if (open) {
      setError("");
      if (currentFolder) {
        loadFolder(currentFolder);
      } else {
        setPath(navigator.platform.includes("Win") ? "C:\\" : "/");
      }
    }
  }, [open, currentFolder]);

  const loadFolder = async (p: string) => {
    const trimmed = p.trim();
    if (!trimmed) {
      setError("请输入文件夹路径");
      return;
    }
    setPath(trimmed);
    setError("");
    setLoading(true);
    try {
      const result = await browseFolder(trimmed);
      setBrowse(result);
      if (!result.exists) {
        setError("目录不存在，请检查路径是否正确");
      }
    } catch {
      setBrowse(null);
      setError(BACKEND_CONNECTION_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = () => {
    loadFolder(path);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>选择文件夹</DialogTitle>
      <DialogContent sx={{ pt: 1.5 }}>
        <TextField
          fullWidth
          size="small"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleNavigate()}
          placeholder="输入文件夹路径..."
          margin="dense"
        />
        <Box sx={{ display: "flex", gap: 1, mt: 0.5, mb: 1 }}>
          <Button size="small" onClick={handleNavigate} disabled={loading} variant="outlined">
            {loading ? "加载中..." : "浏览"}
          </Button>

          {browse?.parent && (
            <IconButton
              size="small"
              title="上级目录"
              onClick={() => loadFolder(browse.parent!)}
            >
              <UpIcon />
            </IconButton>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 1, borderRadius: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {browse?.exists && (
          <List dense sx={{ maxHeight: 300, overflow: "auto", mt: 1 }}>
            {browse.subdirs.map((dir) => (
              <ListItemButton
                key={dir.path}
                onClick={() => loadFolder(dir.path)}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <FolderIcon fontSize="small" color={dir.has_images ? "primary" : "disabled"} />
                </ListItemIcon>
                <ListItemText
                  primary={dir.name}
                  secondary={dir.has_images ? "含图片" : ""}
                />
              </ListItemButton>
            ))}
            {browse.subdirs.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                此目录下没有子目录
              </Typography>
            )}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button
          variant="contained"
          onClick={() => {
            onFolderSelected(path);
            onClose();
          }}
          disabled={!browse?.exists}
        >
          选择此文件夹
        </Button>
      </DialogActions>
    </Dialog>
  );
}
