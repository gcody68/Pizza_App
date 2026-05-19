import { supabase } from "@/integrations/supabase/client";

let _isDemoMode = false;
export function setImageUploadDemoMode(v: boolean) { _isDemoMode = v; }

const MAX_RAW_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB hard cap on raw input
const MAX_COMPRESSED_SIZE_BYTES = 5 * 1024 * 1024; // 5MB cap after compression
const MAX_WIDTH = 1200;
const JPEG_QUALITY = 0.8;
const BUCKET = "restaurant-assets";

export class ImageTooLargeError extends Error {
  constructor() {
    super("Image is too large even after compression. Please use a smaller image.");
    this.name = "ImageTooLargeError";
  }
}

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Image compression failed"));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

export async function uploadImage(file: File, folder: string = "menu"): Promise<string> {
  if (file.size > MAX_RAW_FILE_SIZE_BYTES) {
    throw new ImageTooLargeError();
  }

  const compressed = await compressImage(file);

  if (compressed.size > MAX_COMPRESSED_SIZE_BYTES) {
    throw new ImageTooLargeError();
  }

  if (_isDemoMode) {
    return URL.createObjectURL(compressed);
  }

  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, compressed, { upsert: true, contentType: "image/jpeg" });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}
