import { createClient } from "@/lib/supabase/server";
import { queueVerificationRun } from "@/lib/verification/queue";
import { safeProcessVerificationRun } from "@/lib/verification/processor";
import {
  syncBuyerVerificationProfileFromDocuments,
  syncSupplierVerificationProfileFromArtifacts,
} from "@/lib/verification/profile-status";

type DocumentVerificationKind = "buyer_document" | "supplier_document";

async function tryUpdateDocumentRunReference(docId: number, runId: number) {
  const supabase = await createClient();

  await supabase
    .from("business_documents")
    .update({
      last_verification_run_id: runId,
    })
    .eq("doc_id", docId);
}

export async function safeQueueDocumentVerification(params: {
  profileId: number;
  docId: number;
  kind: DocumentVerificationKind;
  documentTypeName: string;
}) {
  try {
    const run = await queueVerificationRun({
      profileId: params.profileId,
      targetType: "business_document",
      targetId: params.docId,
      kind: params.kind,
      inputSnapshot: {
        documentTypeName: params.documentTypeName,
      },
    });

    try {
      await tryUpdateDocumentRunReference(params.docId, run.run_id);
    } catch (error) {
      console.error("Unable to save document verification run reference.", error);
    }

    await safeProcessVerificationRun(run.run_id);

    return run;
  } catch (error) {
    console.error("Unable to queue document verification run.", error);
    return null;
  }
}

export async function safeSyncBuyerVerificationProfile(profileId: number) {
  try {
    await syncBuyerVerificationProfileFromDocuments(profileId);
  } catch (error) {
    console.error("Unable to sync buyer verification profile status.", error);
  }
}

export async function safeSyncSupplierVerificationProfile(profileId: number) {
  try {
    await syncSupplierVerificationProfileFromArtifacts(profileId);
  } catch (error) {
    console.error("Unable to sync supplier verification profile status.", error);
  }
}
