import { evmToBech32 } from "@/lib/bech32";

function isAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function formatUnits(raw: string | number | null | undefined, decimals = 18) {
  if (raw == null) return "0";
  try {
    const n = BigInt(String(raw).split(".")[0] || "0");
    const base = BigInt(10) ** BigInt(decimals);
    const whole = n / base;
    const frac = n % base;
    if (frac === BigInt(0)) return whole.toString();
    const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "").slice(0, 6);
    return `${whole}.${fracStr}`;
  } catch {
    return "0";
  }
}

function toNumber(raw: string | number | null | undefined, decimals = 18) {
  const n = Number(formatUnits(raw, decimals));
  return Number.isFinite(n) ? n : 0;
}

async function getJson(url: string, timeoutMs = 9000): Promise<unknown | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export type RpcChainMeta = {
  id: string;
  name: string;
  rpc?: string;
  rpcs?: string[];
  lcd?: string;
  lcds?: string[];
  explorer: string;
  tokenExplorer: string;
  native: string;
  slug: string;
  bech32Prefix?: string;
};

const BALANCE_OF = "70a08231";
const DECIMALS = "313ce567";
const SYMBOL = "95d89b41";
const NAME = "06fdde03";

export function kiiRpcs() {
  return ["https://json-rpc.kiivalidator.com"];
}

export function kiiLcds() {
  return ["https://lcd.kiivalidator.com", "https://api.kiichain.nodestake.org"];
}

export async function rpcCall(rpc: string | string[], method: string, params: unknown[]): Promise<unknown | null> {
  const urls = (Array.isArray(rpc) ? rpc : [rpc]).filter(Boolean);
  for (const url of urls) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    try {
      const res = await fetch(url, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { result?: unknown };
      if (json.result != null) return json.result;
    } catch {
      /* next */
    } finally {
      clearTimeout(t);
    }
  }
  return null;
}

function padAddress(address: string) {
  return address.replace(/^0x/, "").toLowerCase().padStart(64, "0");
}

function decodeAbiString(hex: string) {
  const raw = hex.replace(/^0x/, "");
  if (raw.length <= 64) {
    try {
      const bytes = raw.match(/.{2}/g) || [];
      const chars = bytes
        .map((b) => parseInt(b, 16))
        .filter((n) => n > 0)
        .map((n) => String.fromCharCode(n))
        .join("")
        .replace(/[^\x20-\x7E]/g, "")
        .trim();
      return chars || null;
    } catch {
      return null;
    }
  }
  const offset = parseInt(raw.slice(0, 64), 16);
  const start = offset * 2;
  const len = parseInt(raw.slice(start, start + 64), 16);
  const data = raw.slice(start + 64, start + 64 + len * 2);
  const bytes = data.match(/.{2}/g) || [];
  return bytes.map((b) => String.fromCharCode(parseInt(b, 16))).join("").replace(/\u0000/g, "").trim();
}

export async function readErc20(
  rpc: string | string[],
  contract: string,
  holder: string
): Promise<{ balance: string; decimals: number; symbol: string; name: string } | null> {
  if (!isAddress(contract) || !isAddress(holder)) return null;
  const [balHex, decHex, symHex, nameHex] = await Promise.all([
    rpcCall(rpc, "eth_call", [{ to: contract, data: `0x${BALANCE_OF}${padAddress(holder)}` }, "latest"]),
    rpcCall(rpc, "eth_call", [{ to: contract, data: `0x${DECIMALS}` }, "latest"]),
    rpcCall(rpc, "eth_call", [{ to: contract, data: `0x${SYMBOL}` }, "latest"]),
    rpcCall(rpc, "eth_call", [{ to: contract, data: `0x${NAME}` }, "latest"]),
  ]);
  if (typeof balHex !== "string") return null;
  let qty = 0n;
  try {
    qty = BigInt(balHex);
  } catch {
    return null;
  }
  if (qty <= 0n) return null;
  const decimals = typeof decHex === "string" ? Number(BigInt(decHex)) : 18;
  return {
    balance: formatUnits(qty.toString(), Number.isFinite(decimals) ? decimals : 18),
    decimals: Number.isFinite(decimals) ? decimals : 18,
    symbol: (typeof symHex === "string" && decodeAbiString(symHex)) || "TOKEN",
    name: (typeof nameHex === "string" && decodeAbiString(nameHex)) || "",
  };
}

export async function nativePriceUsd(symbol: string): Promise<number | null> {
  const query = symbol === "KII" ? "KII" : symbol;
  const json = (await getJson(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`)) as {
    pairs?: Array<{ priceUsd?: string; baseToken?: { symbol?: string } }>;
  } | null;
  const pairs = json?.pairs || [];
  const hit =
    pairs.find((p) => (p.baseToken?.symbol || "").toUpperCase() === symbol.toUpperCase() && Number(p.priceUsd) > 0) ||
    pairs.find((p) => Number(p.priceUsd) > 0);
  const price = hit ? Number(hit.priceUsd) : NaN;
  return Number.isFinite(price) && price > 0 ? price : null;
}

type BankBalance = { denom?: string; amount?: string };

export async function loadBankBalances(lcds: string[], evmAddress: string, prefix: string) {
  const bech = evmToBech32(evmAddress, prefix);
  if (!bech) return [] as BankBalance[];
  for (const lcd of lcds) {
    const json = (await getJson(`${lcd.replace(/\/$/, "")}/cosmos/bank/v1beta1/balances/${bech}`)) as {
      balances?: BankBalance[];
    } | null;
    if (json?.balances) return json.balances;
  }
  return [] as BankBalance[];
}

export async function loadCosmosTxActivity(lcds: string[], evmAddress: string, prefix: string) {
  const bech = evmToBech32(evmAddress, prefix);
  if (!bech) return { txCount: 0, volumeNative: 0, firstTx: null as string | null, lastTx: null as string | null, days: [] as string[] };
  const queries = [
    `query=${encodeURIComponent(`message.sender='${bech}'`)}`,
    `events=${encodeURIComponent(`message.sender='${bech}'`)}`,
    `events=${encodeURIComponent(`transfer.recipient='${bech}'`)}`,
  ];
  for (const lcd of lcds) {
    for (const qs of queries) {
      const json = (await getJson(
        `${lcd.replace(/\/$/, "")}/cosmos/tx/v1beta1/txs?${qs}&order_by=2&limit=100`,
        12000
      )) as {
        txs?: Array<{ body?: { messages?: Array<{ amount?: Array<{ denom?: string; amount?: string }> | { denom?: string; amount?: string } }> } }>;
        tx_responses?: Array<{ timestamp?: string; tx?: { body?: { messages?: unknown[] } } }>;
      } | null;
      const rows = json?.tx_responses || [];
      if (!rows.length && !json?.txs?.length) continue;
      const stamps = rows.map((r) => r.timestamp).filter((s): s is string => !!s);
      let volumeNative = 0;
      for (const row of rows) {
        const msgs = (row.tx?.body?.messages || []) as Array<Record<string, unknown>>;
        for (const msg of msgs) {
          const amount = msg.amount as Array<{ denom?: string; amount?: string }> | { denom?: string; amount?: string } | undefined;
          const list = Array.isArray(amount) ? amount : amount ? [amount] : [];
          for (const coin of list) {
            if (!coin?.amount) continue;
            if ((coin.denom || "").includes("kii")) volumeNative += toNumber(coin.amount, 18);
          }
        }
      }
      return {
        txCount: Math.max(rows.length, json?.txs?.length || 0),
        volumeNative,
        firstTx: stamps.length ? stamps[stamps.length - 1] : null,
        lastTx: stamps[0] || null,
        days: stamps.map((s) => s.slice(0, 10)),
      };
    }
  }
  return { txCount: 0, volumeNative: 0, firstTx: null, lastTx: null, days: [] as string[] };
}

type TokenRow = {
  symbol: string;
  name: string;
  chain: string;
  chainId: string;
  balance: string;
  contract: string;
  href: string;
  usdValue: number | null;
  isDust: boolean;
};

export function bankAsTokens(
  balances: BankBalance[],
  chain: RpcChainMeta,
  _nativeRate: number | null
): { nativeQty: number; tokens: TokenRow[] } {
  let nativeQty = 0;
  const tokens: TokenRow[] = [];
  for (const bal of balances) {
    const denom = (bal.denom || "").toLowerCase();
    const amount = bal.amount || "0";
    if (!denom || amount === "0") continue;
    if (denom === "akii" || denom === "ukii" || denom === "kii" || denom === chain.native.toLowerCase()) {
      const decimals = denom === "akii" ? 18 : denom === "ukii" ? 6 : 18;
      nativeQty += toNumber(amount, decimals);
      continue;
    }
    const qty = toNumber(amount, 18);
    if (qty <= 0) continue;
    tokens.push({
      symbol: denom.replace(/^u/, "").replace(/^a/, "").toUpperCase().slice(0, 12),
      name: denom,
      chain: chain.name,
      chainId: chain.id,
      balance: formatUnits(amount, 18),
      contract: denom,
      href: chain.explorer,
      usdValue: null,
      isDust: true,
    });
  }
  return { nativeQty, tokens };
}

export function mapErc20Token(
  chain: RpcChainMeta,
  contract: string,
  held: { balance: string; symbol: string; name: string },
  usdValue: number | null
): TokenRow {
  return {
    symbol: held.symbol,
    name: held.name,
    chain: chain.name,
    chainId: chain.id,
    balance: held.balance,
    contract: contract.toLowerCase(),
    href: `${chain.tokenExplorer}${contract}`,
    usdValue,
    isDust: usdValue == null || usdValue < 1,
  };
}
