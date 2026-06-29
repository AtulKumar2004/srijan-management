import mongoose, { Schema, Document } from "mongoose";

export interface IVolunteerCreationRequest extends Document {
  name: string;
  email: string;
  phone: string;
  profession: string;
  homeTown: string;
  address: string;
  gender: string;
  connectedToTemple: string;
  numberOfRounds: number;
  level: number;
  grade: string;
  maritalStatus: string;
  program: mongoose.Types.ObjectId;
  programAdmin: mongoose.Types.ObjectId;
  requestedBy: mongoose.Types.ObjectId;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VolunteerCreationRequestSchema = new Schema<IVolunteerCreationRequest>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    profession: { type: String, required: true },
    homeTown: { type: String, required: true },
    address: { type: String, required: true },
    gender: { type: String, required: true },
    connectedToTemple: { type: String, required: true },
    numberOfRounds: { type: Number, required: true, default: 0 },
    level: { type: Number, required: true },
    grade: { type: String, required: true },
    maritalStatus: { type: String, required: true },
    program: { type: Schema.Types.ObjectId, ref: "Program", required: true },
    programAdmin: { type: Schema.Types.ObjectId, ref: "User", required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
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

VolunteerCreationRequestSchema.index({ email: 1, program: 1, status: 1 });
VolunteerCreationRequestSchema.index({ programAdmin: 1, status: 1, createdAt: -1 });
VolunteerCreationRequestSchema.index({ requestedBy: 1, createdAt: -1 });

export default mongoose.models.VolunteerCreationRequest ||
  mongoose.model<IVolunteerCreationRequest>("VolunteerCreationRequest", VolunteerCreationRequestSchema);
