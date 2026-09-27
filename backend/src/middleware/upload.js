const multer = require('multer');
const crypto = require('crypto');
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');

const MAX_BYTES =
  Number(process.env.MAX_UPLOAD_MB || 8) * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const BUCKET = 'uploads';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Memory storage only.
const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_BYTES,
    files: 20,
  },

  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(
        new Error('Only JPEG, PNG or WEBP images are allowed.')
      );
    }

    cb(null, true);
  },
});

function safeFilename() {
  return `${Date.now()}-${crypto
    .randomBytes(12)
    .toString('hex')}.webp`;
}

/**
 * Validates the real file content, converts it to WebP,
 * then uploads it to Supabase Storage.
 */
async function processAndSaveImage(fileBuffer, subDir) {
  const { fileTypeFromBuffer } = await import('file-type');

  const detected = await fileTypeFromBuffer(fileBuffer);

  if (!detected || !ALLOWED_MIME.has(detected.mime)) {
    throw new Error(
      'File content does not match an allowed image type.'
    );
  }

  const filename = safeFilename();

  const storagePath = `${subDir}/${filename}`;

  // Convert and optimize the image in memory.
  const optimizedBuffer = await sharp(fileBuffer)
    .rotate()
    .resize({
      width: 1920,
      withoutEnlargement: true,
    })
    .webp({
      quality: 82,
    })
    .toBuffer();

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, optimizedBuffer, {
      contentType: 'image/webp',
      cacheControl: '2592000',
      upsert: false,
    });

  if (error) {
    console.error('Supabase Storage upload error:', error);
    throw new Error('Failed to upload image.');
  }

  const {
    data: { publicUrl },
  } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  return {
    filename,
    relativePath: storagePath,
    publicUrl,
  };
}

/**
 * Deletes an image from Supabase Storage.
 */
async function deleteImageFile(subDir, filename) {
  if (!filename) return;

  const cleanFilename = filename
    .replace(/^\/+/, '')
    .split('/')
    .pop();

  if (!cleanFilename) return;

  const storagePath = `${subDir}/${cleanFilename}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([storagePath]);

  if (error) {
    console.error(
      'Supabase Storage delete error:',
      error
    );
  }
}

module.exports = {
  upload,
  processAndSaveImage,
  deleteImageFile,
};