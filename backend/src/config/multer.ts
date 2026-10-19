import multer from 'multer';
import path from 'path';
import fs from 'fs';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

const receiptFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MIME_TYPES.has(file.mimetype) && ALLOWED_EXTENSIONS.has(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype} (${ext}). Only JPEG, PNG, WEBP, and PDF files are allowed.`));
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = path.resolve(process.cwd(), 'uploads/receipts');
    if (req.baseUrl.includes('invoice') || file.fieldname === 'invoice') {
      uploadPath = path.resolve(process.cwd(), 'uploads/invoices');
    }
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: receiptFileFilter,
});

const ALLOWED_MEMORY_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
]);

const memoryFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.csv', '.xlsx', '.xls']);
  if ((ALLOWED_MEMORY_MIME_TYPES.has(file.mimetype) || file.mimetype === '') && allowedExts.has(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported upload format: ${file.mimetype} (${ext})`));
  }
};

export const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: memoryFileFilter,
});

export default upload;
