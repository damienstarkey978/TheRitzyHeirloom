import { csrfValue } from "@/lib/request-csrf";

export async function CsrfField() {
  const token = await csrfValue();
  return <input type="hidden" name="csrf" value={token} />;
}
