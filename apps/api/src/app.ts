import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.js";
import { consentRouter } from "./routes/consent.js";
import { profileRouter } from "./routes/profile.js";
import { logsRouter } from "./routes/logs.js";
import { reportsRouter } from "./routes/reports.js";
import { agentExecutionsRouter } from "./routes/agentExecutions.js";
import { careRouter } from "./routes/care.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  // No cookies anymore (bearer-token auth works on mobile, cookies don't),
  // so `credentials: true` isn't needed — the client just sends an
  // Authorization header. Native apps never hit this at all (no browser, no
  // CORS); this only gates browser-based clients (apps/web, `expo start --web`).
  app.use(
    cors({
      origin: (origin, callback) => {
        // No `Origin` header at all (native apps, curl, server-to-server)
        // is not a browser request and isn't subject to CORS — allow it.
        if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
        callback(new Error("Not allowed by CORS"));
      },
    })
  );
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", demoMode: env.demoMode });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/consent", consentRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/logs", logsRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/agent-executions", agentExecutionsRouter);
  app.use("/api/care", careRouter);

  app.use(errorHandler);

  return app;
}
