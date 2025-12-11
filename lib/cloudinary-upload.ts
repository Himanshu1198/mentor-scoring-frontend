/**
 * Cloudinary Upload Utility
 * Handles video uploads to Cloudinary with proper metadata
 */

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dtzkpiqqu';
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '';

interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  url: string;
  duration?: number;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  error?: {
    message: string;
  };
}

/**
 * Upload a video file to Cloudinary
 * @param file - The video file to upload
 * @param mentorId - The mentor ID for organization
 * @param sessionId - The session ID for organization
 * @param onProgress - Optional progress callback
 * @returns Upload result with public_id and secure_url
 */
export async function uploadVideoToCloudinary(
  file: File,
  mentorId: string,
  sessionId: string,
  onProgress?: (progress: number) => void
): Promise<CloudinaryUploadResponse> {
  try {
    // Create FormData for upload
    const formData = new FormData();
    formData.append('file', file);
    
    // Only add upload_preset if it's configured (leave blank if not needed)
    if (CLOUDINARY_UPLOAD_PRESET) {
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    }
    
    // Add metadata as public_id for organization
    const publicId = `mentor_videos/${mentorId}/${sessionId}`;
    formData.append('public_id', publicId);
    formData.append('folder', 'mentor_videos');
    formData.append('overwrite', 'true');
    formData.append('invalidate', 'true');
    formData.append('tags', `mentor,session,${mentorId}`);

    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Upload failed');
    }

    const data: CloudinaryUploadResponse = await response.json();

    return {
      public_id: data.public_id,
      secure_url: data.secure_url,
      url: data.url,
      duration: data.duration,
      width: data.width,
      height: data.height,
      format: data.format,
      bytes: data.bytes,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
}

/**
 * Delete a video from Cloudinary
 * @param publicId - The public ID of the video to delete
 */
export async function deleteVideoFromCloudinary(publicId: string): Promise<void> {
  try {
    // Note: Client-side deletion requires an API endpoint on your backend
    // as we don't want to expose the API secret on the client
    const response = await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicId }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete video');
    }
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
}
