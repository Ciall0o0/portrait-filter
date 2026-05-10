import axios from "axios";
import type {
  ImageListResponse,
  FolderBrowseResult,
  BatchStatus,
  DeleteResponse,
  UndoResponse,
  AppConfig,
} from "../types";

const api = axios.create({
  baseURL: "/api",
});

// Folders
export async function openFolder(path: string): Promise<FolderBrowseResult> {
  const { data } = await api.post("/folders/open", { path });
  return data;
}

export async function browseFolder(path: string): Promise<FolderBrowseResult> {
  const { data } = await api.get("/folders/browse", { params: { path } });
  return data;
}

// Images
export async function listImages(
  folder: string,
  page = 1,
  perPage = 200
): Promise<ImageListResponse> {
  const { data } = await api.get("/images", {
    params: { folder, page, per_page: perPage },
  });
  return data;
}

export async function getThumbnail(
  imageId: string,
  path: string
): Promise<{ image_id: string; data_uri: string }> {
  const { data } = await api.get(`/images/${imageId}/thumbnail`, {
    params: { path },
  });
  return data;
}

// Assessment
export async function startBatch(
  imagePaths: string[],
  model?: string,
  forceReassess = false
): Promise<{ batch_id: string }> {
  const { data } = await api.post("/assess/batch", {
    image_paths: imagePaths,
    model,
    force_reassess: forceReassess,
  });
  return data;
}

export async function getBatchStatus(
  batchId: string
): Promise<BatchStatus> {
  const { data } = await api.get(`/assess/status/${batchId}`);
  return data;
}

// Actions
export async function deleteImages(
  imageIds: string[],
  confirmed: boolean
): Promise<DeleteResponse> {
  const { data } = await api.post("/images/delete", {
    image_ids: imageIds,
    confirmed,
  });
  return data;
}

export async function undoDelete(opId: string): Promise<UndoResponse> {
  const { data } = await api.post("/images/undo", null, {
    params: { op_id: opId },
  });
  return data;
}

// Config
export async function getConfig(): Promise<AppConfig> {
  const { data } = await api.get("/config");
  return data;
}

export async function updateConfig(updates: Record<string, unknown>): Promise<void> {
  await api.put("/config", updates);
}

// Export
export async function exportReport(
  folder: string,
  format: "csv" | "json"
): Promise<{ data: string; format: string; filename: string }> {
  const { data } = await api.get("/export/report", {
    params: { folder, format },
  });
  return data;
}
