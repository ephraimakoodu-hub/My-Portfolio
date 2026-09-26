const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');

const MAX_BYTES =
  Number(process.env.MAX_UPLOAD_MB || 8) * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const UPLOAD_ROOT = path.resolve(
  process.cwd(),
  process.env.UPLOAD_DIR || './uploads'
);

// Memory storage only: we never trust or write the client-supplied file
// straight to disk. We inspect the real bytes first, then re-encode the
// image ourselves.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_BYTES,
    files: 20,
  },

  fileFilter(req, file, cb) {
    // Cheap first pass using the declared MIME type.
    // The real validation happens in processAndSaveImage().
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(
        new Error('Only JPEG, PNG or WEBP images are allowed.')
      );
    }

    cb(null, true);
  },
});

function safeFilename(ext) {
  return `${Date.now()}-${crypto
    .randomBytes(12)
    .toString('hex')}.${ext}`;
}

/**
 * Validates a single uploaded file's real content using magic bytes,
 * then re-encodes it with sharp and saves it as WebP.
 */
async function processAndSaveImage(fileBuffer, subDir) {
  // file-type is ESM, so we load it dynamically inside this
  // CommonJS async function.
  const { fileTypeFromBuffer } = await import('file-type');

  const detected = await fileTypeFromBuffer(fileBuffer);

  if (!detected || !ALLOWED_MIME.has(detected.mime)) {
    throw new Error(
      'File content does not match an allowed image type.'
    );
  }

  const destDir = path.join(UPLOAD_ROOT, subDir);

  fs.mkdirSync(destDir, {
    recursive: true,
  });

  const filename = safeFilename('webp');

  const destPath = path.join(
    destDir,
    filename
  );

  // Re-encode through sharp to normalize the image and remove
  // embedded metadata/non-image payloads.
  await sharp(fileBuffer)
    .rotate()
    .resize({
      width: 1920,
      withoutEnlargement: true,
    })
    .webp({
      quality: 82,
    })
    .toFile(destPath);

  return {
    filename,
    relativePath: path.posix.join(
      subDir,
      filename
    ),
  };
}

function deleteImageFile(subDir, filename) {
  if (!filename) return;

  const p = path.join(
    UPLOAD_ROOT,
    subDir,
    path.basename(filename)
  );

  // Best-effort deletion; missing files are not treated as errors.
  fs.unlink(p, () => {});
}

module.exports = {
  upload,
  processAndSaveImage,
  deleteImageFile,
  UPLOAD_ROOT,
};
