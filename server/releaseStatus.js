
import { STEPS } from "./schema.js";

export function getReleaseStatus(completedSteps) {
  const steps = Array.isArray(completedSteps) ? completedSteps : [];
  const completedCount = steps.filter((step) => step === true).length;

  if (completedCount === 0) return "planned";
  if (completedCount === STEPS.length) return "done";
  return "ongoing";
}
