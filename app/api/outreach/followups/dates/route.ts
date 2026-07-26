import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import OutreachContact from "@/models/Outreach";
import OutreachFollowUp from "@/models/OutreachFollowUp";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import { TokenPayload } from "@/types/TokenPayload";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    const currentUser = decoded;

    const { searchParams } = new URL(req.url);
    let adminName = searchParams.get("adminName");

    if (!adminName && currentUser.role === "admin") {
      adminName = currentUser.name;
    }

    if (!adminName) {
      return NextResponse.json({ success: true, generatedDates: [] }, { status: 200 });
    }

    const customFormId = searchParams.get("customFormId");
    let contacts;
    if (customFormId) {
      contacts = await OutreachContact.find({ customFormId })
        .select("_id branch")
        .lean();
    } else {
      contacts = await OutreachContact.find({
        underWhichAdmin: adminName,
        $or: [
          { customFormId: { $exists: false } },
          { customFormId: null }
        ]
      })
        .select("_id branch")
        .lean();
    }


    const contactIds = contacts.map(c => c._id);
    let allFollowupsForAdmin = await OutreachFollowUp.find({
      outreachContact: { $in: contactIds },
      followUpDate: { $ne: null }
    })
      .select("followUpDate assignedVolunteer")
      .lean();

    const programId = searchParams.get("programId") || searchParams.get("program");
    if (programId && programId.trim() !== "") {
      const volunteersInProgram = await User.find({
        programs: programId.trim()
      }).select("_id").lean();
      const volIdSet = new Set(volunteersInProgram.map(v => v._id.toString()));

      allFollowupsForAdmin = allFollowupsForAdmin.filter(f => {
        if (!f.assignedVolunteer) return false;
        const vId = f.assignedVolunteer._id ? f.assignedVolunteer._id.toString() : f.assignedVolunteer.toString();
        return volIdSet.has(vId);
      });
    }

    const generatedDates = Array.from(
      new Set(
        allFollowupsForAdmin
          .map((f: any) => {
            if (!f.followUpDate) return null;
            return new Date(f.followUpDate).toISOString().split('T')[0];
          })
          .filter(Boolean)
      )
    ) as string[];

    return NextResponse.json({
      success: true,
      generatedDates,
      adminName
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error fetching followup dates:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch dates" },
      { status: 500 }
    );
  }
}
