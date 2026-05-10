import { useEffect, useState } from "react";
import { Snackbar, Alert, Button } from "@mui/material";
import { useAppStore } from "../../store/appStore";
import { undoDelete } from "../../api/endpoints";

export default function UndoSnackbar() {
  const lastUndoOpId = useAppStore((s) => s.lastUndoOpId);
  const setLastUndoOpId = useAppStore((s) => s.setLastUndoOpId);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("图片已移入回收站");
  const [undoing, setUndoing] = useState(false);

  useEffect(() => {
    if (lastUndoOpId) {
      setMessage("图片已移入回收站");
      setOpen(true);
    }
  }, [lastUndoOpId]);

  const handleUndo = async () => {
    if (!lastUndoOpId) return;
    setUndoing(true);
    try {
      const result = await undoDelete(lastUndoOpId);
      if (result.restored_count > 0) {
        setMessage(`已还原 ${result.restored_count} 张图片`);
      }
      setLastUndoOpId(null);
    } catch {
      setMessage("撤销失败");
    } finally {
      setUndoing(false);
      setTimeout(() => setOpen(false), 2000);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setLastUndoOpId(null);
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={12000}
      onClose={handleClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      sx={{ "& .MuiPaper-root": { borderRadius: 3 } }}
    >
      <Alert
        severity="info"
        onClose={handleClose}
        variant="filled"
        sx={{ borderRadius: 3, alignItems: "center" }}
        action={
          lastUndoOpId ? (
            <Button color="inherit" size="small" onClick={handleUndo} disabled={undoing}>
              {undoing ? "还原中..." : "撤销"}
            </Button>
          ) : undefined
        }
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
