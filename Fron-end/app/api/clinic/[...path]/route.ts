import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: { path: string[] } };

async function proxyRequest(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const session = await auth();
  const accessToken = request.cookies.get("clinic_access_token")?.value;
  if (!session?.user.id || !accessToken) {
    return NextResponse.json({ message: "La sesión expiró. Inicia sesión nuevamente." }, { status: 401 });
  }

  const backendUrl = process.env.BACKEND_API_URL ?? "http://localhost:3000";
  const path = context.params.path.map((segment) => encodeURIComponent(segment)).join("/");
  const url = new URL(`/api/v1/${path}`, backendUrl);
  url.search = request.nextUrl.search;

  try {
    const response = await fetch(url, {
      method: request.method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(request.headers.get("content-type")
          ? { "Content-Type": request.headers.get("content-type") as string }
          : {}),
      },
      body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.text(),
      cache: "no-store",
    });
    return new NextResponse(response.body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({ message: "No fue posible conectar con el servicio clínico." }, { status: 502 });
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
