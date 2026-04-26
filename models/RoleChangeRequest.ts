import mongoose, { Schema, Document } from "mongoose";

export interface IRoleChangeRequest extends Document {
  participant: mongoose.Types.ObjectId;
  currentRole: "participant" | "guest" | "outreach" | "volunteer" | "admin";
  requestedRole: "participant" | "guest" | "outreach" | "volunteer" | "admin";
  requestedBy: mongoose.Types.ObjectId;
  program: mongoose.Types.ObjectId;
  programAdmin: mongoose.Types.ObjectId;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RoleChangeRequestSchema = new Schema<IRoleChangeRequest>(
  {
    participant: { type: Schema.Types.ObjectId, ref: "User", required: true },
    currentRole: {
      type: String,
      enum: ["admin", "volunteer", "participant", "guest", "outreach"],
      required: true,
    },
    requestedRole: {
      type: String,
      enum: ["admin", "volunteer", "participant", "guest", "outreach"],
      required: true,
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    program: { type: Schema.Types.ObjectId, ref: "Program", required: true },
    programAdmin: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    rejectionReason: String,
  },
  { timestamps: true }
);

RoleChangeRequestSchema.index({ participant: 1, program: 1, status: 1 });
RoleChangeRequestSchema.index({ programAdmin: 1, status: 1, createdAt: -1 });
RoleChangeRequestSchema.index({ requestedBy: 1, createdAt: -1 });

export default mongoose.models.RoleChangeRequest ||
  mongoose.model<IRoleChangeRequest>("RoleChangeRequest", RoleChangeRequestSchema);
