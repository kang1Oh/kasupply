import { createClient } from "@/lib/supabase/server";
import { getVerificationProviderSnapshot } from "@/lib/verification/provider-config";
import type {
  QueueVerificationRunInput,
  VerificationRunStatus,
} from "@/lib/verification/types";

type VerificationRunRow = {
  run_id: number;
  status: VerificationRunStatus;
};

export async function queueVerificationRun({
  profileId,
  targetType,
  targetId = null,
  kind,
  triggeredBy = "system",
  inputSnapshot = {},
  providerStatus = {},
}: QueueVerificationRunInput) {
  const supabase = await createClient();
  const snapshot = getVerificationProviderSnapshot();

  const { data, error } = await supabase
    .from("verification_runs")
    .insert({
      profile_id: profileId,
      target_type: targetType,
      target_id: targetId,
      kind,
      status: "queued",
      triggered_by: triggeredBy,
      input_snapshot: inputSnapshot,
      provider_status: {
        ...snapshot,
        ...providerStatus,
      },
    })
    .select("run_id, status")
    .single<VerificationRunRow>();

  if (error || !data) {
    throw new Error(error?.message || "Failed to queue verification run.");
  }

  return data;
}

export async function markVerificationRunProcessing(runId: number) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("verification_runs")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
    })
    .eq("run_id", runId);

  if (error) {
    throw new Error(error.message || "Failed to mark verification run as processing.");
  }
}

export async function completeVerificationRun(
  runId: number,
  resultSummary: Record<string, unknown>
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("verification_runs")
    .update({
      status: "completed",
      result_summary: resultSummary,
      completed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("run_id", runId);

  if (error) {
    throw new Error(error.message || "Failed to complete verification run.");
  }
}

export async function markVerificationRunReviewRequired(
  runId: number,
  resultSummary: Record<string, unknown>
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("verification_runs")
    .update({
      status: "review_required",
      result_summary: resultSummary,
      completed_at: new Date().toISOString(),
    })
    .eq("run_id", runId);

  if (error) {
    throw new Error(error.message || "Failed to mark verification run for review.");
  }
}

export async function failVerificationRun(runId: number, errorMessage: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("verification_runs")
    .update({
      status: "failed",
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq("run_id", runId);

  if (error) {
    throw new Error(error.message || "Failed to mark verification run as failed.");
  }
}
