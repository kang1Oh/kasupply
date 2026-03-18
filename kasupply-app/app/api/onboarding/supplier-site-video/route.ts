import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ExistingVideoRow = {
  video_id: number;
  file_url: string;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const filePath = String(body?.filePath || "").trim();
    const previousFilePath = String(body?.previousFilePath || "").trim() || null;

    if (!filePath) {
      return NextResponse.json(
        { error: "Uploaded video path is required." },
        { status: 400 }
      );
    }

    const { data: appUser, error: appUserError } = await supabase
      .from("users")
      .select("user_id")
      .eq("auth_user_id", authUser.id)
      .single();

    if (appUserError || !appUser) {
      return NextResponse.json(
        { error: "User record not found." },
        { status: 404 }
      );
    }

    const { data: businessProfile, error: businessProfileError } = await supabase
      .from("business_profiles")
      .select("profile_id")
      .eq("user_id", appUser.user_id)
      .single();

    if (businessProfileError || !businessProfile) {
      return NextResponse.json(
        { error: "Business profile not found." },
        { status: 404 }
      );
    }

    const { data: existingVideo, error: existingVideoError } = await supabase
      .from("site_showcase_videos")
      .select("video_id, file_url")
      .eq("profile_id", businessProfile.profile_id)
      .maybeSingle<ExistingVideoRow>();

    if (existingVideoError) {
      return NextResponse.json(
        { error: existingVideoError.message },
        { status: 500 }
      );
    }

    if (existingVideo) {
      const { error: updateError } = await supabase
        .from("site_showcase_videos")
        .update({
          file_url: filePath,
          status: "pending",
          analysis_result: null,
          uploaded_at: new Date().toISOString(),
          verified_at: null,
        })
        .eq("video_id", existingVideo.video_id);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }

      const oldFilePath = previousFilePath || existingVideo.file_url;

      if (oldFilePath && oldFilePath !== filePath) {
        await supabase.storage
          .from("site-showcase-videos")
          .remove([oldFilePath]);
      }
    } else {
      const { error: insertError } = await supabase
        .from("site_showcase_videos")
        .insert({
          profile_id: businessProfile.profile_id,
          file_url: filePath,
          status: "pending",
          analysis_result: null,
          uploaded_at: new Date().toISOString(),
          verified_at: null,
        });

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected upload error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}