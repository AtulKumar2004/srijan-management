import mongoose, { Schema, Document } from "mongoose";

export interface IAttendance extends Document {
  participantId: mongoose.Types.ObjectId;
  date: Date;
  programId: mongoose.Types.ObjectId;
  markedBy: mongoose.Types.ObjectId;
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

  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

export default mongoose.models.Attendance ||
  mongoose.model<IAttendance>("Attendance", AttendanceSchema);
