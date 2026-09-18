import { v2 as cloudinary } from 'cloudinary';
import { ENV } from './env.js';

if (ENV.CLOUDINARY_CLOUD_NAME && ENV.CLOUDINARY_API_KEY && ENV.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
    api_key: ENV.CLOUDINARY_API_KEY,
    api_secret: ENV.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/**
 * Uploads a base64 or remote URL string to Cloudinary.
 * If Cloudinary credentials are not configured, returns the original input as fallback.
 *
 * @param {string} imageStr - Base64 data URI (e.g. data:image/png;base64,...) or file URI
 * @param {string} folder - Folder name in Cloudinary (e.g. 'kyc_documents')
 * @returns {Promise<string>} Secure URL of uploaded image, or raw imageStr fallback
 */
export const uploadImageToCloudinary = async (imageStr, folder = 'inventory_app') => {
  if (!imageStr) return '';

  // If Cloudinary is not configured or already a hosted HTTP/HTTPS url, return as is
  if (!ENV.CLOUDINARY_CLOUD_NAME || !ENV.CLOUDINARY_API_KEY || !ENV.CLOUDINARY_API_SECRET) {
    return imageStr;
  }

  if (typeof imageStr === 'string' && imageStr.startsWith('http://') || imageStr.startsWith('https://')) {
    return imageStr;
  }

  try {
    const uploadResult = await cloudinary.uploader.upload(imageStr, {
      folder,
      resource_type: 'auto',
    });
    return uploadResult.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Image upload failed: ${error.message}`);
  }
};

export default cloudinary;
