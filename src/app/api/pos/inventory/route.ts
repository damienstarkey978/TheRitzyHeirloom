import { NextResponse } from "next/server";
import { posAuthorized } from "@/lib/pos";
import { listInventory, piecesToCsv } from "@/lib/store";

function denied(result: "unset" | "denied") {
  if (result === "unset") {
    return NextResponse.json({ error: "The inventory API is not set up." }, { status: 503 });
  }
  return NextResponse.json({ error: "Sign-in token required." }, { status: 401 });
}

export async function GET(request: Request) {
  const result = posAuthorized(request.headers.get("authorization"), process.env.RITZY_POS_TOKEN ?? "");
  if (result !== "ok") return denied(result);
  const url = new URL(request.url);
  if (url.searchParams.get("format") === "csv") {
    return new NextResponse(piecesToCsv(), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=ritzy-inventory.csv",
      },
    });
  }
  return NextResponse.json({ pieces: listInventory() });
}
