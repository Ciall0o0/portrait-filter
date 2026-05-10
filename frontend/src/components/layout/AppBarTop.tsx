import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
} from "@mui/material";
import {
  FolderOpen as FolderOpenIcon,
  Settings as SettingsIcon,
  FileDownload as ExportIcon,
} from "@mui/icons-material";
import { useAppStore } from "../../store/appStore";

interface Props {
  onOpenFolder: () => void;
  onOpenSettings: () => void;
  onOpenExport: () => void;
}

export default function AppBarTop({ onOpenFolder, onOpenSettings, onOpenExport }: Props) {
  const currentFolder = useAppStore((s) => s.currentFolder);

  return (
    <AppBar position="static" elevation={0} sx={{ bgcolor: "background.paper" }}>
      <Toolbar sx={{ gap: 1, minHeight: 56 }}>
        <Typography variant="h6" sx={{ fontWeight: 500, mr: 2, letterSpacing: 0 }}>
          Portrait Filter
        </Typography>

        <Button
          variant="outlined"
          color="inherit"
          startIcon={<FolderOpenIcon />}
          onClick={onOpenFolder}
          size="small"
          sx={{ borderRadius: 20 }}
        >
          {currentFolder
            ? currentFolder.split(/[/\\]/).pop() || currentFolder
            : "打开文件夹"}
        </Button>

        {currentFolder && (
          <Typography variant="body2" sx={{ color: "text.secondary", ml: 1, flex: 1 }} noWrap>
            {currentFolder}
          </Typography>
        )}

        <Box sx={{ flex: 1 }} />

        <IconButton color="inherit" onClick={onOpenExport} title="导出报告" sx={{ borderRadius: 2 }}>
          <ExportIcon />
        </IconButton>
        <IconButton color="inherit" onClick={onOpenSettings} title="设置" sx={{ borderRadius: 2 }}>
          <SettingsIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
