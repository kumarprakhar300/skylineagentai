import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Twilio request validation.
 * Signature = base64(HMAC-SHA1(authToken, fullUrl + sorted(key+value) pairs)).
 * https://www.twilio.com/docs/usage/security#validating-requests
 */
export function twilioSignatureIsValid(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);

  const expected = createHmac("sha1", authToken).update(Buffer.from(data, "utf8")).digest("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
