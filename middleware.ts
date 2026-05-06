import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Gate /admin/* with an admin cookie. /admin/login is the entry.
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = req.cookies.get("tenkibench_admin")?.value;
    if (!token || token !== process.env.ADMIN_TOKEN) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
