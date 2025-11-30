import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { TokenPayload } from "@/types/TokenPayload";

// Protected routes list
const protectedRoutes = ["/dashboard", "/profile", "/admin"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check if route is protected
  const requiresAuth = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!requiresAuth) {
    return NextResponse.next();
  }

  const token = req.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as TokenPayload;

    // If token is valid → allow
    if (!decoded.userId) {
      throw new Error("Invalid token payload");
    }

    // Optionally: protect admin routes
    if (pathname.startsWith("/admin") && decoded.role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    return NextResponse.next();
  } catch (error) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

// Match against all routes
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/admin/:path*",
  ],
};
