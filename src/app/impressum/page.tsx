import { companyBlock } from "@/lib/legal";
import { getRequestTenant } from "@/lib/tenant/resolve";

export default async function ImpressumPage() {
  let settings;
  try {
    settings = (await getRequestTenant()).settings;
  } catch {
    settings = null;
  }

  return (
    <article className="prose prose-zinc mx-auto max-w-3xl px-4 py-16 dark:prose-invert">
      <h1>Impressum</h1>
      {settings ? (
        <>
          <p>Betreiber dieser Plattform ist:</p>
          {companyBlock(settings)}
          <p>
            Die Europäische Kommission stellt eine Plattform zur
            Online-Streitbeilegung bereit:{" "}
            <a
              href="https://ec.europa.eu/consumers/odr/"
              target="_blank"
              rel="noreferrer"
            >
              https://ec.europa.eu/consumers/odr/
            </a>
            .{" "}
            {settings.participatesInConsumerArbitration
              ? "Wir nehmen an Streitbeilegungsverfahren vor Verbraucherschlichtungsstellen teil."
              : "Wir nehmen an Streitbeilegungsverfahren von Verbraucherschlichtungsstellen nicht teil."}
          </p>
        </>
      ) : (
        <p>Firmendaten werden nach dem Seed aus den Tenant-Einstellungen geladen.</p>
      )}
    </article>
  );
}
