import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import OutreachContact from "@/models/Outreach";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // Fetch all standard outreach contacts (exclude targeted custom form contacts), sorted by creation date
    const contacts = await OutreachContact.find({
      $or: [
        { customFormId: { $exists: false } },
        { customFormId: null }
      ]
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      contacts,
      count: contacts.length
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error fetching outreach contacts:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch outreach contacts" },
      { status: 500 }
    );
  }
}
