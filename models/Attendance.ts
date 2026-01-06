import mongoose, { Schema, Document } from "mongoose";

export interface IAttendance extends Document {
  participantId: mongoose.Types.ObjectId;
  date: Date;
  programId: mongoose.Types.ObjectId;
  level?: number;
  status?: string;
  markedAt?: Date;
}

const AttendanceSchema = new Schema<IAttendance>({
  participantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Participant",
    required: true,
  },

  programId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Program",
    required: true,
  },

  date: { type: Date, default: Date.now },

  level: {
    type: Number,
    required: false,
  },

  status: {
    type: String,
    enum: ['present', 'absent'],
    default: 'present',
  },

  markedAt: {
    type: Date,
    default: Date.now,
  },
});

// Delete the model if it exists to ensure schema updates are applied
if (mongoose.models.Attendance) {
  delete mongoose.models.Attendance;
}

export default mongoose.model<IAttendance>("Attendance", AttendanceSchema);
