import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User, Record, Settings } from "./models.js";

if (!process.env.MONGODB_URI) throw new Error("Set MONGODB_URI in server/.env first");
await mongoose.connect(process.env.MONGODB_URI);
const passwordHash = await bcrypt.hash("AquaOps@123", 12);
await User.updateOne(
  { username: "admin" },
  { $set: { name: "AquaOps Administrator", passwordHash, role: "admin", active: true } },
  { upsert: true }
);
await Settings.updateOne({ key: "plant" }, { $setOnInsert: { plantName: "Kaveri Water Treatment Plant" } }, { upsert: true });

if (await Record.countDocuments() === 0) {
  const examples = [
    { module: "water-quality", title: "Morning intake sample", status: "Within Range", data: { ph: 7.2, turbidity: 2.1, tds: 310, dissolvedOxygen: 6.8, temperature: 27.4, samplePoint: "Intake A" } },
    { module: "water-quality", title: "Treated water sample", status: "Within Range", data: { ph: 7.4, turbidity: 1.2, tds: 285, dissolvedOxygen: 7.1, temperature: 26.8, samplePoint: "Outlet B" } },
    { module: "chemical-dosing", title: "Chlorine dosing batch 104", status: "Completed", data: { chemical: "Chlorine", quantity: 18, unit: "L", tank: "Tank A", operator: "Shift A" } },
    { module: "chemical-dosing", title: "Alum dosing batch 208", status: "Completed", data: { chemical: "Alum", quantity: 25, unit: "kg", tank: "Tank B", operator: "Shift B" } },
    { module: "treatment-process", title: "Filtration line 1", status: "Running", data: { stage: "Filtration", flowRate: 12.8, unit: "MLD", equipment: "Filter 1" } },
    { module: "treatment-process", title: "Sedimentation basin 2", status: "Running", data: { stage: "Sedimentation", flowRate: 12.2, unit: "MLD", equipment: "Basin 2" } },
    { module: "alerts", title: "Filter backwash due", status: "Open", data: { severity: "Warning", message: "Scheduled filter backwash requires review" } },
    { module: "alerts", title: "Chemical inventory review", status: "Acknowledged", data: { severity: "Info", message: "Review chemical stock before next shift" } },
    { module: "compliance", title: "Daily treated water check", status: "Compliant", data: { standard: "Internal operating target", result: "All entered parameters within configured ranges", reviewedBy: "Shift supervisor" } }
  ];
  await Record.insertMany(examples.map(x => ({ ...x, createdBy: "seed" })));
}
console.log("Seed complete. Login: admin / AquaOps@123");
await mongoose.disconnect();
