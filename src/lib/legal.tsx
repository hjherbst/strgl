import type { TenantSettings } from "@/lib/db/schema";

export function companyBlock(s: TenantSettings) {
  return (
    <>
      <p>
        <strong>{s.companyName}</strong>
        {s.managingDirector ? (
          <>
            <br />
            GF: {s.managingDirector}
          </>
        ) : null}
        <br />
        {s.addressLine1}
        {s.addressLine2 ? (
          <>
            <br />
            {s.addressLine2}
          </>
        ) : null}
        <br />
        {s.postalCode} {s.city}
      </p>
      <p>
        {s.phone ? (
          <>
            Telefon: {s.phone}
            <br />
          </>
        ) : null}
        E-Mail: {s.supportEmail}
        <br />
        USt-IdNr.: {s.vatId}
        {s.commercialRegister ? (
          <>
            <br />
            Handelsregister: {s.commercialRegister}
            {s.registerCourt ? ` ${s.registerCourt}` : ""}
          </>
        ) : null}
      </p>
    </>
  );
}
