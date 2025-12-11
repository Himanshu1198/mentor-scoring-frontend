/**
 * Cloudinary Upload Utility
 * Handles video uploads to Cloudinary with backend-signed authentication
 */

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dtzkpiqqu';
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://mentor-scoring-backend-1.onrender.com').replace(/\/$/, ''); // Remove trailing slash

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

interface SignatureResponse {
  signature: string;
  timestamp: number;
  api_key: string;
}

/**
 * Get upload signature from backend
 * The backend signs the upload using the API secret (which stays private)
 */
async function getUploadSignature(
  mentorId: string,
  sessionId: string
): Promise<SignatureResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/cloudinary/signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mentorId,
        sessionId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get upload signature');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting upload signature:', error);
    throw error;
  }
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
    // Step 1: Get upload signature from backend
    console.log('Getting upload signature from backend...');
    const { signature, timestamp, api_key } = await getUploadSignature(mentorId, sessionId);

    // Step 2: Create FormData for signed upload
    const formData = new FormData();
    formData.append('file', file);
    
    // Signed upload parameters
    const publicId = `mentor_videos/${mentorId}/${sessionId}`;
    formData.append('public_id', publicId);
    formData.append('folder', 'mentor_videos');
    formData.append('overwrite', 'true');
    formData.append('invalidate', 'true');
    formData.append('tags', `mentor,session,${mentorId}`);
    
    // Signature parameters
    formData.append('api_key', api_key);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);

    // Step 3: Upload to Cloudinary
    console.log('Uploading video to Cloudinary...');
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
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

    console.log('Video uploaded successfully:', data.public_id);
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
    const response = await fetch(`${API_BASE_URL}/api/cloudinary/delete`, {
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
