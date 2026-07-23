import { createAdminSupabaseClient } from '@/lib/supabase/server'

export type SignedUploadResult =
  | { success: true; data: { signedUrl: string; path: string; token: string } }
  | { success: false; error: string }

export interface CreateBucketSignedUploadUrlParams {
  bucket: string
  pathPrefix: string
  userId: string
  fileName: string
  maxFileNameLength?: number
  errorLogLabel?: string
  errorMessage?: string
}

/**
 * Sanitizes a filename and requests a signed upload URL for it in the given
 * Storage bucket, scoped under `{pathPrefix}/{userId}/`. Shared by every
 * feature that lets a user upload directly to Storage via a signed URL
 * (Aufsätze, Rubriken, ...) — bucket, path prefix and auth role stay
 * feature-specific and are passed in by the caller.
 */
export async function createBucketSignedUploadUrl(
  params: CreateBucketSignedUploadUrlParams
): Promise<SignedUploadResult> {
  const {
    bucket,
    pathPrefix,
    userId,
    fileName,
    maxFileNameLength = 100,
    errorLogLabel = 'Signed URL creation error',
    errorMessage = 'Konnte Upload-URL nicht erstellen.',
  } = params

  const sanitizedName = fileName
    .replace(/[^a-zA-Z0-9äöüÄÖÜß._-]/g, '_')
    .substring(0, maxFileNameLength)

  const uniqueId = crypto.randomUUID()
  const filePath = `${pathPrefix}/${userId}/${uniqueId}--${sanitizedName}`

  const adminSupabase = createAdminSupabaseClient()

  const { data, error } = await adminSupabase.storage
    .from(bucket)
    .createSignedUploadUrl(filePath)

  if (error) {
    console.error(`${errorLogLabel}:`, error)
    return { success: false, error: errorMessage }
  }

  return {
    success: true,
    data: {
      signedUrl: data.signedUrl,
      path: filePath,
      token: data.token,
    },
  }
}
