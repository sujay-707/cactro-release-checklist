
import { describe, it, expect } from "vitest";
import { getReleaseStatus } from "../releaseStatus.js";
import { STEPS } from "../schema.js";

describe("Release status calculation", () => {
  it("returns planned when no checklist items are complete", () => {
    expect(getReleaseStatus(STEPS.map(() => false))).toBe("planned");
  });

  it("returns ongoing when one item is complete", () => {
    const steps = STEPS.map(() => false);
    steps[0] = true;

    expect(getReleaseStatus(steps)).toBe("ongoing");
  });

  it("returns ongoing when six of seven items are complete", () => {
    const steps = STEPS.map((_, index) => index < 6);

    expect(getReleaseStatus(steps)).toBe("ongoing");
  });

  it("returns done when all seven items are complete", () => {
    expect(getReleaseStatus(STEPS.map(() => true))).toBe("done");
  });

  it("returns planned for an empty checklist", () => {
    expect(getReleaseStatus([])).toBe("planned");
  });

  it("does not count truthy non-Boolean values as completed", () => {
    expect(getReleaseStatus(["true", 1, null, false, false, false, false])).toBe("planned");
  });
});
