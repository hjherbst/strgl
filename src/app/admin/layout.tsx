import Link from "next/link";
import { requireAdmin } from "@/lib/auth-session";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Übersicht" },
  { href: "/admin/settings", label: "Firma & Tax" },
  { href: "/admin/products", label: "Produkte" },
  { href: "/admin/customers", label: "Kunden" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[200px_1fr]">
      <aside className="space-y-1">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Admin
        </p>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "block rounded-md px-3 py-2 text-sm hover:bg-muted",
            )}
          >
            {l.label}
          </Link>
        ))}
      </aside>
      <div>{children}</div>
    </div>
  );
}
