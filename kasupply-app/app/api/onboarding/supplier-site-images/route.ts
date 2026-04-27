import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  REQUIRED_SITE_IMAGE_TYPES,
  type RequiredSiteImageType,
} from "@/lib/verification/site-image-types";
import {
  safeQueueSiteVerification,
  safeSyncSupplierVerificationProfile,
} from "@/lib/verification/onboarding";

type ExistingImageRow = {
  image_id: number;
  image_url: string;
  image_type: string;
  status: string;
};

function isRequiredSiteImageType(value: string): value is RequiredSiteImageType {
  return REQUIRED_SITE_IMAGE_TYPES.includes(value as RequiredSiteImageType);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
    }

    const body = await request.json();
    const imageType = String(body?.imageType || "").trim();
    const filePath = String(body?.filePath || "").trim();
    const previousFilePath = String(body?.previousFilePath || "").trim() || null;

    if (!isRequiredSiteImageType(imageType)) {
      return NextResponse.json({ error: "Invalid image type." }, { status: 400 });
    }

    if (!filePath) {
      return NextResponse.json({ error: "Uploaded image path is required." }, { status: 400 });
    }

    const { data: appUser, error: appUserError } = await supabase
      .from("users")
      .select("user_id")
      .eq("auth_user_id", authUser.id)
      .single();

    if (appUserError || !appUser) {
      return NextResponse.json({ error: "User record not found." }, { status: 404 });
    }

    const { data: businessProfile, error: businessProfileError } = await supabase
      .from("business_profiles")
      .select("profile_id")
      .eq("user_id", appUser.user_id)
      .single();

    if (businessProfileError || !businessProfile) {
      return NextResponse.json({ error: "Business profile not found." }, { status: 404 });
    }

    const { data: existingImage, error: existingImageError } = await supabase
      .from("site_showcase_images")
      .select("image_id, image_url, image_type, status")
      .eq("profile_id", businessProfile.profile_id)
      .eq("image_type", imageType)
      .maybeSingle<ExistingImageRow>();

    if (existingImageError) {
      return NextResponse.json({ error: existingImageError.message }, { status: 500 });
    }

    let savedImage: ExistingImageRow | null = null;

    if (existingImage) {
      const { data: updatedImage, error: updateError } = await supabase
        .from("site_showcase_images")
        .update({
          image_url: filePath,
          status: "pending",
        })
        .eq("image_id", existingImage.image_id)
        .select("image_id, image_url, image_type, status")
        .single<ExistingImageRow>();

      if (updateError || !updatedImage) {
        return NextResponse.json(
          { error: updateError?.message || "Failed to update image record." },
          { status: 500 }
        );
      }

      savedImage = updatedImage;

      const oldFilePath = previousFilePath || existingImage.image_url;
      if (oldFilePath && oldFilePath !== filePath) {
        await supabase.storage.from("site-verification-images").remove([oldFilePath]);
      }
    } else {
      const { data: insertedImage, error: insertError } = await supabase
        .from("site_showcase_images")
        .insert({
          profile_id: businessProfile.profile_id,
          image_type: imageType,
          image_url: filePath,
          status: "pending",
        })
        .select("image_id, image_url, image_type, status")
        .single<ExistingImageRow>();

      if (insertError || !insertedImage) {
        return NextResponse.json(
          { error: insertError?.message || "Failed to save image record." },
          { status: 500 }
        );
      }

      savedImage = insertedImage;
    }

    await safeQueueSiteVerification(businessProfile.profile_id);
    await safeSyncSupplierVerificationProfile(businessProfile.profile_id);

    return NextResponse.json({
      success: true,
      image: savedImage,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected upload error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
