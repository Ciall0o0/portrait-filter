export const QualityIssue = {
  CLOSED_EYES: "closed_eyes",
  GLARE_REFLECTION: "glare_reflection",
  LOW_RESOLUTION: "low_resolution",
  MOTION_BLUR: "motion_blur",
  POOR_EXPOSURE: "poor_exposure",
  POOR_COMPOSITION: "poor_composition",
  BAD_COLOR_BALANCE: "bad_color_balance",
  NOISE: "noise",
} as const;

export type QualityIssue = (typeof QualityIssue)[keyof typeof QualityIssue];

export const QualityIssueLabels: Record<QualityIssue, string> = {
  [QualityIssue.CLOSED_EYES]: "闭眼",
  [QualityIssue.GLARE_REFLECTION]: "反光",
  [QualityIssue.LOW_RESOLUTION]: "低分辨率",
  [QualityIssue.MOTION_BLUR]: "运动模糊",
  [QualityIssue.POOR_EXPOSURE]: "曝光不佳",
  [QualityIssue.POOR_COMPOSITION]: "构图不佳",
  [QualityIssue.BAD_COLOR_BALANCE]: "色彩失衡",
  [QualityIssue.NOISE]: "噪点",
};

export type ImageInfo = {
  id: string;
  path: string;
  filename: string;
  size_bytes: number;
  width: number;
  height: number;
  format: string;
  thumbnail_base64?: string | null;
};

export type AssessmentResult = {
  image_id: string;
  overall_score: number;
  is_portrait: boolean;
  quality_issues: QualityIssue[];
  ai_comment: string;
  assessed_at: string;
};

export type BatchStatus = {
  batch_id: string;
  total: number;
  completed: number;
  results: AssessmentResult[];
  status: "pending" | "running" | "completed" | "error";
};

export type FolderInfo = {
  name: string;
  path: string;
  has_images: boolean;
};

export type FolderBrowseResult = {
  current: string;
  exists: boolean;
  parent: string | null;
  subdirs: FolderInfo[];
};

export type ImageListResponse = {
  images: ImageInfo[];
  total: number;
  page: number;
  per_page: number;
};

export type DeleteResponse = {
  op_id: string;
  deleted_count: number;
  deleted_paths: string[];
};

export type UndoResponse = {
  op_id: string;
  restored_count: number;
  restored_paths: string[];
};

export type AppConfig = {
  openai_base_url: string;
  openai_api_key: string;
  openai_model: string;
  openai_json_mode: boolean;
  batch_size: number;
  quality_threshold_good: number;
  quality_threshold_warn: number;
  has_api_key: boolean;
};
