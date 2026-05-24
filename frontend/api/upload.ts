import { v2 as cloudinary } from 'cloudinary';

// Configure from env vars (set in Vercel dashboard)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body; // base64 or URL

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const result = await cloudinary.uploader.upload(image, {
      folder: 'nba-cards',
      resource_type: 'image',
      transformation: [
        { width: 800, height: 800, crop: 'limit', quality: 'auto' },
      ],
    });

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (err: any) {
    console.error('Upload error:', err.message);
    res.status(500).json({ error: 'Upload failed' });
  }
}
