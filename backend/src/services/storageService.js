import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export const uploadImage = async (buffer, folder = 'shiftboard') => {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return { url: 'https://via.placeholder.com/200', mock: true };
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) reject(error);
        else resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });
};

export const deleteImage = async (publicId) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME) return;
  return cloudinary.uploader.destroy(publicId);
};
