import mongoose, { Schema, Document } from "mongoose";

export interface IMentorshipChangeRequest extends Document {
  participant: mongoose.Types.ObjectId;
  currentHandledBy?: mongoose.Types.ObjectId;
  requestedHandledBy: mongoose.Types.ObjectId;
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

const MentorshipChangeRequestSchema = new Schema<IMentorshipChangeRequest>(
  {
    participant: { type: Schema.Types.ObjectId, ref: "User", required: true },
    currentHandledBy: { type: Schema.Types.ObjectId, ref: "User" },
    requestedHandledBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
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

MentorshipChangeRequestSchema.index({ participant: 1, program: 1, status: 1 });
MentorshipChangeRequestSchema.index({ programAdmin: 1, status: 1, createdAt: -1 });
MentorshipChangeRequestSchema.index({ requestedBy: 1, createdAt: -1 });

export default mongoose.models.MentorshipChangeRequest ||
  mongoose.model<IMentorshipChangeRequest>("MentorshipChangeRequest", MentorshipChangeRequestSchema);
