import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function generatePresignedUrl(env, key, contentType) {
    if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_ACCOUNT_ID) {
        throw { message: "R2 Credentials missing on server", status: 500 };
    }

    const S3 = new S3Client({
        region: "auto",
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: env.R2_ACCESS_KEY_ID,
            secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        },
        // DISABLE automatic checksums which break presigned URLs for browsers
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
    });

    const command = new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME || 'file60-files',
        Key: key,
        ContentType: contentType,
        // Optional: Enforce specific Metadata
        Metadata: {
            // "expires": ... (S3 metadata is usually lowercased)
        }
    });

    // Valid for 1 hour (3600 seconds)
    return await getSignedUrl(S3, command, { expiresIn: 3600 });
}
