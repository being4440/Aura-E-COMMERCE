const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadImage = async (fileBuffer, mimetype, folder = 'ecommerce') => {
  try {
    const b64 = Buffer.from(fileBuffer).toString('base64');
    const dataURI = `data:${mimetype};base64,${b64}`;
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: folder,
      resource_type: 'auto'
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Image upload failed');
  }
};

const deleteImage = async (imageUrl) => {
  try {
    if (!imageUrl || !imageUrl.includes('cloudinary.com')) return;
    
    // Extract public_id from Cloudinary URL
    // URL format: https://res.cloudinary.com/<cloud_name>/image/upload/v1234567890/folder/image.jpg
    const parts = imageUrl.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return;
    
    let publicIdWithExtension = parts.slice(uploadIndex + 1).join('/');
    
    // Remove version tag if present (e.g., v1712345678)
    if (publicIdWithExtension.startsWith('v') && !isNaN(publicIdWithExtension.split('/')[0].substring(1))) {
      publicIdWithExtension = publicIdWithExtension.split('/').slice(1).join('/');
    }
    
    // Remove file extension
    const lastDotIndex = publicIdWithExtension.lastIndexOf('.');
    const publicId = lastDotIndex !== -1 ? publicIdWithExtension.substring(0, lastDotIndex) : publicIdWithExtension;
    
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
      console.log(`Deleted image from Cloudinary: ${publicId}`);
    }
  } catch (error) {
    console.error('Cloudinary delete error:', error);
  }
};

module.exports = { cloudinary, uploadImage, deleteImage };
