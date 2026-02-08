import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    services: {
      xai: !!process.env.XAI_API_KEY,
      supabase: !!process.env.SUPABASE_URL,
    },
  });
});
