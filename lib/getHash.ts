// See https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#Converting_a_digest_to_a_hex_string
function hexString(buffer: ArrayBuffer) {
  const byteArray = new Uint8Array(buffer);

  return Array.from(byteArray).map((value) => {
    const hexCode = value.toString(16);
    return hexCode.padStart(2, '0');
  }).join('');
}

export async function getHash(text: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return hexString(hash);
}
