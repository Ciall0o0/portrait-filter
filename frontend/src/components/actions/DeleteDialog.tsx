import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useAppStore } from "../../store/appStore";
import { deleteImages } from "../../api/endpoints";

interface Props {
  open: boolean;
  onClose: () => void;
  onDeleted: (opId: string, deletedPaths: string[]) => void;
}

export default function DeleteDialog({ open, onClose, onDeleted }: Props) {
  const selectedIds = useAppStore((s) => s.selectedIds);
  const images = useAppStore((s) => s.images);
  const setLastUndoOpId = useAppStore((s) => s.setLastUndoOpId);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const selectedImages = images.filter((i) => selectedIds.has(i.id));
  const selectedPaths = selectedImages.map((i) => i.path);

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      const result = await deleteImages(selectedPaths, true);
      setLastUndoOpId(result.op_id);
      onDeleted(result.op_id, result.deleted_paths);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message
        : typeof err === "object" && err && "response" in err
          ? (err as { response: { data?: { detail?: string } } }).response?.data?.detail
          : "删除失败";
      setError(msg || "删除失败");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>确认删除</DialogTitle>
      <DialogContent sx={{ pt: 1.5 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <DialogContentText gutterBottom>
          将把 {selectedImages.length} 张图片移入回收站。您可以稍后在回收站中手动还原，或使用程序内的撤销功能。
        </DialogContentText>
        <List dense sx={{ maxHeight: 200, overflow: "auto" }}>
          {selectedImages.map((img) => (
            <ListItem key={img.id}>
              <ListItemText
                primary={img.filename}
                secondary={`${img.width} x ${img.height}`}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={deleting}>取消</Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleDelete}
          disabled={deleting}
          startIcon={deleting ? <CircularProgress size={16} /> : undefined}
        >
          {deleting ? "删除中..." : `删除 ${selectedImages.length} 张`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
