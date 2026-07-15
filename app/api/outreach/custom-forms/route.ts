import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import CustomOutreachForm from "@/models/CustomOutreachForm";
import OutreachContact from "@/models/Outreach";
import jwt from "jsonwebtoken";
import { TokenPayload } from "@/types/TokenPayload";
import User from "@/models/User";

// GET /api/outreach/custom-forms - Get all customized forms with live registration counts
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const forms = await CustomOutreachForm.find().sort({ createdAt: -1 }).lean();

    // Get live counts for each form
    const formsWithCounts = await Promise.all(
      forms.map(async (form) => {
        const count = await OutreachContact.countDocuments({ customFormId: form._id });
        return {
          ...form,
          contactCount: count
        };
      })
    );

    return NextResponse.json({ success: true, forms: formsWithCounts });
  } catch (error: any) {
    console.error("Error fetching custom outreach forms:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom outreach forms" },
      { status: 500 }
    );
  }
}

// POST /api/outreach/custom-forms - Create a new customized form
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { title, templeName, adminName, fields } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Form title is compulsory" }, { status: 400 });
    }
    if (!templeName || !templeName.trim()) {
      return NextResponse.json({ error: "Temple name is compulsory" }, { status: 400 });
    }

    let adminId = undefined;
    const token = req.cookies.get("token")?.value;
    if (token && process.env.JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as TokenPayload;
        if (decoded && decoded.userId) {
          adminId = decoded.userId;
        }
      } catch (err) {
        // Token verification failed or expired, proceed without adminId
      }
    }

    // Try to match adminName to a user if adminId not set
    if (!adminId && adminName) {
      const adminUser = await User.findOne({ name: adminName, role: { $in: ["admin", "program_manager"] } });
      if (adminUser) {
        adminId = adminUser._id;
      }
    }

    const newForm = await CustomOutreachForm.create({
      title: title.trim(),
      templeName: templeName.trim(),
      adminName: adminName || "Admin",
      adminId,
      fields: fields || [],
      contactCount: 0
    });

    return NextResponse.json({ success: true, form: newForm }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating custom outreach form:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create custom outreach form" },
      { status: 500 }
    );
  }
}
