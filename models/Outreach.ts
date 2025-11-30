import mongoose, { Schema, Document } from "mongoose";

export interface IOutreachContact extends Document {
  name?: string;
  phone: string;
  location?: string;
  interestLevel?: string;
  notes?: string;
  addedBy: mongoose.Types.ObjectId; // Volunteer
  createdAt: Date;
}

const OutreachContactSchema = new Schema<IOutreachContact>({
  name: String,
  phone: { type: String, required: true },

  location: String,
  interestLevel: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "low",
  },
  notes: String,

  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.OutreachContact ||
  mongoose.model<IOutreachContact>("OutreachContact", OutreachContactSchema);
