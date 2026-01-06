import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export function setAuthCookie(userId: string, email: string, role: string) {
    const token = jwt.sign({ userId, role }, process.env.JWT_SECRET!, {
        expiresIn: "7d",
    });

    const response = NextResponse.json(
        { message: "Authentication successful", email: email, role: role },
        { status: 200 }
    );

    response.cookies.set("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: "/",
    });

    return response;
}