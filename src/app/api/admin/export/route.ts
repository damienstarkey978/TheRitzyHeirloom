import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { piecesToCsv } from "@/lib/store";

export async function GET() {
  const user = await currentUser();
  if (!user) return new NextResponse("Sign in required", { status: 401 });
  return new NextResponse(piecesToCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=ritzy-inventory.csv",
    },
  });
}
