import Link from "next/link";

export function SiteFooter({
  companyName = "Tidenhub Digital GmbH",
}: {
  companyName?: string;
}) {
  return (
    <footer className="mt-auto border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {companyName}</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/impressum" className="hover:text-foreground">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:text-foreground">
            Datenschutz
          </Link>
          <Link href="/agb" className="hover:text-foreground">
            AGB
          </Link>
          <Link href="/widerruf" className="hover:text-foreground">
            Widerruf
          </Link>
        </div>
      </div>
    </footer>
  );
}
