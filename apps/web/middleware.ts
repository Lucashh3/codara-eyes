import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "./lib/auth";

// Rotas publicas (sem sessao): pagina de login, endpoint de login e health.
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/health"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  // Usuario logado abrindo /login -> manda pro dashboard.
  if (authed && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isPublic(pathname) || authed) {
    return NextResponse.next();
  }

  // APIs respondem 401; navegacao redireciona para o login.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "nao autenticado" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Tudo, menos assets do Next e arquivos estaticos.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
