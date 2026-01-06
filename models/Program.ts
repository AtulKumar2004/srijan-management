import mongoose, { Schema, Document } from "mongoose";

export interface IProgram extends Document {
  name: string;
  description?: string;
  minAge?: number;
  maxAge?: number;
  photo?: string;
  qrCode?: string;
  createdBy?: mongoose.Types.ObjectId;
  temple?: string;
}

const ProgramSchema = new Schema<IProgram>({
  name: { type: String, required: true },
  description: String,
  minAge: Number,
  maxAge: Number,
  photo: String,
  qrCode: String,
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  temple: String,
}, {
  timestamps: true
});

// Force recreation of the model to ensure new fields are recognized
try {
  mongoose.deleteModel("Program");
} catch (error) {
  // Model doesn't exist yet, that's fine
}

export default mongoose.model<IProgram>("Program", ProgramSchema);
