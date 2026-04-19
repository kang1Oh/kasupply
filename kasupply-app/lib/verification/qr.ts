import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from "@zxing/library";
import { Jimp } from "jimp";

type ImageVariantBuilder = (image: Jimp) => Jimp;

function tryDecodeQrFromBitmap(
  rgbaData: Uint8ClampedArray,
  width: number,
  height: number
) {
  const hints = new Map();

  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
  hints.set(DecodeHintType.TRY_HARDER, true);

  const reader = new MultiFormatReader();

  reader.setHints(hints);

  const source = new RGBLuminanceSource(rgbaData, width, height);
  const bitmap = new BinaryBitmap(new HybridBinarizer(source));
  const result = reader.decode(bitmap);

  return result.getText();
}

function buildRegionVariants(image: Jimp) {
  const width = image.bitmap.width;
  const height = image.bitmap.height;

  const regionDefinitions = [
    { x: 0, y: 0, w: width, h: height },
    { x: Math.floor(width * 0.5), y: 0, w: Math.ceil(width * 0.5), h: height },
    { x: 0, y: Math.floor(height * 0.5), w: width, h: Math.ceil(height * 0.5) },
    {
      x: Math.floor(width * 0.45),
      y: Math.floor(height * 0.45),
      w: Math.ceil(width * 0.55),
      h: Math.ceil(height * 0.55),
    },
    {
      x: Math.floor(width * 0.6),
      y: Math.floor(height * 0.6),
      w: Math.ceil(width * 0.4),
      h: Math.ceil(height * 0.4),
    },
    {
      x: Math.floor(width * 0.6),
      y: 0,
      w: Math.ceil(width * 0.4),
      h: Math.ceil(height * 0.4),
    },
    {
      x: 0,
      y: Math.floor(height * 0.6),
      w: Math.ceil(width * 0.4),
      h: Math.ceil(height * 0.4),
    },
  ];

  return regionDefinitions.map((region) =>
    image.clone().crop({
      x: Math.max(0, region.x),
      y: Math.max(0, region.y),
      w: Math.max(1, Math.min(width - region.x, region.w)),
      h: Math.max(1, Math.min(height - region.y, region.h)),
    })
  );
}

function buildProcessingVariants(image: Jimp) {
  const variants: ImageVariantBuilder[] = [
    (source) => source.clone(),
    (source) => source.clone().greyscale().normalize().contrast(0.4),
    (source) =>
      source
        .clone()
        .greyscale()
        .normalize()
        .contrast(0.55)
        .threshold({ max: 180 }),
    (source) =>
      source
        .clone()
        .greyscale()
        .normalize()
        .contrast(0.65)
        .threshold({ max: 140 }),
    (source) =>
      source
        .clone()
        .greyscale()
        .normalize()
        .invert()
        .threshold({ max: 160 }),
  ];

  return variants.map((builder) => builder(image));
}

function buildScaledAndRotatedVariants(image: Jimp) {
  const scales = [1, 2, 3];
  const rotations = [0, 90, 180, 270];
  const variants: Jimp[] = [];

  for (const scale of scales) {
    const scaled = scale === 1 ? image.clone() : image.clone().scale(scale);

    for (const rotation of rotations) {
      variants.push(rotation === 0 ? scaled.clone() : scaled.clone().rotate(rotation));
    }
  }

  return variants;
}

export async function tryDecodeQrPayloadFromImageBytes(
  bytes: Buffer,
  mimeType: string
) {
  if (mimeType !== "image/png" && mimeType !== "image/jpeg") {
    return null;
  }

  const image = await Jimp.read(bytes);
  const regionVariants = buildRegionVariants(image);

  for (const region of regionVariants) {
    const processedVariants = buildProcessingVariants(region);

    for (const processedVariant of processedVariants) {
      const decodeCandidates = buildScaledAndRotatedVariants(processedVariant);

      for (const candidate of decodeCandidates) {
        try {
          return tryDecodeQrFromBitmap(
            Uint8ClampedArray.from(candidate.bitmap.data),
            candidate.bitmap.width,
            candidate.bitmap.height
          );
        } catch {
          continue;
        }
      }
    }
  }

  return null;
}
