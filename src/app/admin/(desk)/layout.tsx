import Link from "next/link";
import { redirect } from "next/navigation";
import { CsrfField } from "@/components/csrf-field";
import { currentUser } from "@/lib/session";
import { submissionCount } from "@/lib/store";

const actionClass = "flex min-h-12 items-center justify-center px-2 text-center text-sm font-medium";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  const count = submissionCount();
  return (
    <div className="pb-16 md:pb-0">
      <div className="sticky top-0 z-20 border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-1 sm:px-8">
          <p className="text-sm">
            Shop desk
            <span className="text-black/70"> · {user.username}</span>
          </p>
          <div className="flex items-center">
            <Link href="/admin/password" className="inline-flex min-h-11 items-center px-3 text-sm underline">
              Password
            </Link>
            <form action="/api/admin/logout" method="post">
              <CsrfField />
              <button type="submit" className="inline-flex min-h-11 items-center px-3 text-sm underline">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <nav aria-label="Shop desk" className="mx-auto hidden max-w-5xl grid-cols-3 gap-2 px-4 pb-3 md:grid sm:px-8">
          <Link href="/admin/pieces/new" className={`${actionClass} bg-gold text-white`}>
            Add piece
          </Link>
          <Link href="/admin/pieces" className={`${actionClass} border border-black/20`}>
            Pieces
          </Link>
          <Link href="/admin/inbox" className={`${actionClass} border border-black/20`}>
            Inbox ({count})
          </Link>
        </nav>
      </div>
      {children}
      <nav
        aria-label="Shop desk"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-gold bg-white md:hidden"
      >
        <Link href="/admin/pieces/new" className={`${actionClass} bg-gold text-white`}>
          Add piece
        </Link>
        <Link href="/admin/pieces" className={actionClass}>
          Pieces
        </Link>
        <Link href="/admin/inbox" className={actionClass}>
          Inbox ({count})
        </Link>
      </nav>
    </div>
  );
}
