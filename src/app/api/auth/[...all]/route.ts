import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handlers = toNextJsHandler(auth);

async function withAuthLogging(
  method: "GET" | "POST",
  req: Request,
): Promise<Response> {
  try {
    const res = await handlers[method](req);
    if (res.status >= 500) {
      const clone = res.clone();
      const body = await clone.text().catch(() => "");
      console.error(`[auth ${method}] ${res.status}`, body || "(empty body)");
    }
    return res;
  } catch (error) {
    console.error(`[auth ${method}] unhandled`, error);
    return Response.json(
      {
        error: "auth_failed",
        message: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  return withAuthLogging("GET", req);
}

export async function POST(req: Request) {
  return withAuthLogging("POST", req);
}
