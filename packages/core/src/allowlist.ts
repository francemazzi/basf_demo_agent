const EMAIL_TITOLARE = "francemazzi@gmail.com";

/**
 * Accesso alla chat persistente: il titolare del prototipo, oppure qualsiasi
 * indirizzo il cui dominio contiene "basf" (basf.com, partners.basf.com, …).
 */
export function emailConsentita(email: string): boolean {
  const normalizzata = email.trim().toLowerCase();
  const chiocciola = normalizzata.lastIndexOf("@");
  if (chiocciola <= 0 || chiocciola === normalizzata.length - 1) return false;
  if (normalizzata === EMAIL_TITOLARE) return true;
  const dominio = normalizzata.slice(chiocciola + 1);
  return dominio.includes("basf");
}
