import { DEFI_BY_CHAIN, type DefiProtocol } from "@/lib/defi";
import {
  bankAsTokens,
  kiiLcds,
  kiiRpcs,
  loadBankBalances,
  loadCosmosTxActivity,
  mapErc20Token,
  nativePriceUsd,
  readErc20,
  rpcCall,
} from "@/lib/chain-rpc";

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
  activityMethods: Record<string, string[]>;
  firstTx: string | null;
  lastTx: string | null;
  interacted: boolean;
  hasHoldings: boolean;
  imported: boolean;
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
  host?: string;
  explorer?: string;
  tokenExplorer?: string;
  native?: string;
  slug?: string;
  chainId?: number;
  rpc?: string;
  lcd?: string;
  public?: boolean;
};

export type ImportedTokenRef = {
  chainId: string;
  contract: string;
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
  rpc?: string;
  lcd?: string;
  imported?: boolean;
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
    const name = (c.name || "").trim();
    const rpc = (c.rpc || "").trim().replace(/\/$/, "");
    const host = (c.host || "").trim().replace(/\/$/, "");
    if (!name || (!host && !rpc)) continue;
    const id = (c.id || name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);
    if (!id || out.some((b) => b.id === id || (host && b.host === host) || (rpc && b.rpc === rpc))) continue;
    const explorerBase = (c.explorer || host || "").replace(/\/$/, "");
    const isKii = /kii/i.test(name) || id === "kiichain" || Number(c.chainId) === 1783;
    out.push({
      id,
      name,
      slug: (c.slug || id).toLowerCase(),
      host,
      explorer: explorerBase ? (explorerBase.includes("/address") ? explorerBase.endsWith("/") ? explorerBase : `${explorerBase}/` : `${explorerBase}/address/`) : "",
      tokenExplorer: c.tokenExplorer || (explorerBase ? `${explorerBase}/token/` : ""),
      native: c.native || (isKii ? "KII" : "ETH"),
      chainId: Number(c.chainId || 0),
      rpc: rpc || (isKii ? kiiRpcs()[0] : undefined),
      lcd: c.lcd || (isKii ? kiiLcds()[0] : undefined),
      imported: true,
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
  timestamp?: string;
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
  if (!host) return [];
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

function emptyChain(chain: ChainDef, address: string, extra?: Partial<OnchainChain>, tokens: OnchainToken[] = []) {
  return {
    chain: {
      id: chain.id,
      name: chain.name,
      explorer: `${chain.explorer}${address}`,
      balance: extra?.balance || "0",
      nativeSymbol: chain.native,
      nativeUsd: extra?.nativeUsd ?? null,
      txCount: extra?.txCount || 0,
      transferCount: extra?.transferCount || 0,
      tokenCount: extra?.tokenCount ?? tokens.length,
      valuedTokenCount: extra?.valuedTokenCount || tokens.filter((t) => !t.isDust).length,
      volumeUsd: extra?.volumeUsd || 0,
      feesUsd: extra?.feesUsd || 0,
      uniqueContracts: extra?.uniqueContracts || 0,
      uniqueTokens: extra?.uniqueTokens ?? tokens.length,
      tokenTrades: extra?.tokenTrades || 0,
      nftMints: extra?.nftMints || 0,
      contractsDeployed: extra?.contractsDeployed || 0,
      walletAgeDays: extra?.walletAgeDays || 0,
      activeDays: extra?.activeDays || 0,
      activeWeeks: extra?.activeWeeks || 0,
      activeMonths: extra?.activeMonths || 0,
      activityDays: extra?.activityDays || [],
      activityMethods: extra?.activityMethods || {},
      firstTx: extra?.firstTx || null,
      lastTx: extra?.lastTx || null,
      interacted: extra?.interacted || !!chain.imported,
      hasHoldings: extra?.hasHoldings || tokens.length > 0,
      imported: !!chain.imported,
    },
    ens: null,
    tokens,
    protocols: [] as DefiProtocol[],
  };
}

async function loadImportedErc20(chain: ChainDef, address: string, refs: ImportedTokenRef[]) {
  if (!chain.rpc) return [] as OnchainToken[];
  const mine = refs.filter((t) => t.chainId === chain.id && isAddress(t.contract));
  const tokens: OnchainToken[] = [];
  for (const ref of mine) {
    const held = await readErc20(chain.rpc, ref.contract, address);
    if (!held) continue;
    const prices = await loadPrices(chain.slug, [ref.contract]);
    const rate = prices.get(ref.contract.toLowerCase()) ?? null;
    const usdValue = rate != null ? Number(held.balance) * rate : null;
    tokens.push(mapErc20Token(chain, ref.contract, held, usdValue));
  }
  return tokens;
}

async function loadFromRpc(chain: ChainDef, address: string, importedTokens: ImportedTokenRef[] = []) {
  if (!chain.rpc) return emptyChain(chain, address);
  const rpcs = /kii/i.test(chain.name) ? [chain.rpc, ...kiiRpcs()] : [chain.rpc];
  const [balanceHex, nonceHex, rate] = await Promise.all([
    rpcCall(rpcs, "eth_getBalance", [address, "latest"]),
    rpcCall(rpcs, "eth_getTransactionCount", [address, "latest"]),
    nativePriceUsd(chain.native),
  ]);
  let evmQty = 0;
  try {
    evmQty = typeof balanceHex === "string" ? toNumber(BigInt(balanceHex).toString(), 18) : 0;
  } catch {
    evmQty = 0;
  }
  const txCount = typeof nonceHex === "string" ? Number(BigInt(nonceHex)) : 0;
  const lcds = chain.lcd ? [chain.lcd, ...kiiLcds()] : /kii/i.test(chain.name) ? kiiLcds() : [];
  const prefix = /kii/i.test(chain.name) ? "kii" : "";
  const [bank, activity, erc20] = await Promise.all([
    prefix && lcds.length ? loadBankBalances(lcds, address, prefix) : Promise.resolve([]),
    prefix && lcds.length ? loadCosmosTxActivity(lcds, address, prefix) : Promise.resolve({ txCount: 0, volumeNative: 0, firstTx: null, lastTx: null, days: [] as string[] }),
    loadImportedErc20({ ...chain, rpc: rpcs[0] }, address, importedTokens),
  ]);
  const bankMapped = bankAsTokens(bank, chain, rate);
  const nativeQty = Math.max(evmQty, bankMapped.nativeQty);
  const tokens = [...bankMapped.tokens, ...erc20];
  const seen = new Set<string>();
  const uniqueTokens = tokens.filter((t) => {
    const key = `${t.chainId}:${t.contract}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const days = new Set(activity.days);
  const firstTx = activity.firstTx;
  const lastTx = activity.lastTx;
  const walletAgeDays = firstTx ? Math.max(1, Math.round((Date.now() - new Date(firstTx).getTime()) / 86400000)) : 0;
  const nativeUsd = rate != null ? nativeQty * rate : null;
  const volumeUsd = rate != null ? activity.volumeNative * rate : 0;
  return emptyChain(
    chain,
    address,
    {
      balance: nativeQty.toString(),
      nativeUsd,
      txCount: Math.max(Number.isFinite(txCount) ? txCount : 0, activity.txCount),
      transferCount: activity.txCount,
      tokenCount: uniqueTokens.length,
      valuedTokenCount: uniqueTokens.filter((t) => !t.isDust).length,
      volumeUsd,
      uniqueTokens: uniqueTokens.length,
      walletAgeDays,
      activeDays: days.size,
      activeWeeks: new Set(activity.days.map((d) => d.slice(0, 8))).size,
      activeMonths: new Set(activity.days.map((d) => d.slice(0, 7))).size,
      activityDays: activity.days,
      firstTx,
      lastTx,
      hasHoldings: nativeQty > 0 || uniqueTokens.length > 0,
      interacted: true,
    },
    uniqueTokens
  );
}

export async function loadOnchainFootprint(
  rawAddress: string,
  extraChains?: CustomChainInput[] | null,
  importedTokens?: ImportedTokenRef[] | null
): Promise<OnchainFootprint | null> {
  const address = rawAddress.trim().toLowerCase();
  if (!isAddress(address)) return null;
  const ensData = (await getJson(`https://api.ensdata.net/${address}`)) as { ens?: string } | null;
  const chainsToLoad = mergeChains(extraChains);
  const refs = importedTokens || [];
  const chainRows = await Promise.all(
    chainsToLoad.map(async (chain) => {
      const useRpc = !!chain.rpc && !/blockscout/i.test(chain.host || "");
      if (useRpc && !chain.host) return loadFromRpc(chain, address, refs);

      const [info, counters, tokenItems, txs, transfers] = await Promise.all([
        chain.host ? getJson(`${chain.host}/api/v2/addresses/${address}`) as Promise<{ coin_balance?: string; ens_domain_name?: string; exchange_rate?: string | number | null } | null> : Promise.resolve(null),
        chain.host ? getJson(`${chain.host}/api/v2/addresses/${address}/counters`) as Promise<{ transactions_count?: string; token_transfers_count?: string } | null> : Promise.resolve(null),
        loadTokenItems(chain.host, address),
        chain.host ? getPagedItems<TxItem>(`${chain.host}/api/v2/addresses/${address}/transactions`, 10) : Promise.resolve([] as TxItem[]),
        chain.host ? getPagedItems<TransferItem>(`${chain.host}/api/v2/addresses/${address}/token-transfers`, 8) : Promise.resolve([] as TransferItem[]),
      ]);

      if (!info && !txs.length && !tokenItems.length && chain.rpc) {
        return loadFromRpc(chain, address, refs);
      }

      const extraHeld = await loadImportedErc20(chain, address, refs);
      const prices = await loadPrices(chain.slug, [
        ...tokenItems.map((item) => item.token?.address_hash || ""),
        ...extraHeld.map((t) => t.contract),
      ]);
      const tokens = [
        ...tokenItems.map((item) => mapToken(item, chain, prices)).filter((t): t is OnchainToken => !!t),
        ...extraHeld,
      ];
      const seenTok = new Set<string>();
      const mergedTokens = tokens.filter((t) => {
        const key = t.contract;
        if (seenTok.has(key)) return false;
        seenTok.add(key);
        return true;
      });
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
      const transferStamps = transfers.map((tr) => tr.timestamp).filter((s): s is string => !!s);
      const allStamps = [...stamps, ...transferStamps];
      const activityDays = allStamps.map(dayKey);
      const activityMethods: Record<string, string[]> = {};
      for (const tx of txs) {
        if (!tx.timestamp) continue;
        const key = dayKey(tx.timestamp);
        const label = tx.method || (!tx.to?.hash ? "Contract deploy" : "Transfer");
        if (!activityMethods[key]) activityMethods[key] = [];
        if (!activityMethods[key].includes(label)) activityMethods[key].push(label);
      }
      const days = new Set(activityDays);
      const weeks = new Set(allStamps.map((s) => s.slice(0, 8)));
      const months = new Set(allStamps.map((s) => s.slice(0, 7)));
      const firstTx = stamps.length ? stamps[stamps.length - 1] : null;
      const lastTx = stamps.length ? stamps[0] : transferStamps[0] || null;
      const walletAgeDays = firstTx ? Math.max(1, Math.round((Date.now() - new Date(firstTx).getTime()) / 86400000)) : 0;
      const counterTx = Number(counters?.transactions_count || 0);
      const counterTr = Number(counters?.token_transfers_count || 0);
      const txCount = Math.max(counterTx, txs.length);
      const transferCount = Math.max(counterTr, transfers.length);
      const valuedTokenCount = mergedTokens.filter((t) => !t.isDust).length;
      const hasHoldings = valuedTokenCount > 0 || (nativeUsd != null && nativeUsd >= 0.01) || nativeQty > 0;
      const interacted = txCount > 0 || transferCount > 0 || mergedTokens.length > 0 || nativeQty > 0 || !!chain.imported;
      return {
        chain: {
          id: chain.id, name: chain.name, explorer: `${chain.explorer}${address}`, balance: formatUnits(info?.coin_balance || "0"),
          nativeSymbol: chain.native, nativeUsd, txCount, transferCount, tokenCount: mergedTokens.length, valuedTokenCount,
          volumeUsd, feesUsd, uniqueContracts, uniqueTokens: Math.max(uniqueTokens, mergedTokens.length), tokenTrades, nftMints,
          contractsDeployed, walletAgeDays, activeDays: days.size, activeWeeks: weeks.size, activeMonths: months.size,
          activityDays, activityMethods, firstTx, lastTx, interacted, hasHoldings, imported: !!chain.imported,
        } satisfies OnchainChain,
        ens: info?.ens_domain_name || null,
        tokens: mergedTokens,
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

export async function lookupWalletToken(
  rawAddress: string,
  rawContract: string,
  opts?: { chainId?: string | null; extraChains?: CustomChainInput[] | null }
) {
  const address = rawAddress.trim().toLowerCase();
  const contract = rawContract.trim().toLowerCase();
  if (!isAddress(address) || !isAddress(contract)) return [];
  const wanted = (opts?.chainId || "").toLowerCase();
  const pool = mergeChains(opts?.extraChains).filter((chain) => {
    if (!wanted) return true;
    return chain.id === wanted || chain.name.toLowerCase() === wanted || chain.slug === wanted;
  });
  const hits = await Promise.all(
    pool.map(async (chain) => {
      if (chain.host) {
        const [info, items] = await Promise.all([
          getJson(`${chain.host}/api/v2/tokens/${contract}`) as Promise<{ type?: string; symbol?: string; name?: string; decimals?: string } | null>,
          loadTokenItems(chain.host, address),
        ]);
        const held = items.find((t) => (t.token?.address_hash || "").toLowerCase() === contract);
        if (held) {
          const decimals = Number(held.token?.decimals || info?.decimals || 18);
          return {
            kind: "token" as const,
            symbol: held.token?.symbol || info?.symbol || "TOKEN",
            name: held.token?.name || info?.name || "",
            chain: chain.name,
            chainId: chain.id,
            balance: formatUnits(held.value || "0", decimals),
            contract,
            href: `${chain.tokenExplorer}${contract}`,
          };
        }
      }
      if (chain.rpc) {
        const held = await readErc20(chain.rpc, contract, address);
        if (!held) return null;
        return {
          kind: "token" as const,
          symbol: held.symbol,
          name: held.name,
          chain: chain.name,
          chainId: chain.id,
          balance: held.balance,
          contract,
          href: `${chain.tokenExplorer}${contract}`,
        };
      }
      return null;
    })
  );
  return hits.filter(Boolean);
}
