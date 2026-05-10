import { useState, useCallback } from "react";
import type { BatchStatus } from "../types";
import { useAppStore } from "../store/appStore";
import { startBatch } from "../api/endpoints";
import { useWebSocket } from "./useWebSocket";

export function useAssessment() {
  const [batchId, setBatchId] = useState<string | null>(null);
  const setResult = useAppStore((s) => s.setResult);
  const batchStatus = useAppStore((s) => s.batchStatus);
  const setBatchStatus = useAppStore((s) => s.setBatchStatus);

  const handleMessage = useCallback(
    (status: BatchStatus) => {
      setBatchStatus(status);
      // Update individual results
      for (const result of status.results) {
        setResult(result.image_id, result);
      }
    },
    [setBatchStatus, setResult]
  );

  const { cancel } = useWebSocket(batchId, handleMessage);

  const runAssessment = useCallback(
    async (
      imagePaths: string[],
      model?: string,
      force = false
    ): Promise<string> => {
      const { batch_id } = await startBatch(imagePaths, model, force);
      setBatchId(batch_id);
      return batch_id;
    },
    []
  );

  const cancelAssessment = useCallback(() => {
    cancel();
    setBatchId(null);
    setBatchStatus(null);
  }, [cancel, setBatchStatus]);

  return { batchStatus, runAssessment, cancelAssessment, batchId };
}
