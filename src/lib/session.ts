import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserByToken, SESSION_COOKIE } from "@/lib/store";

export async function currentUser() {
  const jar = await cookies();
  return getUserByToken(jar.get(SESSION_COOKIE)?.value);
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  return user;
}
