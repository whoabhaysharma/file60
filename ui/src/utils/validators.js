// File Validation Utilities

/**
 * Validate file size
 */
export function validateFileSize(file, maxSize) {
    if (file.size > maxSize) {
        return {
            valid: false,
            error: `Max size is ${Math.round(maxSize / (1024 * 1024))}MB.`
        };
    }

    return { valid: true };
}

/**
 * Validate file
 */
export function validateFile(file, maxSize) {
    if (!file) {
        return {
            valid: false,
            error: 'No file provided'
        };
    }

    return validateFileSize(file, maxSize);
}
