import crypto from "node:crypto";
import path from "node:path";
import type { Response } from "express";
import { z } from "zod";
import { REPORTS_BUCKET, supabaseAdmin } from "../config/supabase.js";
import { HttpError } from "../middleware/errorHandler.js";
import type { AuthedRequest } from "../middleware/auth.js";

const extractedValueSchema = z.object({
  parameter: z.string(),
  value: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  reference_range: z.string().nullable().optional(),
  status: z.string(),
  source_line: z.string().nullable().optional(),
});

const sourceSchema = z.object({
  title: z.string(),
  source: z.string(),
  url: z.string().nullable().optional(),
  topic: z.string(),
});

const resultSchema = z.object({
  emergency: z.boolean().optional().default(false),
  extracted_values: z.array(extractedValueSchema).optional().default([]),
  ocr: z.unknown().optional(),
  document_intelligence: z.unknown().optional(),
  womens_health: z.unknown().optional(),
  risk_assessment: z.unknown().optional(),
  care_plan: z.unknown().optional(),
  questions_to_ask: z.array(z.string()).optional().default([]),
  sources: z.array(sourceSchema).optional().default([]),
  confidence: z.number().optional(),
  agent_trace: z.unknown().optional(),
  message: z.string().optional(),
  recommended_action: z.string().optional(),
  matched_signals: z.array(z.string()).optional(),
});

async function signedUrlFor(storagePath: string): Promise<string | null> {
  const { data } = await supabaseAdmin.storage.from(REPORTS_BUCKET).createSignedUrl(storagePath, 60 * 10);
  return data?.signedUrl ?? null;
}

// Clients (web + mobile) speak camelCase with `_id`; the database speaks
// snake_case. Map once here so every report endpoint returns the client shape.
async function withSignedUrl(report: Record<string, any>) {
  return {
    _id: report.id,
    fileName: report.file_name,
    mimeType: report.mime_type,
    fileSize: report.file_size,
    extractedValues: report.extracted_values ?? [],
    ocr: report.ocr,
    documentIntelligence: report.document_intelligence,
    womensHealth: report.womens_health,
    riskAssessment: report.risk_assessment,
    carePlan: report.care_plan,
    questionsToAsk: report.questions_to_ask ?? [],
    sources: report.sources ?? [],
    emergency: report.emergency ?? false,
    confidence: report.confidence,
    agentTrace: report.agent_trace,
    uploadedAt: report.uploaded_at,
    fileUrl: await signedUrlFor(report.storage_path),
  };
}

export async function uploadReport(req: AuthedRequest, res: Response) {
  if (!req.file) {
    throw new HttpError(400, "No file uploaded");
  }

  const rawResult = typeof req.body.result === "string" ? JSON.parse(req.body.result) : req.body.result;
  const parsed = resultSchema.safeParse(rawResult);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid analysis result payload");
  }
  const result = parsed.data;

  const ext = path.extname(req.file.originalname).slice(0, 10);
  const storagePath = `${req.userId}/${crypto.randomUUID()}${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(REPORTS_BUCKET)
    .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype });
  if (uploadError) {
    throw new HttpError(500, "Failed to store uploaded file");
  }

  const { data: report, error } = await supabaseAdmin
    .from("health_reports")
    .insert({
      user_id: req.userId,
      file_name: req.file.originalname,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
      storage_path: storagePath,
      extracted_values: result.extracted_values,
      ocr: result.ocr,
      document_intelligence: result.document_intelligence,
      womens_health: result.womens_health,
      risk_assessment: result.risk_assessment,
      care_plan: result.care_plan,
      questions_to_ask: result.questions_to_ask,
      sources: result.sources,
      emergency: result.emergency,
      confidence: result.confidence,
      agent_trace: result.agent_trace,
    })
    .select("*")
    .single();

  if (error || !report) {
    await supabaseAdmin.storage.from(REPORTS_BUCKET).remove([storagePath]).catch(() => {});
    throw new HttpError(500, "Failed to save report record");
  }

  res.status(201).json({ report: await withSignedUrl(report) });
}

export async function listReports(req: AuthedRequest, res: Response) {
  const { data, error } = await supabaseAdmin
    .from("health_reports")
    .select("*")
    .eq("user_id", req.userId)
    .order("uploaded_at", { ascending: false });

  if (error) throw new HttpError(500, "Failed to list reports");
  res.json({ reports: await Promise.all((data ?? []).map(withSignedUrl)) });
}

export async function getReport(req: AuthedRequest, res: Response) {
  const { data: report, error } = await supabaseAdmin
    .from("health_reports")
    .select("*")
    .eq("id", req.params.id)
    .eq("user_id", req.userId)
    .single();

  if (error || !report) {
    throw new HttpError(404, "Report not found");
  }
  res.json({ report: await withSignedUrl(report) });
}

export async function deleteReport(req: AuthedRequest, res: Response) {
  const { data: report, error } = await supabaseAdmin
    .from("health_reports")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.userId)
    .select("storage_path")
    .single();

  if (error || !report) {
    throw new HttpError(404, "Report not found");
  }
  await supabaseAdmin.storage.from(REPORTS_BUCKET).remove([report.storage_path]).catch(() => {});
  res.status(204).send();
}
