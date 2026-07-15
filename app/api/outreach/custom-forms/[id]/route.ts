import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import CustomOutreachForm from "@/models/CustomOutreachForm";
import OutreachContact from "@/models/Outreach";

// GET /api/outreach/custom-forms/[id] - Get a single customized form
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const form = await CustomOutreachForm.findById(id).lean();

    if (!form) {
      return NextResponse.json({ error: "Custom form not found" }, { status: 404 });
    }

    const count = await OutreachContact.countDocuments({ customFormId: id });
    return NextResponse.json({
      success: true,
      form: {
        ...form,
        contactCount: count
      }
    });
  } catch (error: any) {
    console.error("Error fetching custom form:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom form" },
      { status: 500 }
    );
  }
}

// DELETE /api/outreach/custom-forms/[id] - Delete a custom form
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    await CustomOutreachForm.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Custom form deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting custom form:", error);
    return NextResponse.json(
      { error: "Failed to delete custom form" },
      { status: 500 }
    );
  }
}
