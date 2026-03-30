import { createClient } from "@/lib/supabase/server";
import { getDocumentVerificationBlueprint } from "@/lib/verification/document-rules";
import { getVerificationReadiness } from "@/lib/verification/provider-config";
import {
  completeVerificationRun,
  failVerificationRun,
  markVerificationRunProcessing,
  markVerificationRunReviewRequired,
} from "@/lib/verification/queue";
import {
  syncBuyerVerificationProfileFromDocuments,
  syncSupplierVerificationProfileFromArtifacts,
} from "@/lib/verification/profile-status";
import type {
  DocumentVerificationSummary,
  SiteVerificationSummary,
  VerificationRunKind,
  VerificationRunStatus,
  VerificationTargetType,
} from "@/lib/verification/types";

type VerificationRunRow = {
  run_id: number;
  profile_id: number;
  target_type: VerificationTargetType;
  target_id: number | null;
  kind: VerificationRunKind;
  status: VerificationRunStatus;
  input_snapshot: Record<string, unknown> | null;
};

type BusinessDocumentRow = {
  doc_id: number;
  profile_id: number;
  file_url: string;
  status: string | null;
  document_types:
    | {
        document_type_name: string;
      }
    | Array<{
        document_type_name: string;
      }>
    | null;
};

type BusinessProfileRow = {
  profile_id: number;
  business_location: string;
  city: string;
  province: string;
  region: string;
};

type SiteImageRow = {
  image_id: number;
  image_type: string;
  image_url: string;
  status: string;
};

function readDocumentTypeName(row: BusinessDocumentRow) {
  if (Array.isArray(row.document_types)) {
    return row.document_types[0]?.document_type_name ?? "";
  }

  return row.document_types?.document_type_name ?? "";
}

function buildDocumentMockSummary(
  documentTypeName: string
): DocumentVerificationSummary {
  const blueprint = getDocumentVerificationBlueprint(documentTypeName);

  return {
    status: "review_required",
    score: blueprint ? 50 : 20,
    manualReviewRequired: true,
    extractedFields: {},
    failedChecks: blueprint ? [] : ["unsupported_document_type"],
    passedChecks: blueprint
      ? ["file_received", "verification_blueprint_loaded"]
      : ["file_received"],
    notes: blueprint
      ? [
          `Mock verification completed for ${blueprint.label}.`,
          "No live OCR or AI providers are connected yet, so this document has been flagged for manual review.",
        ]
      : [
          `No verification blueprint was found for ${documentTypeName}.`,
          "The document has been routed to manual review.",
        ],
  };
}

function buildSiteMockSummary(addressLabel: string): SiteVerificationSummary {
  return {
    status: "review_required",
    similarityScore: null,
    deliverabilityStatus: "unknown",
    streetViewStatus: "unknown",
    manualReviewRequired: true,
    notes: [
      `Mock site verification completed for ${addressLabel}.`,
      "No live Maps or vision providers are connected yet, so the site verification has been routed to manual review.",
    ],
  };
}

async function loadVerificationRun(runId: number) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("verification_runs")
    .select("run_id, profile_id, target_type, target_id, kind, status, input_snapshot")
    .eq("run_id", runId)
    .maybeSingle<VerificationRunRow>();

  if (error) {
    throw new Error(error.message || "Failed to load verification run.");
  }

  if (!data) {
    throw new Error("Verification run not found.");
  }

  return data;
}

async function processDocumentVerificationRun(run: VerificationRunRow) {
  if (!run.target_id) {
    throw new Error("Document verification run is missing a target document.");
  }

  const supabase = await createClient();

  const { data: document, error: documentError } = await supabase
    .from("business_documents")
    .select(
      `
        doc_id,
        profile_id,
        file_url,
        status,
        document_types!business_documents_doc_type_id_fkey (
          document_type_name
        )
      `
    )
    .eq("doc_id", run.target_id)
    .maybeSingle<BusinessDocumentRow>();

  if (documentError) {
    throw new Error(documentError.message || "Failed to load business document.");
  }

  if (!document) {
    throw new Error("Business document not found.");
  }

  const documentTypeName = readDocumentTypeName(document);
  const readiness = getVerificationReadiness();
  const summary = buildDocumentMockSummary(documentTypeName);
  const reviewNotes = summary.notes.join(" ");

  const { error: updateError } = await supabase
    .from("business_documents")
    .update({
      status: summary.status,
      ocr_raw_text: null,
      ocr_extracted_fields: summary.extractedFields,
      metadata_analysis: {
        mode: "mock",
        analyzed_at: new Date().toISOString(),
        provider_snapshot: readiness.snapshot,
      },
      verification_analysis: {
        mode: "mock",
        summary,
        documentTypeName,
        live_readiness: readiness,
      },
      verification_score: summary.score,
      manual_review_required: summary.manualReviewRequired,
      review_notes: reviewNotes,
      verified_at: null,
    })
    .eq("doc_id", document.doc_id);

  if (updateError) {
    throw new Error(updateError.message || "Failed to update document verification result.");
  }

  await markVerificationRunReviewRequired(run.run_id, {
    mode: "mock",
    target: "business_document",
    summary,
    documentTypeName,
  });

  if (run.kind === "buyer_document") {
    await syncBuyerVerificationProfileFromDocuments(run.profile_id);
  } else {
    await syncSupplierVerificationProfileFromArtifacts(run.profile_id);
  }
}

async function processSiteVerificationRun(run: VerificationRunRow) {
  const supabase = await createClient();

  const [{ data: businessProfile, error: businessProfileError }, { data: siteImages, error: siteImagesError }] =
    await Promise.all([
      supabase
        .from("business_profiles")
        .select("profile_id, business_location, city, province, region")
        .eq("profile_id", run.profile_id)
        .maybeSingle<BusinessProfileRow>(),
      supabase
        .from("site_showcase_images")
        .select("image_id, image_type, image_url, status")
        .eq("profile_id", run.profile_id),
    ]);

  if (businessProfileError) {
    throw new Error(
      businessProfileError.message || "Failed to load business profile for site verification."
    );
  }

  if (siteImagesError) {
    throw new Error(siteImagesError.message || "Failed to load site verification images.");
  }

  if (!businessProfile) {
    throw new Error("Business profile not found for site verification.");
  }

  const safeSiteImages = (siteImages as SiteImageRow[] | null) ?? [];
  const addressLabel = [
    businessProfile.business_location,
    businessProfile.city,
    businessProfile.province,
    businessProfile.region,
  ]
    .filter(Boolean)
    .join(", ");

  const readiness = getVerificationReadiness();
  const summary = buildSiteMockSummary(addressLabel || `profile #${run.profile_id}`);
  const reviewNotes = summary.notes.join(" ");

  const { error: siteCheckInsertError } = await supabase
    .from("site_verification_checks")
    .insert({
      profile_id: run.profile_id,
      submitted_address: addressLabel,
      normalized_address: null,
      geocode_payload: {
        mode: "mock",
        provider_snapshot: readiness.snapshot,
      },
      street_view_metadata: {
        mode: "mock",
        provider_snapshot: readiness.snapshot,
      },
      street_view_image_url: null,
      comparison_payload: {
        mode: "mock",
        image_count: safeSiteImages.length,
        image_types: safeSiteImages.map((image) => image.image_type),
      },
      similarity_score: summary.similarityScore,
      deliverability_status: summary.deliverabilityStatus,
      street_view_status: summary.streetViewStatus,
      status: summary.status,
      manual_review_required: summary.manualReviewRequired,
      review_notes: reviewNotes,
      verified_at: null,
      updated_at: new Date().toISOString(),
    });

  if (siteCheckInsertError) {
    throw new Error(
      siteCheckInsertError.message || "Failed to save site verification result."
    );
  }

  const { error: siteImagesUpdateError } = await supabase
    .from("site_showcase_images")
    .update({
      status: summary.status,
      analysis_result: {
        mode: "mock",
        summary,
        live_readiness: readiness,
      },
      manual_review_required: summary.manualReviewRequired,
      review_notes: reviewNotes,
      verified_at: null,
    })
    .eq("profile_id", run.profile_id);

  if (siteImagesUpdateError) {
    throw new Error(
      siteImagesUpdateError.message || "Failed to update site image verification status."
    );
  }

  await markVerificationRunReviewRequired(run.run_id, {
    mode: "mock",
    target: "site_verification",
    summary,
    imageTypes: safeSiteImages.map((image) => image.image_type),
  });

  await syncSupplierVerificationProfileFromArtifacts(run.profile_id);
}

export async function processVerificationRun(runId: number) {
  const run = await loadVerificationRun(runId);

  if (run.status === "completed" || run.status === "review_required") {
    return run;
  }

  if (run.status === "queued" || run.status === "failed") {
    await markVerificationRunProcessing(run.run_id);
  }

  try {
    if (run.kind === "buyer_document" || run.kind === "supplier_document") {
      await processDocumentVerificationRun(run);
      return run;
    }

    if (run.kind === "site_verification") {
      await processSiteVerificationRun(run);
      return run;
    }

    await completeVerificationRun(run.run_id, {
      mode: "mock",
      note: `No processor is implemented yet for ${run.kind}.`,
    });

    return run;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected verification processing error.";

    await failVerificationRun(run.run_id, message);
    throw error;
  }
}

export async function safeProcessVerificationRun(runId: number) {
  try {
    await processVerificationRun(runId);
  } catch (error) {
    console.error("Unable to process verification run.", error);
  }
}
