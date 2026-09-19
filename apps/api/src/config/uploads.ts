import multer from "multer";

const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;

// Buffered in memory, then handed to Supabase Storage by reportsController —
// no local disk involved, so this works the same whether the gateway runs on
// a single box or an autoscaled/ephemeral host.
export const reportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Upload a PDF, JPG, or PNG.`));
      return;
    }
    cb(null, true);
  },
});
