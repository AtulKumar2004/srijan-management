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

    // Verify authentication
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    const currentUser = decoded;

    // Get admin name from query or use current user's name if admin
    const { searchParams } = new URL(req.url);
    let adminName = searchParams.get("adminName");
    const followUpDate = searchParams.get("date") || searchParams.get("followUpDate");

    // If no admin name provided and user is admin, use their name
    if (!adminName && currentUser.role === "admin") {
      adminName = currentUser.name;
    }

    if (!adminName) {
      return NextResponse.json(
        { error: "Admin name is required" },
        { status: 400 }
      );
    }

    if (!followUpDate) {
      return NextResponse.json(
        { error: "Date is required" },
        { status: 400 }
      );
    }

    // Fetch outreach contacts for this admin
    let contacts = await OutreachContact.find({ underWhichAdmin: adminName })
      .sort({ createdAt: -1 })
      .lean();

    // Filter by same temple name as admin if available
    const adminUser = await User.findOne({ name: adminName, role: "admin" });
    if (adminUser && adminUser.connectedToTemple) {
      const templeRegex = new RegExp(`^${adminUser.connectedToTemple.trim()}$`, "i");
      const sameTempleContacts = contacts.filter(c => c.branch && templeRegex.test(c.branch));
      if (sameTempleContacts.length > 0) {
        contacts = sameTempleContacts;
      }
    }

    // Fetch followups for the specific date
    const followups = await OutreachFollowUp.find({
      outreachContact: { $in: contacts.map(c => c._id) },
      followUpDate: new Date(followUpDate)
    })
      .populate("assignedVolunteer", "name email")
      .populate("calledBy", "name")
      .lean();

    // Map followups to contacts
    let contactsWithFollowups = contacts
      .map((contact) => {
        const followup = followups.find(
          (f: any) => f.outreachContact.toString() === contact._id.toString()
        );

        if (followup) {
          return {
            ...contact,
            assignedVolunteer: (followup as any).assignedVolunteer,
            followup: {
              status: (followup as any).status,
              remarks: (followup as any).remarks,
              calledBy: (followup as any).calledBy,
              calledAt: (followup as any).calledAt
            }
          };
        }
        return null;
      })
      .filter(Boolean);

    if (currentUser.role === "volunteer") {
      contactsWithFollowups = contactsWithFollowups.filter((item: any) => {
        if (!item || !item.assignedVolunteer) return false;
        const volId = item.assignedVolunteer._id ? item.assignedVolunteer._id.toString() : item.assignedVolunteer.toString();
        return volId === currentUser.userId;
      });
    }

    return NextResponse.json({
      success: true,
      contacts: contactsWithFollowups,
      adminName
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error fetching outreach contacts for admin:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch outreach contacts" },
      { status: 500 }
    );
  }
}
