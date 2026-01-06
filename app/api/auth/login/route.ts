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

    if(!user.isActive) {
        return NextResponse.json(
        { error: "User has not verified his account" },
        { status: 401 }
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
    const response = setAuthCookie(user._id.toString(), email, user.role);
    
    // Add redirect info based on role
    const redirectUrl = user.role === 'guest' ? '/profile' : '/dashboard';
    
    const responseData = {
      message: "Login successful",
      redirect: redirectUrl,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
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
