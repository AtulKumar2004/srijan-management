// models/User.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  password: string;

  role: "admin" | "volunteer" | "participant" | "guest";

  profession?: string;
  homeTown?: string;
  connectedToTemple?: string;
  joinedAt?: Date;

  gender?: string;
  dateOfBirth?: Date;
  address?: string;
  howDidYouHearAboutUs?: string;
  numberOfRounds?: number;

  level?: string;
  grade?: string;
  registeredBy?: string; // userId of admin/volunteer who created this record
  handledBy?: string;    // assigned volunteer for follow-up

  isActive?: boolean;
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
      enum: ["admin", "volunteer", "participant", "guest"],
      default: "guest",
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

    level: String,
    grade: String,
    registeredBy: String, 
    handledBy: String,

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.User ||
  mongoose.model<IUser>("User", UserSchema);
