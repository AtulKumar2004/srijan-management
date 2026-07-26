import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import OutreachContact from "@/models/Outreach";
import OutreachFollowUp from "@/models/OutreachFollowUp";

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { adminName, followUpDate, customFormId } = body;

    if (!adminName || !followUpDate) {
      return NextResponse.json(
        { error: "Admin name and follow-up date are required" },
        { status: 400 }
      );
    }

    // Find outreach contacts scoped to either the specific custom form or normal outreach
    let contacts;
    if (customFormId) {
      contacts = await OutreachContact.find({ customFormId });
    } else {
      contacts = await OutreachContact.find({
        underWhichAdmin: adminName,
        $or: [
          { customFormId: { $exists: false } },
          { customFormId: null }
        ]
      });
    }

    const contactIds = contacts.map(c => c._id);

    if (contactIds.length === 0) {
      return NextResponse.json(
        { message: "No contacts found for this admin, nothing to delete." },
        { status: 200 }
      );
    }

    // Delete all follow-ups for these contacts on the specified date
    const result = await OutreachFollowUp.deleteMany({
      outreachContact: { $in: contactIds },
      followUpDate: new Date(followUpDate)
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} follow-up records for ${followUpDate}`,
      deletedCount: result.deletedCount
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error deleting follow-up list:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete follow-up list" },
      { status: 500 }
    );
  }
}
