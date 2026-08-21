import { DEFI_BY_CHAIN, type DefiProtocol } from "@/lib/defi";

export type OnchainChain = {
  id: string;
  name: string;
  explorer: string;
  balance: string;
  nativeSymbol: string;
  nativeUsd: number | null;
  txCount: number;
  transferCount: number;
  tokenCount: number;
  valuedTokenCount: number;
  volumeUsd: number;
  feesUsd: number;
  uniqueContracts: number;
  uniqueTokens: number;
  tokenTrades: number;
  nftMints: number;
  contractsDeployed: number;
  walletAgeDays: number;
  activeDays: number;
  activeWeeks: number;
  activeMonths: number;
  activityDays: string[];
  firstTx: string | null;
  lastTx: string | null;
  interacted: boolean;
  hasHoldings: boolean;
};

export type OnchainToken = {
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

export type OnchainFootprint = {
  address: string;
  ens: string | null;
  chains: OnchainChain[];
  tokens: OnchainToken[];
  protocols: DefiProtocol[];
  totalTx: number;
  totalTransfers: number;
  activeChains: number;
  holdingChains: number;
  totalVolumeUsd: number;
  totalFeesUsd: number;
  totalValueUsd: number;
  explorers: { label: string; href: string }[];
};

export type CustomChainInput = {
  id?: string;
  name: string;
  host: string;
  explorer?: string;
  tokenExplorer?: string;
  native?: string;
  slug?: string;
  chainId?: number;
};

type ChainDef = {
  id: string;
  name: string;
  slug: string;
  host: string;
  explorer: string;
  tokenExplorer: string;
  native: string;
  chainId: number;
};

export const CHAINS: ChainDef[] = [
  { id: "eth", name: "Ethereum", slug: "ethereum", host: "https://eth.blockscout.com", explorer: "https://etherscan.io/address/", tokenExplorer: "https://etherscan.io/token/", native: "ETH", chainId: 1 },
  { id: "base", name: "Base", slug: "base", host: "https://base.blockscout.com", explorer: "https://basescan.org/address/", tokenExplorer: "https://basescan.org/token/", native: "ETH", chainId: 8453 },
  { id: "arb", name: "Arbitrum", slug: "arbitrum", host: "https://arbitrum.blockscout.com", explorer: "https://arbiscan.io/address/", tokenExplorer: "https://arbiscan.io/token/", native: "ETH", chainId: 42161 },
  { id: "op", name: "Optimism", slug: "optimism", host: "https://optimism.blockscout.com", explorer: "https://optimistic.etherscan.io/address/", tokenExplorer: "https://optimistic.etherscan.io/token/", native: "ETH", chainId: 10 },
  { id: "polygon", name: "Polygon", slug: "polygon", host: "https://polygon.blockscout.com", explorer: "https://polygonscan.com/address/", tokenExplorer: "https://polygonscan.com/token/", native: "POL", chainId: 137 },
  { id: "bsc", name: "BNB Chain", slug: "bsc", host: "https://bsc.blockscout.com", explorer: "https://bscscan.com/address/", tokenExplorer: "https://bscscan.com/token/", native: "BNB", chainId: 56 },
];

export function mergeChains(extra?: CustomChainInput[] | null): ChainDef[] {
  const out: ChainDef[] = [...CHAINS];
  for (const c of extra || []) {
    const host = (c.host || "").trim().replace(/\/$/, "");
    const name = (c.name || "").trim();
    if (!host || !name || !/^https?:\/\//i.test(host)) continue;
    const id = (c.id || name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);
    if (!id || out.some((b) => b.id === id || b.host === host)) continue;
    out.push({
      id,
      name,
      slug: (c.slug || id).toLowerCase(),
      host,
      explorer: c.explorer || `${host}/address/`,
      tokenExplorer: c.tokenExplorer || `${host}/token/`,
      native: c.native || "ETH",
      chainId: c.chainId || 0,
    });
  }
  return out;
}

export function isAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function formatUnits(raw: string | number | null | undefined, decimals = 18) {
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

export function toNumber(raw: string | number | null | undefined, decimals = 18) {
  const formatted = formatUnits(raw, decimals);
  const n = Number(formatted);
  return Number.isFinite(n) ? n : 0;
}

export async function getJson(url: string, timeoutMs = 9000): Promise<unknown | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function pageQuery(baseUrl: string, params: Record<string, unknown> | null | undefined) {
  if (!params) return null;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    qs.set(key, String(value));
  }
  const clean = baseUrl.split("?")[0];
  const existing = baseUrl.includes("?") ? baseUrl.slice(baseUrl.indexOf("?") + 1) : "";
  const first = new URLSearchParams(existing);
  for (const [key, value] of qs.entries()) first.set(key, value);
  return `${clean}?${first.toString()}`;
}

export async function getPagedItems<T>(url: string, maxPages = 8): Promise<T[]> {
  const out: T[] = [];
  let next: string | null = url;
  for (let i = 0; i < maxPages && next; i += 1) {
    const json = (await getJson(next)) as { items?: T[]; next_page_params?: Record<string, unknown> } | null;
    out.push(...(json?.items ?? []));
    next = pageQuery(url, json?.next_page_params);
  }
  return out;
}

type TokenItem = {
  value?: string;
  token?: { address_hash?: string; symbol?: string; name?: string; decimals?: string; exchange_rate?: string | number | null; type?: string };
};

type TransferItem = {
  to?: { hash?: string };
  from?: { hash?: string };
  token?: { address_hash?: string; type?: string; decimals?: string; exchange_rate?: string | number | null };
  total?: { value?: string };
  type?: string;
};

type TxItem = {
  to?: { hash?: string } | null;
  from?: { hash?: string };
  fee?: { value?: string };
  value?: string;
  timestamp?: string;
  method?: string | null;
};

function pickProtocols(chainName: string, addresses: string[]) {
  const known = DEFI_BY_CHAIN[chainName] || [];
  const hits = new Set(addresses.map((a) => a.toLowerCase()).filter(Boolean));
  return known.filter((p) => hits.has(p.address));
}

async function loadPrices(slug: string, contracts: string[]) {
  const prices = new Map<string, number>();
  const unique = [...new Set(contracts.filter((c) => isAddress(c)))];
  for (let i = 0; i < unique.length; i += 25) {
    const chunk = unique.slice(i, i + 25);
    const json = (await getJson(`https://api.dexscreener.com/tokens/v1/${slug}/${chunk.join(",")}`)) as Array<{ priceUsd?: string; baseToken?: { address?: string } }> | null;
    if (!Array.isArray(json)) continue;
    for (const pair of json) {
      const addr = (pair.baseToken?.address || "").toLowerCase();
      const price = Number(pair.priceUsd);
      if (!addr || !Number.isFinite(price) || price <= 0) continue;
      const prev = prices.get(addr);
      if (prev == null || price > prev) prices.set(addr, price);
    }
  }
  return prices;
}

async function loadTokenItems(host: string, address: string): Promise<TokenItem[]> {
  const balances = await getJson(`${host}/api/v2/addresses/${address}/token-balances`);
  if (Array.isArray(balances) && balances.length) {
    return (balances as TokenItem[]).filter((item) => {
      const type = (item.token?.type || "").toUpperCase();
      return !type || type === "ERC-20";
    });
  }
  return getPagedItems<TokenItem>(`${host}/api/v2/addresses/${address}/tokens?type=ERC-20`, 8);
}

function mapToken(item: TokenItem, chain: ChainDef, prices: Map<string, number>): OnchainToken | null {
  const contract = (item.token?.address_hash || "").toLowerCase();
  if (!contract) return null;
  const decimals = Number(item.token?.decimals || 18);
  const qty = toNumber(item.value || "0", decimals);
  if (qty <= 0) return null;
  const rateFromExplorer = item.token?.exchange_rate == null ? null : Number(item.token.exchange_rate);
  const rate = prices.get(contract) ?? (rateFromExplorer != null && Number.isFinite(rateFromExplorer) ? rateFromExplorer : null);
  const usdValue = rate != null ? qty * rate : null;
  return {
    symbol: item.token?.symbol || "TOKEN",
    name: item.token?.name || "",
    chain: chain.name,
    chainId: chain.id,
    balance: formatUnits(item.value || "0", decimals),
    contract,
    href: `${chain.tokenExplorer}${contract}`,
    usdValue,
    isDust: usdValue == null || usdValue < 1,
  };
}

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

export async function loadOnchainFootprint(rawAddress: string, extraChains?: CustomChainInput[] | null): Promise<OnchainFootprint | null> {
  const address = rawAddress.trim().toLowerCase();
  if (!isAddress(address)) return null;
  const ensData = (await getJson(`https://api.ensdata.net/${address}`)) as { ens?: string } | null;
  const chainsToLoad = mergeChains(extraChains);
  const chainRows = await Promise.all(
    chainsToLoad.map(async (chain) => {
      const [info, counters, tokenItems, txs, transfers] = await Promise.all([
        getJson(`${chain.host}/api/v2/addresses/${address}`) as Promise<{ coin_balance?: string; ens_domain_name?: string; exchange_rate?: string | number | null } | null>,
        getJson(`${chain.host}/api/v2/addresses/${address}/counters`) as Promise<{ transactions_count?: string; token_transfers_count?: string } | null>,
        loadTokenItems(chain.host, address),
        getPagedItems<TxItem>(`${chain.host}/api/v2/addresses/${address}/transactions`, 10),
        getPagedItems<TransferItem>(`${chain.host}/api/v2/addresses/${address}/token-transfers`, 8),
      ]);
      const prices = await loadPrices(chain.slug, tokenItems.map((item) => item.token?.address_hash || ""));
      const tokens = tokenItems.map((item) => mapToken(item, chain, prices)).filter((t): t is OnchainToken => !!t);
      const counterparties = [
        ...txs.flatMap((tx) => [tx.to?.hash || "", tx.from?.hash || ""]),
        ...transfers.flatMap((tr) => [tr.to?.hash || "", tr.from?.hash || "", tr.token?.address_hash || ""]),
      ];
      const protocols = pickProtocols(chain.name, counterparties);
      const nativeRate = info?.exchange_rate == null ? null : Number(info.exchange_rate);
      const nativeQty = toNumber(info?.coin_balance || "0", 18);
      const nativeUsd = nativeRate != null && Number.isFinite(nativeRate) ? nativeQty * nativeRate : null;
      const feeWei = txs.reduce((sum, tx) => sum + toNumber(tx.fee?.value || "0", 18), 0);
      const feesUsd = nativeRate != null && Number.isFinite(nativeRate) ? feeWei * nativeRate : 0;
      let volumeUsd = 0;
      if (nativeRate != null && Number.isFinite(nativeRate)) {
        volumeUsd += txs.reduce((sum, tx) => sum + toNumber(tx.value || "0", 18) * nativeRate, 0);
      }
      for (const tr of transfers) {
        const decimals = Number(tr.token?.decimals || 18);
        const qty = toNumber(tr.total?.value || "0", decimals);
        const rate = tr.token?.exchange_rate == null ? null : Number(tr.token.exchange_rate);
        const priced = rate != null && Number.isFinite(rate) ? qty * rate : prices.get((tr.token?.address_hash || "").toLowerCase());
        if (priced != null && Number.isFinite(priced)) volumeUsd += priced;
      }
      const uniqueContracts = new Set(txs.map((tx) => (tx.to?.hash || "").toLowerCase()).filter((h) => h && h !== address)).size;
      const uniqueTokens = new Set(transfers.map((tr) => (tr.token?.address_hash || "").toLowerCase()).filter(Boolean)).size;
      const tokenTrades = transfers.filter((tr) => {
        const type = (tr.token?.type || tr.type || "").toUpperCase();
        return type.includes("ERC-20") || type === "token_transfer" || !type;
      }).length;
      const nftMints = transfers.filter((tr) => {
        const type = (tr.token?.type || "").toUpperCase();
        return type.includes("721") || type.includes("1155");
      }).length;
      const contractsDeployed = txs.filter((tx) => !tx.to?.hash && (tx.from?.hash || "").toLowerCase() === address).length;
      const stamps = txs.map((tx) => tx.timestamp).filter((s): s is string => !!s);
      const transferStamps = transfers
        .map((tr) => (tr as TransferItem & { timestamp?: string }).timestamp)
        .filter((s): s is string => !!s);
      const allStamps = [...stamps, ...transferStamps];
      const days = new Set(allStamps.map(dayKey));
      const weeks = new Set(allStamps.map((s) => s.slice(0, 8)));
      const months = new Set(allStamps.map((s) => s.slice(0, 7)));
      const firstTx = stamps.length ? stamps[stamps.length - 1] : null;
      const lastTx = stamps.length ? stamps[0] : transferStamps[0] || null;
      const walletAgeDays = firstTx ? Math.max(1, Math.round((Date.now() - new Date(firstTx).getTime()) / 86400000)) : 0;
      const counterTx = Number(counters?.transactions_count || 0);
      const counterTr = Number(counters?.token_transfers_count || 0);
      const txCount = Math.max(counterTx, txs.length);
      const transferCount = Math.max(counterTr, transfers.length);
      const valuedTokenCount = tokens.filter((t) => !t.isDust).length;
      const hasHoldings = valuedTokenCount > 0 || (nativeUsd != null && nativeUsd >= 0.01);
      const interacted = txCount > 0 || transferCount > 0 || tokens.length > 0 || nativeQty > 0;
      return {
        chain: {
          id: chain.id, name: chain.name, explorer: `${chain.explorer}${address}`, balance: formatUnits(info?.coin_balance || "0"),
          nativeSymbol: chain.native, nativeUsd, txCount, transferCount, tokenCount: tokens.length, valuedTokenCount,
          volumeUsd, feesUsd, uniqueContracts, uniqueTokens: Math.max(uniqueTokens, tokens.length), tokenTrades, nftMints,
          contractsDeployed, walletAgeDays, activeDays: days.size, activeWeeks: weeks.size, activeMonths: months.size,
          activityDays: [...days], firstTx, lastTx, interacted, hasHoldings,
        } satisfies OnchainChain,
        ens: info?.ens_domain_name || null,
        tokens,
        protocols,
      };
    })
  );
  const seenProto = new Set<string>();
  const protocols: DefiProtocol[] = [];
  for (const row of chainRows) {
    for (const proto of row.protocols) {
      const key = `${proto.chain}:${proto.address}`;
      if (seenProto.has(key)) continue;
      seenProto.add(key);
      protocols.push(proto);
    }
  }
  const chains = chainRows.map((r) => r.chain);
  const tokens = chainRows.flatMap((r) => r.tokens).sort((a, b) => (b.usdValue ?? -1) - (a.usdValue ?? -1));
  const ens = ensData?.ens || chainRows.find((r) => r.ens)?.ens || null;
  const totalValueUsd = tokens.reduce((sum, t) => sum + (t.usdValue && !t.isDust ? t.usdValue : 0), 0) + chains.reduce((sum, c) => sum + (c.nativeUsd && c.nativeUsd >= 0.01 ? c.nativeUsd : 0), 0);
  return {
    address, ens, chains, tokens, protocols,
    totalTx: chains.reduce((sum, c) => sum + c.txCount, 0),
    totalTransfers: chains.reduce((sum, c) => sum + c.transferCount, 0),
    activeChains: chains.filter((c) => c.interacted).length,
    holdingChains: chains.filter((c) => c.hasHoldings).length,
    totalVolumeUsd: chains.reduce((sum, c) => sum + c.volumeUsd, 0),
    totalFeesUsd: chains.reduce((sum, c) => sum + c.feesUsd, 0),
    totalValueUsd,
    explorers: [
      { label: "Etherscan", href: `https://etherscan.io/address/${address}` },
      { label: "Arkham", href: `https://arkm.com/explorer/address/${address}` },
      { label: "DeBank", href: `https://debank.com/profile/${address}` },
    ],
  };
}

export async function lookupWalletToken(rawAddress: string, rawContract: string) {
  const address = rawAddress.trim().toLowerCase();
  const contract = rawContract.trim().toLowerCase();
  if (!isAddress(address) || !isAddress(contract)) return [];
  const hits = await Promise.all(
    CHAINS.map(async (chain) => {
      const [info, items] = await Promise.all([
        getJson(`${chain.host}/api/v2/tokens/${contract}`) as Promise<{ type?: string; symbol?: string; name?: string; decimals?: string } | null>,
        loadTokenItems(chain.host, address),
      ]);
      if (!info) return null;
      const held = items.find((t) => (t.token?.address_hash || "").toLowerCase() === contract);
      if (!held) return null;
      const decimals = Number(held.token?.decimals || info.decimals || 18);
      return { kind: "token" as const, symbol: held.token?.symbol || info.symbol || "TOKEN", name: held.token?.name || info.name || "", chain: chain.name, balance: formatUnits(held.value || "0", decimals), contract, href: `${chain.tokenExplorer}${contract}` };
    })
  );
  return hits.filter(Boolean);
}
