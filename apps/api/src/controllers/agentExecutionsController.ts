import type { Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../config/supabase.js";
import { HttpError } from "../middleware/errorHandler.js";
import type { AuthedRequest } from "../middleware/auth.js";

const agentStepSchema = z.object({
  agent: z.string(),
  duration_ms: z.number(),
});

const logSchema = z.object({
  triggerType: z.enum(["chat", "document"]),
  triggerRef: z.string().optional(),
  agents: z.array(agentStepSchema).default([]),
  emergency: z.boolean().optional().default(false),
  riskLevel: z.string().optional(),
});

export async function logAgentExecution(req: AuthedRequest, res: Response) {
  const parsed = logSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const data = parsed.data;

  const { data: execution, error } = await supabaseAdmin
    .from("agent_executions")
    .insert({
      user_id: req.userId,
      trigger_type: data.triggerType,
      trigger_ref: data.triggerRef,
      agents: data.agents,
      emergency: data.emergency,
      risk_level: data.riskLevel,
    })
    .select("*")
    .single();

  if (error || !execution) throw new HttpError(500, "Failed to log agent execution");
  res.status(201).json({ execution });
}

export async function listAgentExecutions(req: AuthedRequest, res: Response) {
  const { data, error } = await supabaseAdmin
    .from("agent_executions")
    .select("*")
    .eq("user_id", req.userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new HttpError(500, "Failed to list agent executions");
  res.json({ executions: data });
}
