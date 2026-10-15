import type { NextFunction, Request, Response } from "express";
import multer from "multer";

export class HttpError extends Error {
  status: number;
  /** Machine-readable reason clients can branch on, e.g. "email_not_verified". */
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.code ? { code: err.code } : {}) });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  // multer's fileFilter rejects with a plain Error, not a MulterError
  if (err instanceof Error && /^Unsupported file type/.test(err.message)) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}
