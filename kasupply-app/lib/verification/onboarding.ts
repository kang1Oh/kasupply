import { createClient } from "@/lib/supabase/server";
import { queueVerificationRun } from "@/lib/verification/queue";
import { safeProcessVerificationRun } from "@/lib/verification/processor";
import { REQUIRED_SITE_IMAGE_TYPES } from "@/lib/verification/site-image-types";
import {
  syncBuyerVerificationProfileFromDocuments,
  syncSupplierVerificationProfileFromArtifacts,
} from "@/lib/verification/profile-status";

type DocumentVerificationKind = "buyer_document" | "supplier_document";

type SiteImageRow = {
  image_type: string;
};

async function tryUpdateDocumentRunReference(docId: number, runId: number) {
  const supabase = await createClient();

  await supabase
    .from("business_documents")
    .update({
      last_verification_run_id: runId,
    })
    .eq("doc_id", docId);
}

async function tryUpdateSiteImageRunReferences(profileId: number, runId: number) {
  const supabase = await createClient();

  await supabase
    .from("site_showcase_images")
    .update({
      last_verification_run_id: runId,
    })
    .eq("profile_id", profileId);
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

export async function safeQueueSiteVerification(profileId: number) {
  try {
    const supabase = await createClient();

    const { data: siteImages, error: siteImagesError } = await supabase
      .from("site_showcase_images")
      .select("image_type")
      .eq("profile_id", profileId);

    if (siteImagesError) {
      throw new Error(siteImagesError.message);
    }

    const safeSiteImages = (siteImages as SiteImageRow[] | null) ?? [];
    const uploadedImageTypes = new Set(
      safeSiteImages.map((image) => String(image.image_type || "").toLowerCase())
    );

    const hasAllRequiredImages = REQUIRED_SITE_IMAGE_TYPES.every((imageType) =>
      uploadedImageTypes.has(imageType)
    );

    if (!hasAllRequiredImages) {
      return null;
    }

    const run = await queueVerificationRun({
      profileId,
      targetType: "site_verification",
      kind: "site_verification",
      inputSnapshot: {
        imageTypes: [...uploadedImageTypes],
      },
    });

    try {
      await tryUpdateSiteImageRunReferences(profileId, run.run_id);
    } catch (error) {
      console.error("Unable to save site verification run reference.", error);
    }

    await safeProcessVerificationRun(run.run_id);

    return run;
  } catch (error) {
    console.error("Unable to queue site verification run.", error);
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
