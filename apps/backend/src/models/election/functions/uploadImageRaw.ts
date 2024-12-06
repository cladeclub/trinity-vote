import { S3Client, PutObjectCommand, PutObjectCommandInput } from '@aws-sdk/client-s3';
import sharp from 'sharp';

import generateRandomHex from '../../../utils/generateRandomHex.js';

if (!process.env.AWS_BUCKET_NAME || !process.env.AWS_BUCKET_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY)
  console.error('AWS_BUCKET_NAME, AWS_BUCKET_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY environment variables not set');

const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'zkvot';
const AWS_BUCKET_REGION = process.env.AWS_BUCKET_REGION || 'eu-central-1'
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || '';
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || '';

const s3Client = new S3Client({
  region: AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  }
});

export default (
  image_raw: string,
  callback: (err: string | null, imageUrl?: string) => void
) => {
  const fileName = `${generateRandomHex()}.webp`;

  sharp(Buffer.from(image_raw, 'base64'))
    .webp()
    .toBuffer()
    .then(imageBuffer => {
      const uploadParams: PutObjectCommandInput = {
        Bucket: AWS_BUCKET_NAME,
        Key: fileName,
        Body: imageBuffer,
        ContentType: 'image/webp'
      };

      s3Client.send(new PutObjectCommand(uploadParams), (err, _data) => {
        if (err) return callback('upload_failed');

        const imageUrl = `https://${AWS_BUCKET_NAME}.s3.${AWS_BUCKET_REGION}.amazonaws.com/${fileName}`;

        return callback(null, imageUrl);
      });
    })
    .catch((err: any) => {
      console.log(err);
      return callback('image_processing_error');
    });
};
