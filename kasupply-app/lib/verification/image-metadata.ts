const JPEG_EXIF_SEGMENT_MARKER = 0xffe1;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const SITE_IMAGE_MAX_AGE_DAYS = 120;

type ParsedExifValue = {
  datetimeOriginal: string | null;
  datetime: string | null;
};

export type ImageCaptureMetadata = {
  capturedAt: string | null;
  source: "exif_datetime_original" | "exif_datetime" | "png_text" | null;
  ageDays: number | null;
  isRecent: boolean;
  raw: Record<string, unknown>;
};

function parseExifDate(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  const match = normalized.match(
    /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/
  );

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
}

function calculateAgeDays(isoDate: string | null) {
  if (!isoDate) {
    return null;
  }

  const parsed = Date.parse(isoDate);

  if (Number.isNaN(parsed)) {
    return null;
  }

  return Math.floor((Date.now() - parsed) / (1000 * 60 * 60 * 24));
}

function readAsciiString(
  bytes: Buffer,
  offset: number,
  length: number
) {
  return bytes
    .subarray(offset, offset + length)
    .toString("ascii")
    .replace(/\0+$/g, "")
    .trim();
}

function parseTiffExif(bytes: Buffer, tiffStart: number) {
  if (bytes.length < tiffStart + 8) {
    return {
      datetimeOriginal: null,
      datetime: null,
    } satisfies ParsedExifValue;
  }

  const byteOrder = bytes.toString("ascii", tiffStart, tiffStart + 2);
  const littleEndian = byteOrder === "II";

  if (!littleEndian && byteOrder !== "MM") {
    return {
      datetimeOriginal: null,
      datetime: null,
    } satisfies ParsedExifValue;
  }

  const readUInt16 = (offset: number) =>
    littleEndian ? bytes.readUInt16LE(offset) : bytes.readUInt16BE(offset);
  const readUInt32 = (offset: number) =>
    littleEndian ? bytes.readUInt32LE(offset) : bytes.readUInt32BE(offset);

  const readIfd = (ifdOffset: number) => {
    if (ifdOffset <= 0 || tiffStart + ifdOffset + 2 > bytes.length) {
      return [] as Array<{
        tag: number;
        type: number;
        count: number;
        valueOffset: number;
        entryOffset: number;
      }>;
    }

    const directoryOffset = tiffStart + ifdOffset;
    const entryCount = readUInt16(directoryOffset);
    const entries: Array<{
      tag: number;
      type: number;
      count: number;
      valueOffset: number;
      entryOffset: number;
    }> = [];

    for (let index = 0; index < entryCount; index += 1) {
      const entryOffset = directoryOffset + 2 + index * 12;

      if (entryOffset + 12 > bytes.length) {
        break;
      }

      entries.push({
        tag: readUInt16(entryOffset),
        type: readUInt16(entryOffset + 2),
        count: readUInt32(entryOffset + 4),
        valueOffset: readUInt32(entryOffset + 8),
        entryOffset,
      });
    }

    return entries;
  };

  const readAsciiFromEntry = (entry: {
    type: number;
    count: number;
    valueOffset: number;
    entryOffset: number;
  }) => {
    if (entry.type !== 2 || entry.count <= 1) {
      return null;
    }

    if (entry.count <= 4) {
      return readAsciiString(bytes, entry.entryOffset + 8, entry.count);
    }

    const valueStart = tiffStart + entry.valueOffset;

    if (valueStart < 0 || valueStart + entry.count > bytes.length) {
      return null;
    }

    return readAsciiString(bytes, valueStart, entry.count);
  };

  const firstIfdOffset = readUInt32(tiffStart + 4);
  const firstIfdEntries = readIfd(firstIfdOffset);
  const datetimeEntry = firstIfdEntries.find((entry) => entry.tag === 0x0132);
  const exifPointerEntry = firstIfdEntries.find((entry) => entry.tag === 0x8769);
  const exifIfdEntries =
    exifPointerEntry && exifPointerEntry.type === 4
      ? readIfd(exifPointerEntry.valueOffset)
      : [];
  const datetimeOriginalEntry = exifIfdEntries.find((entry) => entry.tag === 0x9003);

  return {
    datetimeOriginal: readAsciiFromEntry(datetimeOriginalEntry) ?? null,
    datetime: readAsciiFromEntry(datetimeEntry) ?? null,
  } satisfies ParsedExifValue;
}

function extractJpegExifDate(bytes: Buffer) {
  let offset = 2;

  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      break;
    }

    const marker = bytes.readUInt16BE(offset);
    const segmentLength = bytes.readUInt16BE(offset + 2);

    if (marker === JPEG_EXIF_SEGMENT_MARKER) {
      const exifStart = offset + 4;
      const exifHeader = bytes.toString("ascii", exifStart, exifStart + 6);

      if (exifHeader === "Exif\0\0") {
        return parseTiffExif(bytes, exifStart + 6);
      }
    }

    if (segmentLength <= 2) {
      break;
    }

    offset += 2 + segmentLength;
  }

  return {
    datetimeOriginal: null,
    datetime: null,
  } satisfies ParsedExifValue;
}

function extractPngCreationDate(bytes: Buffer) {
  if (!bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    return null;
  }

  let offset = PNG_SIGNATURE.length;

  while (offset + 8 <= bytes.length) {
    const chunkLength = bytes.readUInt32BE(offset);
    const chunkType = bytes.toString("ascii", offset + 4, offset + 8);
    const dataOffset = offset + 8;
    const dataEnd = dataOffset + chunkLength;

    if (dataEnd + 4 > bytes.length) {
      break;
    }

    if (chunkType === "tEXt") {
      const rawText = bytes.toString("utf8", dataOffset, dataEnd);
      const separatorIndex = rawText.indexOf("\0");

      if (separatorIndex >= 0) {
        const keyword = rawText.slice(0, separatorIndex).trim().toLowerCase();
        const value = rawText.slice(separatorIndex + 1).trim();

        if (keyword === "creation time" || keyword === "date:create") {
          const parsed = Date.parse(value);
          if (!Number.isNaN(parsed)) {
            return new Date(parsed).toISOString();
          }
        }
      }
    }

    offset = dataEnd + 4;
  }

  return null;
}

export function extractImageCaptureMetadata(params: {
  bytes: Buffer;
  mimeType: string;
}) {
  let capturedAt: string | null = null;
  let source: ImageCaptureMetadata["source"] = null;

  if (params.mimeType === "image/jpeg" || params.mimeType === "image/jpg") {
    const exifData = extractJpegExifDate(params.bytes);
    capturedAt = parseExifDate(exifData.datetimeOriginal);
    source = capturedAt ? "exif_datetime_original" : null;

    if (!capturedAt) {
      capturedAt = parseExifDate(exifData.datetime);
      source = capturedAt ? "exif_datetime" : null;
    }
  } else if (params.mimeType === "image/png") {
    capturedAt = extractPngCreationDate(params.bytes);
    source = capturedAt ? "png_text" : null;
  }

  const ageDays = calculateAgeDays(capturedAt);

  return {
    capturedAt,
    source,
    ageDays,
    isRecent: ageDays != null && ageDays >= 0 && ageDays <= SITE_IMAGE_MAX_AGE_DAYS,
    raw: {
      mimeType: params.mimeType,
      maxAgeDays: SITE_IMAGE_MAX_AGE_DAYS,
    },
  } satisfies ImageCaptureMetadata;
}

export { SITE_IMAGE_MAX_AGE_DAYS };
