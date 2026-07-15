import mongoose, { Schema, Document } from "mongoose";

export interface ICustomField {
  id: string;
  label: string;
  type: "text" | "number" | "select" | "textarea";
  required: boolean;
  options?: string[]; // Used when type === "select"
  isDefault?: boolean;
}

export interface ICustomOutreachForm extends Document {
  title: string;
  templeName: string;
  adminName: string;
  adminId?: mongoose.Types.ObjectId;
  fields: ICustomField[];
  contactCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CustomFieldSchema = new Schema<ICustomField>({
  id: { type: String, required: true },
  label: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ["text", "number", "select", "textarea"],
    default: "text"
  },
  required: { type: Boolean, default: false },
  options: [{ type: String }],
  isDefault: { type: Boolean, default: false }
}, { _id: false });

const CustomOutreachFormSchema = new Schema<ICustomOutreachForm>({
  title: { type: String, required: true },
  templeName: { type: String, required: true, index: true },
  adminName: { type: String, required: true, index: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  fields: [CustomFieldSchema],
  contactCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.CustomOutreachForm ||
  mongoose.model<ICustomOutreachForm>("CustomOutreachForm", CustomOutreachFormSchema);
