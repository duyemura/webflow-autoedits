import { describe, it, expect } from "vitest";
import { getLinearStatus } from "../src/shared/linear/status-map.js";
import type { StatusMap } from "../src/types/index.js";

const statusMap: StatusMap = {
  inProgress: "In Progress",
  needsInfo: "Needs Info",
  review: "In Review",
  done: "Done",
  blocked: "Blocked",
};

describe("getLinearStatus", () => {
  it("maps pipeline stages to In Progress", () => {
    const stages = [
      "classifying", "routing", "analyzing", "generating-tests",
      "red-test", "executing", "publishing", "green-test", "reporting",
    ] as const;
    for (const stage of stages) {
      expect(getLinearStatus(stage, statusMap)).toBe("In Progress");
    }
  });

  it("maps needs-info to Needs Info", () => {
    expect(getLinearStatus("needs-info", statusMap)).toBe("Needs Info");
  });

  it("maps blocked/failed to Blocked", () => {
    expect(getLinearStatus("blocked", statusMap)).toBe("Blocked");
    expect(getLinearStatus("failed", statusMap)).toBe("Blocked");
  });

  it("maps finalizing to In Review", () => {
    expect(getLinearStatus("finalizing", statusMap)).toBe("In Review");
  });

  it("maps completed to Done", () => {
    expect(getLinearStatus("completed", statusMap)).toBe("Done");
  });

  it("returns null for pending", () => {
    expect(getLinearStatus("pending", statusMap)).toBeNull();
  });
});
