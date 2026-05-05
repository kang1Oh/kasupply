import { NextResponse } from "next/server";
import {
  fetchBnrsAuthorityFromUrl,
  isBnrsSearchUrl,
  parseLegacyBuyerDtiQrText,
} from "@/lib/verification/bnrs";
import { decodeQrFromBuffer } from "@/lib/utils/decodeQr";

function qrDebugEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_QR_DEBUG_TOOL === "true"
  );
}

function classifyPayload(payloadText: string | null) {
  if (!payloadText) {
    return "none" as const;
  }

  if (parseLegacyBuyerDtiQrText(payloadText)) {
    return "legacy_text" as const;
  }

  if (isBnrsSearchUrl(payloadText)) {
    return "bnrs_url" as const;
  }

  return "unrecognized" as const;
}

export async function POST(request: Request) {
  if (!qrDebugEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload an image file first." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "QR debug currently supports image uploads only." },
      { status: 400 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const payloadText = await decodeQrFromBuffer(bytes);
  const payloadType = classifyPayload(payloadText);
  const response: Record<string, unknown> = {
    file: {
      name: file.name,
      mimeType: file.type,
      sizeBytes: bytes.length,
    },
    decoded: Boolean(payloadText),
    payloadType,
    payloadText,
    parsedLegacyFields:
      payloadType === "legacy_text" && payloadText
        ? parseLegacyBuyerDtiQrText(payloadText)?.fields ?? null
        : null,
    bnrsAuthority: null,
    notes: [] as string[],
  };

  if (!payloadText) {
    response.notes = [
      "No QR payload could be decoded from the uploaded image.",
      "If this is a full document image, try uploading the standalone QR image first.",
    ];

    return NextResponse.json(response);
  }

  if (payloadType === "legacy_text") {
    response.notes = [
      "The QR decoded successfully as legacy structured text.",
      "This format is supported by the buyer/supplier DTI verifier.",
    ];

    return NextResponse.json(response);
  }

  if (payloadType === "bnrs_url" && typeof payloadText === "string") {
    try {
      const authority = await fetchBnrsAuthorityFromUrl(payloadText, "qr_bnrs_url");

      response.bnrsAuthority = authority;
      response.notes = [
        "The QR decoded successfully as a BNRS URL.",
        "The BNRS authority page was fetched successfully.",
      ];
    } catch (error) {
      response.notes = [
        "The QR decoded as a BNRS URL, but the BNRS authority page could not be resolved.",
        error instanceof Error ? error.message : "Unknown BNRS resolution error.",
      ];
    }

    return NextResponse.json(response);
  }

  response.notes = [
    "The QR decoded successfully, but the payload was not recognized as legacy DTI text or a BNRS URL.",
  ];

  return NextResponse.json(response);
}
