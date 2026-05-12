import { supabase } from "@/integrations/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export async function uploadRiderDoc(
  userId: string,
  field: "profile_photo" | "id_doc" | "license_doc" | "vehicle_doc",
  file: File
): Promise<string> {
  validate(file);
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${userId}/${field}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("rider-docs")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return path;
}

export async function uploadPod(orderId: string, file: File): Promise<string> {
  validate(file);
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${orderId}/pod-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("pod")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}

export async function signedUrl(
  bucket: "rider-docs" | "pod",
  path: string,
  seconds = 300
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, seconds);
  if (error) return null;
  return data.signedUrl;
}

function validate(file: File) {
  if (file.size > MAX_BYTES) throw new Error("File too large (max 5 MB)");
  if (!ALLOWED.includes(file.type)) throw new Error("Only JPG, PNG, WEBP, or PDF allowed");
}
