// models/Otp.ts
import mongoose from "mongoose";

const OtpSchema = new mongoose.Schema(
  {
    target: { type: String, required: true }, // phone or email (we store as string)
    code: { type: String, required: true },   // store OTP (in prod, consider hashing)
    channel: { type: String, enum: ["phone", "email"], required: true },
    purpose: { type: String, default: "signup" }, // purpose: signup/verify
    attempts: { type: Number, default: 0 },
    used: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// optional TTL index if you want Mongo to auto-delete expired otps
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.Otp || mongoose.model("Otp", OtpSchema);
