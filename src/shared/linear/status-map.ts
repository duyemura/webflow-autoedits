import type { PipelineStage, StatusMap } from "../../types/index.js";

/**
 * Map pipeline stages to Linear status names.
 */
export function getLinearStatus(stage: PipelineStage, statusMap: StatusMap): string | null {
  switch (stage) {
    case "classifying":
    case "routing":
    case "analyzing":
    case "generating-tests":
    case "red-test":
    case "executing":
    case "publishing":
    case "green-test":
    case "reporting":
      return statusMap.inProgress;
    case "needs-info":
      return statusMap.needsInfo;
    case "blocked":
    case "failed":
      return statusMap.blocked;
    case "finalizing":
      return statusMap.review;
    case "completed":
      return statusMap.done;
    default:
      return null;
  }
}
