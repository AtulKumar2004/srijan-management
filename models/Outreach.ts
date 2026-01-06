import mongoose, { Schema, Document } from "mongoose";

export interface IOutreachContact extends Document {
  name: string;
  phone: string;
  profession: string;
  motherTongue?: string;
  currentLocation?: string;
  registeredBy: string;
  numberOfRounds?: number;
  branch: string;
  paidStatus: string;
  comment?: string;
  underWhichAdmin?: string; // Name of the admin
  assignedVolunteer?: mongoose.Types.ObjectId; // Volunteer assigned for followups
  addedBy?: mongoose.Types.ObjectId; // Volunteer who added this contact
  createdAt: Date;
  updatedAt: Date;
}

const OutreachContactSchema = new Schema<IOutreachContact>({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  profession: { type: String, required: true },
  motherTongue: String,
  currentLocation: String,
  registeredBy: { type: String, required: true },
  numberOfRounds: { type: Number, default: 0 },
  branch: { type: String, required: true },
  paidStatus: { 
    type: String, 
    required: true,
    enum: ["Paid", "Unpaid", "Partially Paid", "Sponsored"]
  },
  comment: String,
  underWhichAdmin: String,
  assignedVolunteer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.OutreachContact ||
  mongoose.model<IOutreachContact>("OutreachContact", OutreachContactSchema);
