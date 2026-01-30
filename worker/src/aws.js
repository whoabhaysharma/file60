import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getS3Client(env) {
    const accessKeyId = env.R2_ACCESS_KEY_ID || env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = env.R2_SECRET_ACCESS_KEY || env.AWS_SECRET_ACCESS_KEY;
    const endpoint = env.R2_ENDPOINT || env.S3_ENDPOINT || `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

    if (!accessKeyId || !secretAccessKey) {
        throw { message: "Storage Credentials missing on server", status: 500 };
    }

    return new S3Client({
        region: "auto",
        endpoint: endpoint,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
        // DISABLE automatic checksums which break presigned URLs for browsers
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
    });
}

export async function generatePresignedUrl(env, key, contentType, contentLength, cacheControl) {
    const S3 = getS3Client(env);

    const command = new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME || 'file60-files',
        Key: key,
        ContentType: contentType,
        ContentLength: contentLength,
        CacheControl: cacheControl,
        // Optional: Enforce specific Metadata
        Metadata: {
            // "expires": ... (S3 metadata is usually lowercased)
        }
    });

    // Valid for 1 hour (3600 seconds)
    return await getSignedUrl(S3, command, { expiresIn: 3600 });
}

export async function getFileFromS3(env, key) {
    const S3 = getS3Client(env);

    try {
        const command = new GetObjectCommand({
            Bucket: env.R2_BUCKET_NAME || 'file60-files',
            Key: key
        });

        const response = await S3.send(command);
        return response;
    } catch (err) {
        if (err.name === 'NoSuchKey') return null;
        throw err;
    }
}

