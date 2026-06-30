import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { setAuthCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // FIND USER
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      // Verify password first before resending OTP
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }

      // Resend a fresh OTP so they can complete verification
      const Otp = (await import("@/models/Otp")).default;
      const { sendEmailOtp } = await import("@/lib/sendEmailOtp");

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await Otp.create({
        target: user.email,
        code: otpCode,
        channel: "email",
        purpose: "signup",
        expiresAt,
      });

      await sendEmailOtp(user.email, otpCode);

      return NextResponse.json(
        {
          error: "Account not verified. A new OTP has been sent to your email.",
          needsVerification: true,
          userId: user._id,
          target: user.email,
          channel: "email",
        },
        { status: 403 }
      );
    }

    // VERIFY PASSWORD
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // SUCCESS → Set cookie using your function
    const response = setAuthCookie(user._id.toString(), email, user.role, Boolean(user.isArchived));
    
    // Add redirect info based on role or archive status
    const redirectUrl = (user.role === 'guest' || user.isArchived) ? '/profile' : '/dashboard';
    
    const responseData = {
      message: "Login successful",
      redirect: redirectUrl,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isArchived: Boolean(user.isArchived)
      }
    };

    return NextResponse.json(responseData, {
      status: 200,
      headers: response.headers
    });

  } catch (error: any) {
    console.error("LOGIN ERROR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
