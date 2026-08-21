const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

function polymod(values: number[]) {
  let chk = 1;
  for (const value of values) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ value;
    for (let i = 0; i < 5; i += 1) {
      if ((top >> i) & 1) chk ^= GEN[i];
    }
  }
  return chk;
}

function hrpExpand(hrp: string) {
  const out: number[] = [];
  for (const ch of hrp) out.push(ch.charCodeAt(0) >> 5);
  out.push(0);
  for (const ch of hrp) out.push(ch.charCodeAt(0) & 31);
  return out;
}

function convertBits(data: number[], from: number, to: number, pad: boolean) {
  let acc = 0;
  let bits = 0;
  const maxv = (1 << to) - 1;
  const out: number[] = [];
  for (const value of data) {
    acc = (acc << from) | value;
    bits += from;
    while (bits >= to) {
      bits -= to;
      out.push((acc >> bits) & maxv);
    }
  }
  if (pad && bits > 0) out.push((acc << (to - bits)) & maxv);
  return out;
}

export function evmToBech32(address: string, prefix: string) {
  const hex = address.toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{40}$/.test(hex)) return null;
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16));
  const data = convertBits(bytes, 8, 5, true);
  const checksumValues = hrpExpand(prefix).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const mod = polymod(checksumValues) ^ 1;
  const checksum: number[] = [];
  for (let i = 0; i < 6; i += 1) checksum.push((mod >> (5 * (5 - i))) & 31);
  return `${prefix}1${[...data, ...checksum].map((n) => CHARSET[n]).join("")}`;
}
