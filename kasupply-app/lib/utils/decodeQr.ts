import { Jimp } from "jimp";
import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  GlobalHistogramBinarizer,
  HybridBinarizer,
  MultiFormatReader,
  QRCodeReader,
  RGBLuminanceSource,
} from "@zxing/library";

type JimpLike = {
  bitmap: {
    data: Buffer | Uint8Array;
    width: number;
    height: number;
  };
  clone(): JimpLike;
  greyscale(): JimpLike;
  normalize(): JimpLike;
  contrast(amount: number): JimpLike;
  resize(options: { w: number }): JimpLike;
  rotate(angle: number): JimpLike;
};

const QR_DECODE_HINTS = new Map<DecodeHintType, unknown>([
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]],
  [DecodeHintType.TRY_HARDER, true],
]);

const PURE_QR_DECODE_HINTS = new Map<DecodeHintType, unknown>([
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]],
  [DecodeHintType.TRY_HARDER, true],
  [DecodeHintType.PURE_BARCODE, true],
]);

function toLuminanceData(image: JimpLike) {
  const { data, width, height } = image.bitmap;
  const luminance = new Uint8ClampedArray(width * height);

  for (let pixelIndex = 0, byteIndex = 0; pixelIndex < luminance.length; pixelIndex += 1, byteIndex += 4) {
    const red = data[byteIndex] ?? 0;
    const green = data[byteIndex + 1] ?? 0;
    const blue = data[byteIndex + 2] ?? 0;
    const alpha = (data[byteIndex + 3] ?? 255) / 255;

    // Blend transparency onto white so exported PNG alpha does not decode as black noise.
    const blendedRed = Math.round(red * alpha + 255 * (1 - alpha));
    const blendedGreen = Math.round(green * alpha + 255 * (1 - alpha));
    const blendedBlue = Math.round(blue * alpha + 255 * (1 - alpha));

    luminance[pixelIndex] = Math.round(0.299 * blendedRed + 0.587 * blendedGreen + 0.114 * blendedBlue);
  }

  return luminance;
}

function toBinaryBitmap(image: JimpLike, mode: "hybrid" | "global" = "hybrid") {
  const { width, height } = image.bitmap;
  const luminanceSource = new RGBLuminanceSource(toLuminanceData(image), width, height);
  const binarizer =
    mode === "global"
      ? new GlobalHistogramBinarizer(luminanceSource)
      : new HybridBinarizer(luminanceSource);

  return new BinaryBitmap(binarizer);
}

function tryDecodeWithMultiFormatReader(image: JimpLike) {
  const reader = new MultiFormatReader();

  reader.setHints(QR_DECODE_HINTS);

  try {
    return reader.decodeWithState(toBinaryBitmap(image, "hybrid")).getText();
  } finally {
    reader.reset();
  }
}

function tryDecodeWithPureQrReader(image: JimpLike) {
  const reader = new QRCodeReader();

  for (const mode of ["hybrid", "global"] as const) {
    try {
      return reader.decode(toBinaryBitmap(image, mode), PURE_QR_DECODE_HINTS).getText();
    } catch {
      // Try the next QR-specific decode strategy.
    }
  }

  return null;
}

function tryDecodeImage(image: JimpLike) {
  return tryDecodeWithMultiFormatReader(image) ?? tryDecodeWithPureQrReader(image);
}

function buildDecodeVariants(source: JimpLike) {
  const variants: JimpLike[] = [];
  const push = (image: JimpLike) => {
    variants.push(image);
  };

  push(source.clone());
  push(source.clone().greyscale());
  push(source.clone().greyscale().normalize());
  push(source.clone().greyscale().contrast(0.75).normalize());
  push(source.clone().greyscale().contrast(1));

  const scaledWidth = Math.min(Math.max(source.bitmap.width * 2, source.bitmap.width), 2400);

  if (scaledWidth > source.bitmap.width) {
    push(source.clone().resize({ w: scaledWidth }));
    push(source.clone().resize({ w: scaledWidth }).greyscale().normalize());
    push(
      source
        .clone()
        .resize({ w: scaledWidth })
        .greyscale()
        .contrast(0.75)
        .normalize()
    );
  }

  for (const angle of [90, 180, 270]) {
    push(source.clone().rotate(angle));
    push(source.clone().rotate(angle).greyscale().normalize());
  }

  return variants;
}

export async function decodeQrFromBuffer(buffer: Buffer): Promise<string | null> {
  try {
    const image = (await Jimp.read(buffer)) as unknown as JimpLike;
    const variants = buildDecodeVariants(image);

    for (const variant of variants) {
      try {
        const decoded = tryDecodeImage(variant);

        if (decoded) {
          return decoded;
        }
      } catch {
        // Try the next preprocessing variant.
      }
    }

    return null;
  } catch {
    return null; // QR not found or unreadable
  }
}
