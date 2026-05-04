"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  safeQueueDocumentVerification,
  safeSyncSupplierVerificationProfile,
} from "@/lib/verification/onboarding";
import { getSupplierDocumentRequirements } from "@/lib/supplier-requirements";

type ExistingDocumentRow = {
  doc_id: number;
  file_url: string;
};

type ExistingCertificationRow = {
  certification_id: number;
  file_url: string;
};

export async function uploadSupplierDocument(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    throw new Error("You must be logged in.");
  }

  const doc_type_id = Number(formData.get("doc_type_id"));
  const file = formData.get("document") as File | null;

  if (!doc_type_id || Number.isNaN(doc_type_id)) {
    throw new Error("Document type is required.");
  }

  if (!file || file.size === 0) {
    throw new Error("Document file is required.");
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("users")
    .select("user_id")
    .eq("auth_user_id", authUser.id)
    .single();

  if (appUserError || !appUser) {
    throw new Error("User record not found.");
  }

  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select("profile_id")
    .eq("user_id", appUser.user_id)
    .single();

  if (businessProfileError || !businessProfile) {
    throw new Error("Business profile not found.");
  }

  const { data: existingDocumentType, error: docTypeError } = await supabase
    .from("document_types")
    .select("doc_type_id, document_type_name")
    .eq("doc_type_id", doc_type_id)
    .single();

  if (docTypeError || !existingDocumentType) {
    throw new Error("Invalid document type.");
  }

  const documentRequirements = await getSupplierDocumentRequirements(supabase);
  const allowedDocumentIds = new Set(
    documentRequirements
      .filter((requirement) => requirement.isActive && requirement.showInOnboarding)
      .map((requirement) => requirement.docTypeId),
  );

  if (!allowedDocumentIds.has(doc_type_id)) {
    throw new Error("This document type is not currently available for supplier onboarding.");
  }

  const { data: existingDocument } = await supabase
    .from("business_documents")
    .select("doc_id, file_url")
    .eq("profile_id", businessProfile.profile_id)
    .eq("doc_type_id", doc_type_id)
    .maybeSingle<ExistingDocumentRow>();

  const fileExt = file.name.split(".").pop() || "pdf";
  const safeDocName = existingDocumentType.document_type_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  const fileName = `${safeDocName}-${Date.now()}.${fileExt}`;
  const filePath = `${businessProfile.profile_id}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("business-documents")
    .upload(filePath, file, {
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  let savedDocumentId: number | null = existingDocument?.doc_id ?? null;

  if (existingDocument) {
    if (existingDocument.file_url && existingDocument.file_url !== filePath) {
      await supabase.storage
        .from("business-documents")
        .remove([existingDocument.file_url]);
    }

    const { error: updateError } = await supabase
      .from("business_documents")
      .update({
        file_url: filePath,
        status: "pending",
        uploaded_at: new Date().toISOString(),
        verified_at: null,
        ocr_extracted_data: null,
      })
      .eq("doc_id", existingDocument.doc_id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  } else {
    const { data: insertedDocument, error: insertError } = await supabase
      .from("business_documents")
      .insert({
        profile_id: businessProfile.profile_id,
        doc_type_id,
        file_url: filePath,
        ocr_extracted_data: null,
        status: "pending",
        uploaded_at: new Date().toISOString(),
        verified_at: null,
      })
      .select("doc_id")
      .single();

    if (insertError || !insertedDocument) {
      throw new Error(insertError?.message || "Failed to save uploaded document.");
    }

    savedDocumentId = insertedDocument.doc_id;
  }

  if (savedDocumentId) {
    const documentId = savedDocumentId;

    async function markSavedDocumentRejected() {
      const { error: rejectionError } = await supabase
        .from("business_documents")
        .update({
          status: "rejected",
        })
        .eq("doc_id", documentId);

      if (rejectionError) {
        throw new Error(rejectionError.message);
      }
    }

    let verificationRun: Awaited<ReturnType<typeof safeQueueDocumentVerification>> =
      null;

    try {
      verificationRun = await safeQueueDocumentVerification({
        profileId: businessProfile.profile_id,
        docId: documentId,
        kind: "supplier_document",
        documentTypeName: existingDocumentType.document_type_name,
      });
    } catch (error) {
      try {
        await markSavedDocumentRejected();
      } catch (rejectionError) {
        console.error("Unable to mark supplier document as rejected.", rejectionError);
      }

      throw error;
    }

    if (!verificationRun) {
      await markSavedDocumentRejected();
    }
  }

  await safeSyncSupplierVerificationProfile(businessProfile.profile_id);

  revalidatePath("/onboarding/supplier-documents");
  revalidatePath("/dashboard");

  redirect("/onboarding/supplier-documents");
}

export async function uploadSupplierCertification(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    throw new Error("You must be logged in.");
  }

  const cert_type_id = Number(formData.get("cert_type_id"));
  const file = formData.get("document") as File | null;

  if (!cert_type_id || Number.isNaN(cert_type_id)) {
    throw new Error("Certification type is required.");
  }

  if (!file || file.size === 0) {
    throw new Error("Certification file is required.");
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("users")
    .select("user_id")
    .eq("auth_user_id", authUser.id)
    .single();

  if (appUserError || !appUser) {
    throw new Error("User record not found.");
  }

  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select("profile_id")
    .eq("user_id", appUser.user_id)
    .single();

  if (businessProfileError || !businessProfile) {
    throw new Error("Business profile not found.");
  }

  const { data: supplierProfile, error: supplierProfileError } = await supabase
    .from("supplier_profiles")
    .select("supplier_id")
    .eq("profile_id", businessProfile.profile_id)
    .single();

  if (supplierProfileError || !supplierProfile) {
    throw new Error("Supplier profile not found.");
  }

  const { data: certificationType, error: certificationTypeError } = await supabase
    .from("certification_types")
    .select("cert_type_id, certification_type_name")
    .eq("cert_type_id", cert_type_id)
    .single();

  if (certificationTypeError || !certificationType) {
    throw new Error("Invalid certification type.");
  }

  const { data: existingCertification } = await supabase
    .from("supplier_certifications")
    .select("certification_id, file_url")
    .eq("supplier_id", supplierProfile.supplier_id)
    .eq("cert_type_id", cert_type_id)
    .maybeSingle<ExistingCertificationRow>();

  const fileExt = file.name.split(".").pop() || "pdf";
  const safeCertName = certificationType.certification_type_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  const fileName = `${safeCertName}-${Date.now()}.${fileExt}`;
  const filePath = `${supplierProfile.supplier_id}/${fileName}`;
  const verifiedAt = new Date().toISOString();

  const { error: uploadError } = await supabase.storage
    .from("business-documents")
    .upload(filePath, file, {
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  if (existingCertification) {
    if (
      existingCertification.file_url &&
      existingCertification.file_url !== filePath
    ) {
      await supabase.storage
        .from("business-documents")
        .remove([existingCertification.file_url]);
    }

    const { error: updateError } = await supabase
      .from("supplier_certifications")
      .update({
        file_url: filePath,
        status: "approved",
        verified_at: verifiedAt,
      })
      .eq("certification_id", existingCertification.certification_id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  } else {
    const { error: insertError } = await supabase
      .from("supplier_certifications")
      .insert({
        supplier_id: supplierProfile.supplier_id,
        cert_type_id,
        file_url: filePath,
        status: "approved",
        issued_at: null,
        expires_at: null,
        verified_at: verifiedAt,
      });

    if (insertError) {
      throw new Error(insertError.message || "Failed to save uploaded certification.");
    }
  }

  await safeSyncSupplierVerificationProfile(businessProfile.profile_id);

  revalidatePath("/onboarding/supplier-documents");
  revalidatePath("/dashboard");

  redirect("/onboarding/supplier-documents");
}
