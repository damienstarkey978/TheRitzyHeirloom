import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { submissionCount } from "@/lib/store";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  const count = submissionCount();
  return (
    <div>
      <div className="border-b border-black/10">
        <nav
          aria-label="Shop desk"
          className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-[0.65rem] tracking-[0.16em] uppercase sm:px-8"
        >
          <Link href="/admin" className="hover:text-gold">
            Inbox ({count})
          </Link>
          <Link href="/admin/pieces" className="hover:text-gold">
            Pieces
          </Link>
          <Link href="/admin/pieces/new" className="hover:text-gold">
            Add piece
          </Link>
          <span className="text-sm tracking-normal normal-case">Signed in as {user.username}</span>
          <form action="/api/admin/logout" method="post" className="sm:ml-auto">
            <button type="submit" className="tracking-[0.16em] uppercase hover:text-gold">
              Sign out
            </button>
          </form>
        </nav>
      </div>
      {children}
    </div>
  );
}
