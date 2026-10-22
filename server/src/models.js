import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  name: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["admin", "operator", "viewer"], default: "operator" },
  active: { type: Boolean, default: true }
}, { timestamps: true });

const recordSchema = new mongoose.Schema({
  module: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, default: "Recorded" },
  createdBy: { type: String, default: "system" }
}, { timestamps: true });

const auditSchema = new mongoose.Schema({
  actor: String,
  action: String,
  module: String,
  details: String,
  createdAt: { type: Date, default: Date.now }
});

const settingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: "plant" },
  plantName: { type: String, default: "Kaveri Water Treatment Plant" },
  thresholds: {
    phMin: { type: Number, default: 6.5 },
    phMax: { type: Number, default: 8.5 },
    turbidityMax: { type: Number, default: 5 },
    tdsMax: { type: Number, default: 500 }
  }
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);
export const Record = mongoose.model("Record", recordSchema);
export const Audit = mongoose.model("Audit", auditSchema);
export const Settings = mongoose.model("Settings", settingsSchema);
