import mongoose, { Schema, Document } from "mongoose";

export interface IProgram extends Document {
  name: string;
  description?: string;
  minAge?: number;
  maxAge?: number;
}

const ProgramSchema = new Schema<IProgram>({
  name: { type: String, required: true },
  description: String,
  minAge: Number,
  maxAge: Number,
});

export default mongoose.models.Program ||
  mongoose.model<IProgram>("Program", ProgramSchema);
