import mongoose, { Schema, Document, model, models } from "mongoose";

export interface ISession extends Document {
  programId: mongoose.Types.ObjectId;
  sessionDate: Date;
  sessionTopic: string;
  speakerName: string;
  description?: string;
  level?: number;
  createdBy?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    programId: {
      type: Schema.Types.ObjectId,
      ref: "Program",
      required: true,
    },
    sessionDate: {
      type: Date,
      required: true,
    },
    sessionTopic: {
      type: String,
      required: true,
      trim: true,
    },
    speakerName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    level: {
      type: Number,
      default: 1,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
SessionSchema.index({ programId: 1, sessionDate: -1 });
SessionSchema.index({ isDeleted: 1 });

// Delete existing model to force recreation
if (models.Session) {
  delete models.Session;
}

const Session = model<ISession>("Session", SessionSchema);

export default Session;
