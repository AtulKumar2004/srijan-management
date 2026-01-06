import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import OutreachContact from "@/models/Outreach";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    console.log("Fetching outreach contact with ID:", id);

    const contact = await OutreachContact.findById(id);

    console.log("Found contact:", contact);

    if (!contact) {
      return NextResponse.json(
        { error: "Outreach contact not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      contact
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error fetching outreach contact:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch outreach contact" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const contact = await OutreachContact.findByIdAndDelete(id);

    if (!contact) {
      return NextResponse.json(
        { error: "Outreach contact not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Outreach contact deleted successfully"
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error deleting outreach contact:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete outreach contact" },
      { status: 500 }
    );
  }
}
