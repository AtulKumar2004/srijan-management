import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import OutreachContact from "@/models/Outreach";
import CustomOutreachForm from "@/models/CustomOutreachForm";

// GET /api/outreach/custom-forms/[id]/contacts - Get all contacts registered under this custom form
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const contacts = await OutreachContact.find({ customFormId: id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, contacts });
  } catch (error: any) {
    console.error("Error fetching custom form contacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts for custom form" },
      { status: 500 }
    );
  }
}

// POST /api/outreach/custom-forms/[id]/contacts - Register a contact via this custom form
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const form = await CustomOutreachForm.findById(id);
    if (!form) {
      return NextResponse.json({ error: "Custom form not found" }, { status: 404 });
    }

    const { name, phone, profession, motherTongue, currentLocation, registeredBy, numberOfRounds, paidStatus, comment, customFields } = body;

    const normalizedPhone = (phone || "").replace(/\D/g, "");
    if (normalizedPhone.length !== 10) {
      return NextResponse.json({ error: "Phone number must be exactly 10 digits" }, { status: 400 });
    }

    if (!name || !profession) {
      return NextResponse.json({ error: "Name and Profession are compulsory" }, { status: 400 });
    }

    const newContact = await OutreachContact.create({
      name: name.trim(),
      phone: normalizedPhone,
      profession: profession.trim(),
      motherTongue: motherTongue || "",
      currentLocation: currentLocation || "",
      registeredBy: registeredBy || form.title || "Online Form",
      numberOfRounds: numberOfRounds ? Number(numberOfRounds) : 0,
      branch: form.templeName,
      paidStatus: paidStatus || "Unpaid",
      comment: comment || "",
      underWhichAdmin: form.adminName || "Admin",
      customFormId: form._id,
      customFields: customFields || {}
    });

    // Increment contactCount on form
    await CustomOutreachForm.findByIdAndUpdate(id, { $inc: { contactCount: 1 } });

    return NextResponse.json({ success: true, contact: newContact }, { status: 201 });
  } catch (error: any) {
    console.error("Error registering contact via custom form:", error);
    return NextResponse.json(
      { error: error.message || "Failed to register contact" },
      { status: 500 }
    );
  }
}
