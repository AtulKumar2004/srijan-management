// models/User.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  password: string;

  role: "admin" | "program_manager" | "volunteer" | "participant" | "guest";

  profession?: string;
  homeTown?: string;
  connectedToTemple?: string;
  joinedAt?: Date;

  gender?: string;
  dateOfBirth?: Date;
  address?: string;
  howDidYouHearAboutUs?: string;
  numberOfRounds?: number;

  level?: number;
  grade?: string;
  registeredBy?: string; // userId of admin/volunteer who created this record
  handledBy?: string;    // assigned volunteer for follow-up
  maritalStatus?: string; // Single, Married, etc.
  participantsUnder?: number; // For volunteers - number of participants they handle
  programs?: string[]; // Array of programIds user is enrolled in
  levelHistory?: { level: number; joinedAt: Date }[];

  isActive?: boolean;
  isArchived?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },

    // hashed password
    password: { type: String, required: true },

    // role controlled by admin or volunteers
    role: {
      type: String,
      enum: ["admin", "program_manager", "volunteer", "participant", "guest"],
      default: "guest",
      index: true,
    },

    // Devotee details
    profession: String,
    homeTown: String,
    connectedToTemple: String,
    joinedAt: Date,

    gender: String,
    dateOfBirth: Date,
    address: String,
    howDidYouHearAboutUs: String,

    // fixed incorrect syntax
    numberOfRounds: { type: Number, default: 0 },

    level: Number,
    grade: String,
    registeredBy: { type: String, index: true },
    handledBy: { type: String, index: true },
    maritalStatus: String,
    participantsUnder: Number,
    programs: { type: [String], index: true },
    levelHistory: [
      {
        level: { type: Number, required: true },
        joinedAt: { type: Date, default: Date.now },
      },
    ],

    isActive: { type: Boolean, default: false }, // Only active after OTP verification
    isArchived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== "production") {
  delete mongoose.models.User;
}

export default mongoose.models.User ||
  mongoose.model<IUser>("User", UserSchema);
