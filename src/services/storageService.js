const { cloudinary } = require("../config/cloudinary");
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const env = require("../config/env");
const { NotFoundError } = require("../utils/errors");

const s3Client = env.s3BucketName ? new S3Client({
  region: env.s3Region,
  credentials: env.s3AccessKey && env.s3SecretKey ? {
    accessKeyId: env.s3AccessKey,
    secretAccessKey: env.s3SecretKey
  } : undefined
}) : null;

async function uploadBuffer({ buffer, folder, resourceType = "auto" }) {
  if (!buffer) {
    throw new NotFoundError("No file buffer provided");
  }
  const dataUri = `data:application/octet-stream;base64,${buffer.toString("base64")}`;
  const response = await cloudinary.uploader.upload(dataUri, { folder, resource_type: resourceType });
  return { url: response.secure_url, bytes: response.bytes, publicId: response.public_id };
}

async function uploadBufferToProvider({ buffer, folder, resourceType = "auto", provider = "cloudinary", filename = `${Date.now()}` }) {
  if (provider === "s3") {
    if (!s3Client || !env.s3BucketName) {
      throw new NotFoundError("S3 is not configured");
    }
    const key = `${folder}/${filename}`;
    await s3Client.send(new PutObjectCommand({
      Bucket: env.s3BucketName,
      Key: key,
      Body: buffer,
      ContentType: resourceType === "video" ? "video/mp4" : "application/octet-stream"
    }));
    return {
      url: `https://${env.s3BucketName}.s3.${env.s3Region}.amazonaws.com/${key}`,
      bytes: buffer.length,
      publicId: key
    };
  }
  return uploadBuffer({ buffer, folder, resourceType });
}

async function deleteFile(publicId, resourceType = "image") {
  if (!publicId) {
    return null;
  }
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

async function deleteFileFromProvider(publicId, resourceType = "image", provider = "cloudinary") {
  if (!publicId) {
    return null;
  }
  if (provider === "s3") {
    if (!s3Client || !env.s3BucketName) {
      return null;
    }
    return s3Client.send(new DeleteObjectCommand({ Bucket: env.s3BucketName, Key: publicId }));
  }
  return deleteFile(publicId, resourceType);
}

module.exports = { uploadBuffer, uploadBufferToProvider, deleteFile, deleteFileFromProvider };
