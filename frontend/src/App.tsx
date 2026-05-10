import { useState, useCallback, useMemo, useEffect } from "react";
import { ThemeProvider, CssBaseline, Box, Typography, Alert } from "@mui/material";
import theme from "./theme";
import { useAppStore } from "./store/appStore";
import { listImages, getConfig } from "./api/endpoints";
import { useAssessment } from "./hooks/useAssessment";

import AppBarTop from "./components/layout/AppBarTop";
import FolderDialog from "./components/layout/FolderDialog";
import GalleryToolbar from "./components/gallery/GalleryToolbar";
import ImageCard from "./components/gallery/ImageCard";
import ImageDetail from "./components/detail/ImageDetail";
import BatchProgress from "./components/batch/BatchProgress";
import ConfigDialog from "./components/actions/ConfigDialog";
import DeleteDialog from "./components/actions/DeleteDialog";
import ExportDialog from "./components/actions/ExportDialog";
import UndoSnackbar from "./components/actions/UndoSnackbar";

export default function App() {
  const [folderOpen, setFolderOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [backendOk, setBackendOk] = useState<boolean | null>(null); // null = checking

  const currentFolder = useAppStore((s) => s.currentFolder);
  const setCurrentFolder = useAppStore((s) => s.setCurrentFolder);
  const images = useAppStore((s) => s.images);
  const setImages = useAppStore((s) => s.setImages);
  const results = useAppStore((s) => s.results);
  const filterPortraitOnly = useAppStore((s) => s.filterPortraitOnly);
  const filterMinScore = useAppStore((s) => s.filterMinScore);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const detailImageId = useAppStore((s) => s.detailImageId);
  const setDetailImageId = useAppStore((s) => s.setDetailImageId);
  const setLastUndoOpId = useAppStore((s) => s.setLastUndoOpId);

  const { cancelAssessment, runAssessment } = useAssessment();

  useEffect(() => {
    getConfig()
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false));
  }, []);

  const handleFolderSelected = useCallback(
    async (path: string) => {
      setCurrentFolder(path);
      try {
        const res = await listImages(path, 1, 500);
        setImages(res.images || []);
      } catch {
        setImages([]);
      }
    },
    [setCurrentFolder, setImages]
  );

  const handleAssess = useCallback(async () => {
    if (!currentFolder) return;
    const paths = images.map((i) => i.path);
    await runAssessment(paths);
  }, [currentFolder, images, runAssessment]);

  const handleDeleted = useCallback(
    (opId: string, deletedPaths: string[]) => {
      setDeleteOpen(false);
      clearSelection();
      setLastUndoOpId(opId);
      const deletedSet = new Set(deletedPaths);
      setImages(images.filter((img) => !deletedSet.has(img.path)));
    },
    [clearSelection, images, setImages, setLastUndoOpId]
  );

  const filteredImages = useMemo(() => {
    return images.filter((img) => {
      const result = results[img.id];
      if (filterPortraitOnly && result && !result.is_portrait) return false;
      if (result && result.overall_score < filterMinScore) return false;
      return true;
    });
  }, [images, results, filterPortraitOnly, filterMinScore]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
          <AppBarTop
            onOpenFolder={() => setFolderOpen(true)}
            onOpenSettings={() => setConfigOpen(true)}
            onOpenExport={() => setExportOpen(true)}
          />

          {backendOk === false && (
            <Alert severity="error" sx={{ mx: 2, mt: 1, borderRadius: 3 }}>
              无法连接到后端服务 — 请确认后端已在端口 18903 启动
            </Alert>
          )}

          {currentFolder && (
            <GalleryToolbar
              onAssess={handleAssess}
              onDeleteSelected={() => setDeleteOpen(true)}
            />
          )}

          <Box sx={{ flex: 1, display: "flex", overflow: "hidden" }}>
            <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
              {!currentFolder ? (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      bgcolor: "rgba(199, 167, 255, 0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mb: 1,
                    }}
                  >
                    <Typography sx={{ fontSize: "2rem", color: "primary.main" }}>
                      &#127917;
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ color: "text.primary", fontWeight: 400 }}>
                    人像摄影批量筛选
                  </Typography>
                  <Typography variant="body1" sx={{ color: "text.secondary" }}>
                    点击"打开文件夹"开始
                  </Typography>
                </Box>
              ) : filteredImages.length === 0 ? (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    flexDirection: "column",
                    gap: 1.5,
                  }}
                >
                  <Typography variant="body1" sx={{ color: "text.secondary" }}>
                    此文件夹中没有图像文件
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: 2,
                  }}
                >
                  {filteredImages.map((img) => (
                    <ImageCard
                      key={img.id}
                      image={img}
                      onClick={() => setDetailImageId(img.id)}
                    />
                  ))}
                </Box>
              )}
            </Box>

            {detailImageId && <ImageDetail />}
          </Box>

          <BatchProgress onCancel={cancelAssessment} />
        </Box>

        <FolderDialog
          open={folderOpen}
          onClose={() => setFolderOpen(false)}
          onFolderSelected={handleFolderSelected}
        />
        <ConfigDialog open={configOpen} onClose={() => setConfigOpen(false)} />
        <DeleteDialog
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onDeleted={handleDeleted}
        />
        <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
        <UndoSnackbar />
    </ThemeProvider>
  );
}
