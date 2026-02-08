import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { scoringRouter } from "./routes/scoring.js";
import { mentorshipRouter } from "./routes/mentorship.js";
import { healthRouter } from "./routes/health.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

// ── Security ──
app.use(helmet());

// ── CORS — allow frontend origins ──
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://localhost:8080", "http://localhost:4173"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, health checks)
      if (!origin) return callback(null, true);
      if (allowedOrigins.some((allowed) => origin.startsWith(allowed) || allowed === "*")) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// ── Body parsing ──
app.use(express.json({ limit: "1mb" }));

// ── Rate limiting ──
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

app.use("/api/", apiLimiter);

// ── Routes ──
app.use("/api/health", healthRouter);
app.use("/api/score", scoringRouter);
app.use("/api/mentorship", mentorshipRouter);

// ── 404 handler ──
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ── Error handler ──
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 JudgeMate-AI API server running on port ${PORT}`);
  console.log(`   Allowed origins: ${allowedOrigins.join(", ")}`);
  console.log(`   XAI_API_KEY: ${process.env.XAI_API_KEY ? "✓ configured" : "✗ missing"}`);
  console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? "✓ configured" : "✗ missing"}`);
});

export default app;
