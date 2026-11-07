import { companyBlock } from "@/lib/legal";
import { getRequestTenant } from "@/lib/tenant/resolve";

export default async function DatenschutzPage() {
  let settings;
  try {
    settings = (await getRequestTenant()).settings;
  } catch {
    settings = null;
  }

  return (
    <article className="prose prose-zinc mx-auto max-w-3xl px-4 py-16 dark:prose-invert">
      <h1>Datenschutz</h1>
      <p>
        Verantwortlicher für die Datenverarbeitung auf dieser Plattform:
      </p>
      {settings ? companyBlock(settings) : <p>siehe Impressum</p>}

      <h2>Account & Authentifizierung</h2>
      <p>
        Zur Bereitstellung Ihres Kontos speichern wir Name, E-Mail-Adresse,
        Passwort-Hash sowie optionale Rechnungsdaten (Adresse, USt-IdNr.). Die
        Session wird über Cookies geführt.
      </p>

      <h2>Zahlungsabwicklung (Stripe)</h2>
      <p>
        Zahlungen werden über Stripe abgewickelt. Dabei werden erforderliche
        Zahlungs- und Transaktionsdaten an Stripe übermittelt. Stripe agiert als
        Auftragsverarbeiter bzw. eigenständiger Verantwortlicher je nach
        Verarbeitungsschritt. Details:{" "}
        <a href="https://stripe.com/de/privacy">stripe.com/de/privacy</a>.
      </p>

      <h2>Transaktionsmails (Resend)</h2>
      <p>
        Bestätigungen, Rechnungen und Abo-Hinweise versenden wir über Resend.
        Verarbeitet werden E-Mail-Adresse und Inhalt der Nachricht.
      </p>

      <h2>Hosting & Datenbank</h2>
      <p>
        Die Anwendung wird bei Vercel betrieben, Daten liegen in einer
        PostgreSQL-Datenbank (Neon). Es gelten die jeweiligen AV-Verträge /
        Datenschutzhinweise der Anbieter.
      </p>

      <h2>USt-IdNr.-Prüfung (VIES)</h2>
      <p>
        Sofern Sie eine USt-IdNr. angeben, prüfen wir diese über den
        VIES-Webservice der Europäischen Kommission.
      </p>

      <h2>Lizenzprüfung</h2>
      <p>
        WordPress-Plugins und Webapps können den Lizenz- bzw. Entitlement-Status
        gegen unsere API prüfen. Dabei werden Lizenzschlüssel, Domain und
        technische Metadaten verarbeitet.
      </p>

      <h2>Ihre Rechte</h2>
      <p>
        Sie haben Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung der
        Verarbeitung, Datenübertragbarkeit und Widerspruch. Kontakt über die
        oben genannte E-Mail-Adresse.
      </p>

      <p className="text-sm text-muted-foreground">
        Arbeitsvorlage – bitte rechtlich freigeben lassen.
      </p>
    </article>
  );
}
