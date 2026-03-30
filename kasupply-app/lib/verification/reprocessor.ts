import { createClient } from "@/lib/supabase/server";
import { processVerificationRun } from "@/lib/verification/processor";
import { queueVerificationRun } from "@/lib/verification/queue";
import type {
  VerificationRunKind,
  VerificationRunStatus,
  VerificationTargetType,
} from "@/lib/verification/types";

type StoredVerificationRunRow = {
  run_id: number;
  profile_id: number;
  target_type: VerificationTargetType;
  target_id: number | null;
  kind: VerificationRunKind;
  status: VerificationRunStatus;
  input_snapshot: Record<string, unknown> | null;
  provider_status: Record<string, unknown> | null;
  created_at: string;
};

type ReprocessOutstandingRunsOptions = {
  limit?: number;
  statuses?: VerificationRunStatus[];
};

async function loadVerificationRunForRetry(runId: number) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("verification_runs")
    .select(
      "run_id, profile_id, target_type, target_id, kind, status, input_snapshot, provider_status, created_at"
    )
    .eq("run_id", runId)
    .maybeSingle<StoredVerificationRunRow>();

  if (error) {
    throw new Error(error.message || "Failed to load verification run for retry.");
  }

  if (!data) {
    throw new Error("Verification run not found for retry.");
  }

  return data;
}

async function updateLatestRunReference(
  targetType: VerificationTargetType,
  targetId: number | null,
  profileId: number,
  runId: number
) {
  const supabase = await createClient();

  if (targetType === "business_document" && targetId) {
    await supabase
      .from("business_documents")
      .update({
        last_verification_run_id: runId,
      })
      .eq("doc_id", targetId);
  }

  if (targetType === "site_verification") {
    await supabase
      .from("site_showcase_images")
      .update({
        last_verification_run_id: runId,
      })
      .eq("profile_id", profileId);
  }
}

export async function retryVerificationRun(runId: number) {
  const existingRun = await loadVerificationRunForRetry(runId);

  const retryRun = await queueVerificationRun({
    profileId: existingRun.profile_id,
    targetType: existingRun.target_type,
    targetId: existingRun.target_id,
    kind: existingRun.kind,
    triggeredBy: "retry",
    inputSnapshot: existingRun.input_snapshot ?? {},
    providerStatus: existingRun.provider_status ?? {},
  });

  await updateLatestRunReference(
    existingRun.target_type,
    existingRun.target_id,
    existingRun.profile_id,
    retryRun.run_id
  );

  await processVerificationRun(retryRun.run_id);

  return retryRun;
}

export async function reprocessOutstandingVerificationRuns(
  options: ReprocessOutstandingRunsOptions = {}
) {
  const { limit = 25, statuses = ["queued", "failed"] } = options;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("verification_runs")
    .select(
      "run_id, profile_id, target_type, target_id, kind, status, input_snapshot, provider_status, created_at"
    )
    .in("status", statuses)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message || "Failed to load outstanding verification runs.");
  }

  const safeRuns = (data as StoredVerificationRunRow[] | null) ?? [];
  const processedRunIds: number[] = [];

  for (const run of safeRuns) {
    await processVerificationRun(run.run_id);
    processedRunIds.push(run.run_id);
  }

  return {
    count: processedRunIds.length,
    runIds: processedRunIds,
  };
}

export async function retryLatestVerificationRunsForProfile(profileId: number) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("verification_runs")
    .select(
      "run_id, profile_id, target_type, target_id, kind, status, input_snapshot, provider_status, created_at"
    )
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Failed to load profile verification history.");
  }

  const safeRuns = (data as StoredVerificationRunRow[] | null) ?? [];
  const seenTargets = new Set<string>();
  const retriedRunIds: number[] = [];

  for (const run of safeRuns) {
    const targetKey = `${run.kind}:${run.target_type}:${run.target_id ?? "profile"}`;

    if (seenTargets.has(targetKey)) {
      continue;
    }

    seenTargets.add(targetKey);

    const retryRun = await retryVerificationRun(run.run_id);
    retriedRunIds.push(retryRun.run_id);
  }

  return {
    count: retriedRunIds.length,
    runIds: retriedRunIds,
  };
}

export async function safeRetryVerificationRun(runId: number) {
  try {
    return await retryVerificationRun(runId);
  } catch (error) {
    console.error("Unable to retry verification run.", error);
    return null;
  }
}

export async function safeReprocessOutstandingVerificationRuns(
  options: ReprocessOutstandingRunsOptions = {}
) {
  try {
    return await reprocessOutstandingVerificationRuns(options);
  } catch (error) {
    console.error("Unable to reprocess outstanding verification runs.", error);
    return {
      count: 0,
      runIds: [],
    };
  }
}

export async function safeRetryLatestVerificationRunsForProfile(profileId: number) {
  try {
    return await retryLatestVerificationRunsForProfile(profileId);
  } catch (error) {
    console.error("Unable to retry profile verification runs.", error);
    return {
      count: 0,
      runIds: [],
    };
  }
}
