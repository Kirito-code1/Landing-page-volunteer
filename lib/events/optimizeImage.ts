const MAX_DIMENSION = 1600;
const TARGET_FILE_SIZE_BYTES = 900_000;
const FALLBACK_OUTPUT_TYPE = "image/jpeg";

function isBrowserSupported() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load the selected image."));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function getOutputType(file: File) {
  if (file.type === "image/jpeg" || file.type === "image/webp" || file.type === "image/png") {
    return file.type;
  }

  return FALLBACK_OUTPUT_TYPE;
}

function getOutputExtension(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function optimizeEventImageFile(file: File) {
  try {
    if (!isBrowserSupported() || !file.type.startsWith("image/") || file.type === "image/svg+xml") {
      return file;
    }

    const image = await loadImageFromFile(file);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const largestSide = Math.max(sourceWidth, sourceHeight);
    const needsResize = largestSide > MAX_DIMENSION;
    const needsCompression = file.size > TARGET_FILE_SIZE_BYTES;

    if (!needsResize && !needsCompression) {
      return file;
    }

    const scale = needsResize ? MAX_DIMENSION / largestSide : 1;
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const outputType = getOutputType(file);
    const quality = outputType === "image/png" ? undefined : 0.82;
    const blob = await canvasToBlob(canvas, outputType, quality);

    if (!blob || blob.size >= file.size) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "event-image";
    return new File([blob], `${baseName}.${getOutputExtension(blob.type)}`, {
      type: blob.type,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
