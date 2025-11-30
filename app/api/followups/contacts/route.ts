import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Outreach from "@/models/Outreach";
import jwt from "jsonwebtoken";
import { TokenPayload } from "@/types/TokenPayload";

// GET /api/followups/contacts - Get all contacts (participants, users, outreach) for follow-up assignment
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const token = req.cookies.get("jwt")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    
    // Only admins and volunteers can access this
    if (!["admin", "volunteer"].includes(decoded.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    // Get all participants (users with role 'participant')
    const participants = await User.find({ 
      role: "participant", 
      isActive: true 
    }).select("name email phone role profession homeTown");

    // Get all active users (excluding guests, can include volunteers for internal follow-ups)
    const users = await User.find({ 
      role: { $in: ["participant", "volunteer"] },
      isActive: true 
    }).select("name email phone role profession homeTown");

    // Get all outreach contacts
    const outreachContacts = await Outreach.find()
      .select("name phone location interestLevel notes addedBy")
      .populate("addedBy", "name email");

    return NextResponse.json({
      success: true,
      data: {
        participants: participants.map(p => ({
          id: p._id,
          name: p.name,
          email: p.email,
          phone: p.phone,
          type: "user",
          role: p.role,
          profession: p.profession,
          homeTown: p.homeTown
        })),
        users: users.map(u => ({
          id: u._id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          type: "user",
          role: u.role,
          profession: u.profession,
          homeTown: u.homeTown
        })),
        outreachContacts: outreachContacts.map(o => ({
          id: o._id,
          name: o.name,
          phone: o.phone,
          type: "outreach",
          location: o.location,
          interestLevel: o.interestLevel,
          notes: o.notes,
          addedBy: o.addedBy
        }))
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts", details: error.message },
      { status: 500 }
    );
  }
}
