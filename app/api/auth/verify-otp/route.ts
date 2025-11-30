// app/api/auth/verify-otp/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Otp from "@/models/Otp";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { userId, target, code } = await req.json();

    if (!userId || !target || !code) {
      return NextResponse.json(
        { error: "userId, target and code are required" },
        { status: 400 }
      );
    }

    // 1) Find OTP entry
    const otpEntry = await Otp.findOne({
      target,
      code,
      purpose: "signup",
      used: false,
    }).sort({ createdAt: -1 });

    if (!otpEntry) {
      return NextResponse.json(
        { error: "Invalid or already used OTP" },
        { status: 400 }
      );
    }

    // 2) Check expiry
    if (otpEntry.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // 3) Mark OTP as used
    otpEntry.used = true;
    otpEntry.attempts = (otpEntry.attempts || 0) + 1;
    await otpEntry.save();

    // 4) Find user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found for this OTP" },
        { status: 404 }
      );
    }

    // Optional: double-check mapping by email/phone
    if (
      user.email !== target &&
      user.phone !== target
    ) {
      // target doesn't belong to this user
      return NextResponse.json(
        { error: "OTP target does not match this user" },
        { status: 400 }
      );
    }

    // 5) Activate user
    user.isActive = true;
    await user.save();

    const userObj = user.toObject();
    delete userObj.password;

    // You could also set JWT cookie here if you want auto-login.
    // For now we just return success and user; frontend can call login.
    return NextResponse.json(
      {
        message: "OTP verified successfully. Account activated.",
        user: userObj,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("VERIFY_OTP_ERROR:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}
