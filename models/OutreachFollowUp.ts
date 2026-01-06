import mongoose from "mongoose";

const OutreachFollowUpSchema = new mongoose.Schema(
  {
    // The outreach contact being followed up
    outreachContact: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "OutreachContact",
      required: true 
    },

    // Volunteer assigned to make this follow-up call
    assignedVolunteer: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    },

    // The date this follow-up is scheduled for
    followUpDate: {
      type: Date,
      required: true
    },

    // Status after follow-up call
    status: {
      type: String,
      enum: ["Coming", "Not Coming", "May Come", "Not Answered", "Not Sure", "Not Called"],
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
    calledAt: { 
      type: Date 
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.models.OutreachFollowUp ||
  mongoose.model("OutreachFollowUp", OutreachFollowUpSchema);
