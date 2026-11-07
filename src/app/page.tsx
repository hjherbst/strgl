import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(15,118,110,0.18),_transparent_55%),linear-gradient(180deg,#f8faf9_0%,#ffffff_45%)]"
      />
      <section className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-24 md:py-32">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-800/80">
          Produktplattform
        </p>
        <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-zinc-900 md:text-7xl">
          strgl
        </h1>
        <p className="max-w-xl text-lg text-zinc-600">
          Ein Account für Plugins und Webapps. Lizenzen, Abos und Rechnungen an
          einem Ort – für dich und bald als White-Label für andere.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/pricing" className={cn(buttonVariants({ size: "lg" }))}>
            Produkte ansehen
          </Link>
          <Link
            href="/register"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            Account erstellen
          </Link>
        </div>
      </section>
    </div>
  );
}
