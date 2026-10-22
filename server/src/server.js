import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, Record, Audit, Settings } from "./models.js";
import { requireAuth, requireAdmin } from "./auth.js";

const app = express();
const PORT = process.env.PORT || 5000;
const MODULES = ["water-quality", "chemical-dosing", "treatment-process", "alerts", "compliance"];

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 }));

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "AquaOps API" }));

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const username = String(req.body.username || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await User.findOne({ username });
    if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Incorrect username or password" });
    }
    const token = jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: "8h" });
    await Audit.create({ actor: user.username, action: "LOGIN", module: "authentication", details: "Successful login" });
    res.json({ token, user: { id: user._id, username: user.username, name: user.name, role: user.role } });
  } catch (e) { next(e); }
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: { id: req.user._id, username: req.user.username, name: req.user.name, role: req.user.role } });
});

app.get("/api/dashboard", requireAuth, async (_req, res, next) => {
  try {
    const [quality, dosing, processes, alerts, compliance, settings] = await Promise.all([
      Record.find({ module: "water-quality" }).sort({ createdAt: -1 }).limit(10),
      Record.find({ module: "chemical-dosing" }).sort({ createdAt: -1 }).limit(5),
      Record.find({ module: "treatment-process" }).sort({ createdAt: -1 }).limit(10),
      Record.find({ module: "alerts", status: { $nin: ["Resolved", "Acknowledged"] } }).sort({ createdAt: -1 }).limit(10),
      Record.find({ module: "compliance" }).sort({ createdAt: -1 }).limit(10),
      Settings.findOne({ key: "plant" })
    ]);
    const latest = quality[0];
    const allAlerts = await Record.find({ module: "alerts" });
    const complianceScore = compliance.length ? Math.round(compliance.filter(r => r.status === "Compliant").length / compliance.length * 100) : 100;
    res.json({
      plantName: settings?.plantName || "Kaveri Water Treatment Plant",
      plantHealth: Math.max(0, 100 - alerts.filter(a => a.data?.severity === "Critical").length * 20 - alerts.length * 3),
      flowRate: processes[0]?.data?.flowRate ?? 12.8,
      activeAlerts: alerts.length,
      totalAlerts: allAlerts.length,
      complianceScore,
      latestQuality: latest || null,
      quality, dosing, processes, alerts, compliance
    });
  } catch (e) { next(e); }
});

app.get("/api/records/:module", requireAuth, async (req, res, next) => {
  try {
    if (!MODULES.includes(req.params.module)) return res.status(404).json({ message: "Unknown module" });
    const records = await Record.find({ module: req.params.module }).sort({ createdAt: -1 }).limit(500);
    res.json({ records });
  } catch (e) { next(e); }
});

app.post("/api/records/:module", requireAuth, async (req, res, next) => {
  try {
    const module = req.params.module;
    if (!MODULES.includes(module)) return res.status(404).json({ message: "Unknown module" });
    const title = String(req.body.title || "").trim();
    if (!title) return res.status(400).json({ message: "Title is required" });
    const data = req.body.data && typeof req.body.data === "object" ? req.body.data : {};
    let status = String(req.body.status || "Recorded");
    const settings = await Settings.findOne({ key: "plant" });
    if (module === "water-quality") {
      const t = settings?.thresholds || {};
      const ph = Number(data.ph), turbidity = Number(data.turbidity), tds = Number(data.tds);
      const issues = [];
      if (Number.isFinite(ph) && (ph < (t.phMin ?? 6.5) || ph > (t.phMax ?? 8.5))) issues.push("pH outside configured range");
      if (Number.isFinite(turbidity) && turbidity > (t.turbidityMax ?? 5)) issues.push("Turbidity exceeds configured limit");
      if (Number.isFinite(tds) && tds > (t.tdsMax ?? 500)) issues.push("TDS exceeds configured limit");
      if (issues.length) {
        status = "Needs Review";
        await Record.create({ module: "alerts", title: "Water quality threshold exceeded", status: "Open", createdBy: req.user.username,
          data: { severity: "Critical", message: `${title}: ${issues.join("; ")}`, sourceRecord: title } });
      } else status = "Within Range";
    }
    const record = await Record.create({ module, title, data, status, createdBy: req.user.username });
    await Audit.create({ actor: req.user.username, action: "CREATE", module, details: `Created record: ${title}` });
    res.status(201).json({ record });
  } catch (e) { next(e); }
});

app.patch("/api/records/:module/:id", requireAuth, async (req, res, next) => {
  try {
    if (!MODULES.includes(req.params.module)) return res.status(404).json({ message: "Unknown module" });
    const update = {};
    if (typeof req.body.title === "string" && req.body.title.trim()) update.title = req.body.title.trim();
    if (req.body.data && typeof req.body.data === "object") update.data = req.body.data;
    if (typeof req.body.status === "string") update.status = req.body.status;
    const record = await Record.findOneAndUpdate({ _id: req.params.id, module: req.params.module }, { $set: update }, { new: true, runValidators: true });
    if (!record) return res.status(404).json({ message: "Record not found" });
    await Audit.create({ actor: req.user.username, action: "UPDATE", module: req.params.module, details: `Updated record: ${record.title}` });
    res.json({ record });
  } catch (e) { next(e); }
});

app.delete("/api/records/:module/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const record = await Record.findOneAndDelete({ _id: req.params.id, module: req.params.module });
    if (!record) return res.status(404).json({ message: "Record not found" });
    await Audit.create({ actor: req.user.username, action: "DELETE", module: req.params.module, details: `Deleted record: ${record.title}` });
    res.json({ message: "Record deleted" });
  } catch (e) { next(e); }
});

app.get("/api/audit", requireAuth, requireAdmin, async (_req, res, next) => {
  try { res.json({ events: await Audit.find().sort({ createdAt: -1 }).limit(500) }); }
  catch (e) { next(e); }
});

app.get("/api/settings", requireAuth, async (_req, res, next) => {
  try {
    let settings = await Settings.findOne({ key: "plant" });
    if (!settings) settings = await Settings.create({ key: "plant" });
    res.json({ settings });
  } catch (e) { next(e); }
});

app.patch("/api/settings", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const allowed = ["plantName", "thresholds"];
    const update = {};
    for (const key of allowed) if (req.body[key] !== undefined) update[key] = req.body[key];
    const settings = await Settings.findOneAndUpdate({ key: "plant" }, { $set: update }, { new: true, upsert: true, runValidators: true });
    await Audit.create({ actor: req.user.username, action: "UPDATE_SETTINGS", module: "administration", details: "Plant settings updated" });
    res.json({ settings });
  } catch (e) { next(e); }
});

app.get("/api/users", requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const users = await User.find().select("-passwordHash").sort({ createdAt: -1 });
    res.json({ users });
  } catch (e) { next(e); }
});

app.post("/api/users", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const username = String(req.body.username || "").trim().toLowerCase();
    const name = String(req.body.name || "").trim();
    const password = String(req.body.password || "");
    const role = ["admin", "operator", "viewer"].includes(req.body.role) ? req.body.role : "operator";
    if (!username || !name || password.length < 8) return res.status(400).json({ message: "Name, username, and password of at least 8 characters are required" });
    const user = await User.create({ username, name, passwordHash: await bcrypt.hash(password, 12), role });
    await Audit.create({ actor: req.user.username, action: "CREATE_USER", module: "administration", details: `Created user ${username}` });
    res.status(201).json({ user: { id: user._id, username: user.username, name: user.name, role: user.role } });
  } catch (e) { next(e); }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === 11000) return res.status(409).json({ message: "That username already exists" });
  if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
  res.status(500).json({ message: "Server error. Check the backend terminal." });
});

if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  console.error("Missing MONGODB_URI or JWT_SECRET.");
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");

    if (process.env.VERCEL) {
      return;
    }

    app.listen(PORT, () => {
      console.log(`AquaOps API running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });

export default app;
