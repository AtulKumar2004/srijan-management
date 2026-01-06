import mongoose from "mongoose";

const FollowUpSchema = new mongoose.Schema(
  {
    program: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Program",
      required: true 
    },

    // Date for which this follow-up is scheduled (e.g., program date)
    followUpDate: { 
      type: Date, 
      required: true 
    },

    // Type of user being followed up
    userType: {
      type: String,
      enum: ["participant", "guest"],
      required: true
    },

    // The user being followed up
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User",
      required: true 
    },

    // Volunteer assigned to make this follow-up call
    assignedVolunteer: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    },

    // Status after follow-up call
    status: {
      type: String,
      enum: ["Coming", "Not Coming", "May Come", "Not Answered", "Not Called"],
      default: "Not Called"
    },

    // Remarks/notes from the call
    remarks: { 
      type: String,
      default: "" 
    },

    // Who actually made the call
    calledBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    },

    // When the call was made
    calledAt: { type: Date },

    // Created by (admin who created the follow-up list)
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User",
      required: true 
    },

    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Compound index to ensure one follow-up per user per date per program
FollowUpSchema.index({ program: 1, followUpDate: 1, user: 1 }, { unique: true });
FollowUpSchema.index({ assignedVolunteer: 1, followUpDate: 1 });
FollowUpSchema.index({ program: 1, followUpDate: 1, userType: 1 });

export default mongoose.models.FollowUp ||
  mongoose.model("FollowUp", FollowUpSchema);
