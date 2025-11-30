import mongoose from "mongoose";

const FollowUpSchema = new mongoose.Schema(
  {
    targetType: { 
      type: String, 
      enum: ["user", "outreach"], 
      required: true 
    },

    // If follow-up is for a registered user
    targetUser: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    },

    // If follow-up is for outreach contact
    targetOutreach: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Outreach" 
    },

    // Volunteer/admin who created the follow-up
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },

    // Assigned volunteer (default creator)
    assignedTo: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    },

    channel: {
      type: String,
      enum: ["phone", "whatsapp", "email", "inperson"],
      default: "phone"
    },

    status: {
      type: String,
      enum: ["pending", "done", "no-response", "not-interested"],
      default: "pending"
    },

    notes: { type: String },

    nextActionAt: { type: Date },

    program: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Program" 
    },

    // Date of the program for which this follow-up is created
    programDate: { 
      type: Date, 
      required: true 
    },

    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Indexes for fast searches
FollowUpSchema.index({ targetUser: 1 });
FollowUpSchema.index({ targetOutreach: 1 });
FollowUpSchema.index({ assignedTo: 1 });
FollowUpSchema.index({ status: 1 });

export default mongoose.models.FollowUp ||
  mongoose.model("FollowUp", FollowUpSchema);
