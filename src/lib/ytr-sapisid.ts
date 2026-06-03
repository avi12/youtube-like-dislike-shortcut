const HEX_PAD_LENGTH = 2;
const MILLISECONDS_PER_SECOND = 1000;
const SAPISID_COOKIE_NAMES = ["SAPISID", "__Secure-3PAPISID", "__Secure-1PAPISID"];
function readCookie(name: string) {
  const prefix = `${name}=`;
  const cookieEntry = document.cookie
    .split(";")
    .map(part => part.trim())
    .find(part => part.startsWith(prefix));
  return cookieEntry?.slice(prefix.length) ?? "";
}

function getSapisid() {
  for (const name of SAPISID_COOKIE_NAMES) {
    const value = readCookie(name);
    if (value) {
      return value;
    }
  }
  return "";
}

export async function buildSapisidAuthorization() {
  const sapisid = getSapisid();
  if (!sapisid) {
    return "";
  }
  const timestampSeconds = Math.floor(Date.now() / MILLISECONDS_PER_SECOND);
  const text = `${timestampSeconds} ${sapisid} https://www.youtube.com`;
  const buffer = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  const hash = Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(HEX_PAD_LENGTH, "0"))
    .join("");
  return `SAPISIDHASH ${timestampSeconds}_${hash}`;
}
