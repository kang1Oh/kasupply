import { createClient } from "@/lib/supabase/server";
import { runBuyerDtiLiveVerification } from "@/lib/verification/buyer-dti";
import {
  getDocumentVerificationBlueprint,
  isBuyerDtiDocumentTypeName,
} from "@/lib/verification/document-rules";
import { getVerificationReadiness } from "@/lib/verification/provider-config";
import { runSupplierDocumentLiveVerification } from "@/lib/verification/supplier-documents";
import {
  completeVerificationRun,
  failVerificationRun,
  markVerificationRunProcessing,
} from "@/lib/verification/queue";
import {
  syncBuyerVerificationProfileFromDocuments,
  syncSupplierVerificationProfileFromArtifacts,
} from "@/lib/verification/profile-status";
import type {
  DocumentVerificationSummary,
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
  ocr_extracted_fields?: Record<string, unknown> | null;
  verification_analysis?: Record<string, unknown> | null;
  verified_at?: string | null;
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
  business_name?: string | null;
  business_location: string;
  city: string;
  province: string;
  region: string;
};

function isTerminalVerificationRunStatus(status: VerificationRunStatus) {
  return (
    status === "completed" ||
    status === "cancelled" ||
    // Legacy-only terminal status kept for historical run rows.
    status === "review_required"
  );
}

function readDocumentTypeName(row: BusinessDocumentRow) {
  if (Array.isArray(row.document_types)) {
    return row.document_types[0]?.document_type_name ?? "";
  }

  return row.document_types?.document_type_name ?? "";
}

function buildUnsupportedDocumentSummary(
  documentTypeName: string
): DocumentVerificationSummary {
  const blueprint = getDocumentVerificationBlueprint(documentTypeName);

  return {
    status: "rejected",
    score: blueprint ? 0 : null,
    manualReviewRequired: false,
    extractedFields: {},
    failedChecks: [blueprint ? "unsupported_document_flow" : "unsupported_document_type"],
    passedChecks: [],
    notes: blueprint
      ? [
          `${blueprint.label} was submitted through a document flow that is no longer supported.`,
          "Automated verification is binary, so this submission was rejected instead of being routed to manual review.",
        ]
      : [
          `No verification blueprint was found for ${documentTypeName}.`,
          "Automated verification is binary, so this unsupported document type was rejected.",
        ],
  };
}

function buildSupplierDocumentUnavailableSummary(
  documentTypeName: string
): DocumentVerificationSummary {
  const blueprint = getDocumentVerificationBlueprint(documentTypeName);

  return {
    status: "rejected",
    score: blueprint ? 0 : null,
    manualReviewRequired: false,
    extractedFields: {},
    failedChecks: [
      blueprint ? "live_verification_unavailable" : "unsupported_document_type",
    ],
    passedChecks: [],
    notes: blueprint
      ? [
          `Automated verification for ${blueprint.label} is currently unavailable.`,
          "Supplier document verification is binary, so this upload was rejected instead of being routed to manual review.",
        ]
      : [
          `No verification blueprint was found for ${documentTypeName}.`,
          "Supplier document verification is binary, so this unsupported document type was rejected.",
        ],
  };
}

function buildBuyerDocumentUnavailableSummary(
  documentTypeName: string
): DocumentVerificationSummary {
  const blueprint = getDocumentVerificationBlueprint(documentTypeName);

  return {
    status: "rejected",
    score: blueprint ? 0 : null,
    manualReviewRequired: false,
    extractedFields: {},
    failedChecks: [
      blueprint ? "live_verification_unavailable" : "unsupported_document_type",
    ],
    passedChecks: [],
    notes: blueprint
      ? [
          `Automated verification for ${blueprint.label} is currently unavailable.`,
          "Buyer DTI verification is binary, so this upload was rejected instead of being routed to manual review.",
        ]
      : [
          `No verification blueprint was found for ${documentTypeName}.`,
          "Buyer DTI verification is binary, so this unsupported document type was rejected.",
        ],
  };
}

function isBuyerDtiDocument(documentTypeName: string) {
  return isBuyerDtiDocumentTypeName(documentTypeName);
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

  if (run.kind === "buyer_document" && isBuyerDtiDocument(documentTypeName)) {
    const { data: businessProfile, error: businessProfileError } = await supabase
      .from("business_profiles")
      .select("profile_id, business_name, business_location, city, province, region")
      .eq("profile_id", run.profile_id)
      .maybeSingle<BusinessProfileRow>();

    if (businessProfileError) {
      throw new Error(
        businessProfileError.message ||
          "Failed to load business profile for buyer document verification."
      );
    }

    if (!businessProfile) {
      throw new Error("Business profile not found for buyer document verification.");
    }

    if (readiness.canRunBuyerDocumentLive) {
      const liveResult = await runBuyerDtiLiveVerification({
        filePath: document.file_url,
        businessContext: {
          businessName: businessProfile.business_name ?? null,
          businessLocation: businessProfile.business_location ?? null,
          city: businessProfile.city ?? null,
          province: businessProfile.province ?? null,
          region: businessProfile.region ?? null,
        },
      });

      const { error: liveUpdateError } = await supabase
        .from("business_documents")
        .update({
          status: liveResult.summary.status,
          ocr_extracted_data: liveResult.ocrRawText,
          ocr_raw_text: liveResult.ocrRawText,
          ocr_extracted_fields: liveResult.summary.extractedFields,
          metadata_analysis: liveResult.metadataAnalysis,
          verification_analysis: liveResult.verificationAnalysis,
          verification_score: liveResult.summary.score,
          manual_review_required: liveResult.summary.manualReviewRequired,
          review_notes: liveResult.reviewNotes,
          verified_at: liveResult.verifiedAt,
        })
        .eq("doc_id", document.doc_id);

      if (liveUpdateError) {
        throw new Error(
          liveUpdateError.message || "Failed to update live buyer verification result."
        );
      }

      if (liveResult.summary.status === "approved") {
        await completeVerificationRun(run.run_id, {
          mode: "live",
          target: "business_document",
          summary: liveResult.summary,
          documentTypeName,
        });
      } else {
        await completeVerificationRun(run.run_id, {
          mode: "live",
          target: "business_document",
          summary: liveResult.summary,
          documentTypeName,
        });
      }

      await syncBuyerVerificationProfileFromDocuments(run.profile_id);
      return;
    }

    const summary = buildBuyerDocumentUnavailableSummary(documentTypeName);
    const reviewNotes = summary.notes.join(" ");

    const { error: updateError } = await supabase
      .from("business_documents")
      .update({
        status: summary.status,
        ocr_raw_text: null,
        ocr_extracted_fields: summary.extractedFields,
        metadata_analysis: {
          mode: "live_unavailable",
          analyzed_at: new Date().toISOString(),
          provider_snapshot: readiness.snapshot,
        },
        verification_analysis: {
          mode: "live_unavailable",
          summary,
          documentTypeName,
          live_readiness: readiness,
        },
        verification_score: summary.score,
        manual_review_required: false,
        review_notes: reviewNotes,
        verified_at: null,
      })
      .eq("doc_id", document.doc_id);

    if (updateError) {
      throw new Error(
        updateError.message ||
          "Failed to update unavailable buyer verification result."
      );
    }

    await completeVerificationRun(run.run_id, {
      mode: "live_unavailable",
      target: "business_document",
      summary,
      documentTypeName,
    });

    await syncBuyerVerificationProfileFromDocuments(run.profile_id);
    return;
  }

  if (run.kind === "supplier_document") {
    const { data: businessProfile, error: businessProfileError } = await supabase
      .from("business_profiles")
      .select("profile_id, business_name, business_location, city, province, region")
      .eq("profile_id", run.profile_id)
      .maybeSingle<BusinessProfileRow>();

    if (businessProfileError) {
      throw new Error(
        businessProfileError.message ||
          "Failed to load business profile for supplier document verification."
      );
    }

    if (!businessProfile) {
      throw new Error("Business profile not found for supplier document verification.");
    }

    if (readiness.canRunSupplierDocumentLive) {
      const { data: profileDocuments, error: profileDocumentsError } = await supabase
        .from("business_documents")
        .select(
          `
            doc_id,
            profile_id,
            file_url,
            status,
            ocr_extracted_fields,
            verification_analysis,
            verified_at,
            document_types!business_documents_doc_type_id_fkey (
              document_type_name
            )
          `
        )
        .eq("profile_id", run.profile_id);

      if (profileDocumentsError) {
        throw new Error(
          profileDocumentsError.message ||
            "Failed to load supplier profile documents for verification."
        );
      }

      const approvedDtiDocument = ((profileDocuments as BusinessDocumentRow[] | null) ?? [])
        .filter(
          (row) =>
            row.doc_id !== document.doc_id &&
            row.status === "approved" &&
            getDocumentVerificationBlueprint(readDocumentTypeName(row))?.code === "dti"
        )
        .sort((left, right) =>
          String(right.verified_at ?? "").localeCompare(String(left.verified_at ?? ""))
        )[0];

      const liveResult = await runSupplierDocumentLiveVerification({
        filePath: document.file_url,
        documentTypeName,
        businessContext: {
          businessName: businessProfile.business_name ?? null,
          businessLocation: businessProfile.business_location ?? null,
          city: businessProfile.city ?? null,
          province: businessProfile.province ?? null,
          region: businessProfile.region ?? null,
        },
        dtiAnchor: approvedDtiDocument
          ? {
              docId: approvedDtiDocument.doc_id,
              extractedFields: approvedDtiDocument.ocr_extracted_fields ?? {},
              verificationAnalysis: approvedDtiDocument.verification_analysis ?? null,
            }
          : null,
      });

      const { error: liveUpdateError } = await supabase
        .from("business_documents")
        .update({
          status: liveResult.summary.status,
          ocr_extracted_data: liveResult.ocrRawText,
          ocr_raw_text: liveResult.ocrRawText,
          ocr_extracted_fields: liveResult.summary.extractedFields,
          metadata_analysis: liveResult.metadataAnalysis,
          verification_analysis: liveResult.verificationAnalysis,
          verification_score: liveResult.summary.score,
          manual_review_required: false,
          review_notes: liveResult.reviewNotes,
          verified_at: liveResult.verifiedAt,
        })
        .eq("doc_id", document.doc_id);

      if (liveUpdateError) {
        throw new Error(
          liveUpdateError.message ||
            "Failed to update live supplier verification result."
        );
      }

      await completeVerificationRun(run.run_id, {
        mode: "live",
        target: "business_document",
        summary: liveResult.summary,
        documentTypeName,
      });

      await syncSupplierVerificationProfileFromArtifacts(run.profile_id);
      return;
    }

    const summary = buildSupplierDocumentUnavailableSummary(documentTypeName);
    const reviewNotes = summary.notes.join(" ");

    const { error: updateError } = await supabase
      .from("business_documents")
      .update({
        status: summary.status,
        ocr_raw_text: null,
        ocr_extracted_fields: summary.extractedFields,
        metadata_analysis: {
          mode: "live_unavailable",
          analyzed_at: new Date().toISOString(),
          provider_snapshot: readiness.snapshot,
        },
        verification_analysis: {
          mode: "live_unavailable",
          summary,
          documentTypeName,
          live_readiness: readiness,
        },
        verification_score: summary.score,
        manual_review_required: false,
        review_notes: reviewNotes,
        verified_at: null,
      })
      .eq("doc_id", document.doc_id);

    if (updateError) {
      throw new Error(
        updateError.message ||
          "Failed to update unavailable supplier verification result."
      );
    }

    await completeVerificationRun(run.run_id, {
      mode: "live_unavailable",
      target: "business_document",
      summary,
      documentTypeName,
    });

    await syncSupplierVerificationProfileFromArtifacts(run.profile_id);
    return;
  }

  const summary = buildUnsupportedDocumentSummary(documentTypeName);
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
        mode: "unsupported_flow",
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

  await completeVerificationRun(run.run_id, {
    mode: "unsupported_flow",
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

export async function processVerificationRun(runId: number) {
  const run = await loadVerificationRun(runId);

  if (isTerminalVerificationRunStatus(run.status)) {
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
