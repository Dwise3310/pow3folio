import { type DefiProtocol } from "@/lib/defi";
import {
  type CustomChainInput,
  type ImportedTokenRef,
  type OnchainChain,
  type OnchainFootprint,
  type OnchainToken,
  mergeChains,
  getJson,
  isAddress,
  formatUnits,
  toNumber,
} from "@/lib/onchain";
import { nativePriceUsd, readErc20, rpcCall } from "@/lib/chain-rpc";

const CHAIN_BUDGET_MS = 5500;
const ZERO = "0x0000000000000000000000000000000000000000";

type TokenItem = {
  value?: string;
  token?: { address_hash?: string; symbol?: string; name?: string; decimals?: string; exchange_rate?: string | number | null; type?: string };
};

type TxItem = {
  value?: string;
  fee?: { value?: string };
  timestamp?: string;
  to?: { hash?: string } | null;
  from?: { hash?: string } | null;
  method?: string | null;
};

type TransferItem = {
  total?: { value?: string; token_id?: string };
  timestamp?: string;
  type?: string;
  token?: { decimals?: string; exchange_rate?: string | number | null; address_hash?: string; symbol?: string; type?: string };
  from?: { hash?: string } | null;
  to?: { hash?: string } | null;
  token_id?: string;
};

type NftItem = {
  id?: string;
  token_type?: string;
  token?: { address_hash?: string; type?: string };
};

function empty(chainId: string, name: string, explorer: string, native: string, address: string, imported: boolean): OnchainChain {
  return {
    id: chainId,
    name,
    explorer: `${explorer}${address}`,
    balance: "0",
    nativeSymbol: native,
    nativeUsd: null,
    txCount: 0,
    transferCount: 0,
    tokenCount: 0,
    valuedTokenCount: 0,
    volumeUsd: 0,
    feesUsd: 0,
    uniqueContracts: 0,
    uniqueTokens: 0,
    tokenTrades: 0,
    nftMints: 0,
    contractsDeployed: 0,
    walletAgeDays: 0,
    activeDays: 0,
    activeWeeks: 0,
    activeMonths: 0,
    activityDays: [],
    activityMethods: {},
    firstTx: null,
    lastTx: null,
    interacted: imported,
    hasHoldings: false,
    imported,
  };
}

async function withBudget<T>(task: Promise<T>, fallback: T, ms = CHAIN_BUDGET_MS): Promise<T> {
  try {
    return await Promise.race([
      task,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
    ]);
  } catch {
    return fallback;
  }
}

function pageItems<T>(json: unknown): T[] {
  if (Array.isArray(json)) return json as T[];
  if (!json || typeof json !== "object") return [];
  const items = (json as { items?: T[] }).items;
  return Array.isArray(items) ? items : [];
}

function isoWeekKey(day: string) {
  const d = new Date(`${day.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(d.getTime())) return day.slice(0, 10);
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function deriveActivity(stamps: string[]) {
  const sorted = stamps.filter((s): s is string => !!s).sort();
  const activityDays = [...new Set(sorted.map((s) => s.slice(0, 10)))];
  const firstTx = sorted[0] || null;
  const lastTx = sorted[sorted.length - 1] || null;
  const walletAgeDays = firstTx ? Math.max(1, Math.round((Date.now() - new Date(firstTx).getTime()) / 86400000)) : 0;
  return {
    firstTx,
    lastTx,
    activityDays,
    activeDays: activityDays.length,
    activeWeeks: new Set(activityDays.map(isoWeekKey)).size,
    activeMonths: new Set(activityDays.map((d) => d.slice(0, 7))).size,
    walletAgeDays,
  };
}

export function applyActivity(chain: OnchainChain, stamps: string[]) {
  const next = deriveActivity([...(chain.activityDays || []), ...stamps, chain.firstTx || "", chain.lastTx || ""]);
  if (next.firstTx && (!chain.firstTx || next.firstTx < chain.firstTx)) chain.firstTx = next.firstTx;
  if (next.lastTx && (!chain.lastTx || next.lastTx > chain.lastTx)) chain.lastTx = next.lastTx;
  chain.activityDays = [...new Set([...(chain.activityDays || []), ...next.activityDays])].sort();
  chain.activeDays = chain.activityDays.length;
  chain.activeWeeks = new Set(chain.activityDays.map(isoWeekKey)).size;
  chain.activeMonths = new Set(chain.activityDays.map((d) => d.slice(0, 7))).size;
  if (chain.firstTx) {
    chain.walletAgeDays = Math.max(1, Math.round((Date.now() - new Date(chain.firstTx).getTime()) / 86400000));
  }
}

function isNftType(type: string | undefined) {
  const t = (type || "").toUpperCase();
  return t.includes("721") || t.includes("1155") || t.includes("NFT");
}

export function countNfts(transfers: TransferItem[], nftItems: NftItem[], address: string) {
  const holdings = nftItems.filter((item) => isNftType(item.token_type || item.token?.type) || item.id || item.token?.address_hash).length;
  const nftTransfers = transfers.filter((tr) => isNftType(tr.token?.type || tr.type));
  const minted = nftTransfers.filter((tr) => {
    const from = (tr.from?.hash || "").toLowerCase();
    return from === ZERO || /mint/i.test(tr.type || tr.token?.type || "");
  }).length;
  const inbound = new Set(
    nftTransfers
      .filter((tr) => (tr.to?.hash || "").toLowerCase() === address)
      .map((tr) => `${(tr.token?.address_hash || "").toLowerCase()}:${tr.token_id || tr.total?.token_id || ""}`)
  ).size;
  return Math.max(holdings, minted, inbound, nftTransfers.length ? 1 : 0);
}

export async function loadOnchainFootprintFast(
  rawAddress: string,
  extraChains?: CustomChainInput[] | null,
  importedTokens?: ImportedTokenRef[] | null
): Promise<OnchainFootprint | null> {
  const address = rawAddress.trim().toLowerCase();
  if (!isAddress(address)) return null;

  const ensPromise = getJson(`https://api.ensdata.net/${address}`, 3500) as Promise<{ ens?: string } | null>;
  const chainsToLoad = mergeChains(extraChains);
  const refs = importedTokens || [];

  const chainRows = await Promise.all(
    chainsToLoad.map((chain) =>
      withBudget(
        (async () => {
          const host = (chain.host || "").replace(/\/$/, "");
          const pricePromise = nativePriceUsd(chain.native).catch(() => null);
          const [info, counters, balances, txsJson, transfersJson, nftJson] = await Promise.all([
            host
              ? (getJson(`${host}/api/v2/addresses/${address}`, 4000) as Promise<{
                  coin_balance?: string;
                  ens_domain_name?: string;
                  exchange_rate?: string | number | null;
                } | null>)
              : Promise.resolve(null),
            host
              ? (getJson(`${host}/api/v2/addresses/${address}/counters`, 4000) as Promise<{
                  transactions_count?: string;
                  token_transfers_count?: string;
                } | null>)
              : Promise.resolve(null),
            host
              ? (getJson(`${host}/api/v2/addresses/${address}/token-balances`, 4000) as Promise<TokenItem[] | null>)
              : Promise.resolve(null),
            host ? getJson(`${host}/api/v2/addresses/${address}/transactions`, 4000) : Promise.resolve(null),
            host ? getJson(`${host}/api/v2/addresses/${address}/token-transfers`, 4000) : Promise.resolve(null),
            host ? getJson(`${host}/api/v2/addresses/${address}/nft`, 4000) : Promise.resolve(null),
          ]);

          const fallbackRate = await Promise.race([
            pricePromise,
            new Promise<number | null>((resolve) => setTimeout(() => resolve(null), 1800)),
          ]);

          const rawBalances = Array.isArray(balances) ? balances : pageItems<TokenItem>(balances);
          const tokenItems = rawBalances.filter((item) => {
            const type = (item.token?.type || "").toUpperCase();
            return !type || type === "ERC-20";
          });

          const extraHeld: OnchainToken[] = [];
          if (chain.rpc) {
            const mine = refs.filter((t) => t.chainId === chain.id && isAddress(t.contract));
            for (const ref of mine.slice(0, 8)) {
              const held = await readErc20(chain.rpc, ref.contract, address);
              if (!held) continue;
              extraHeld.push({
                symbol: held.symbol,
                name: held.name,
                chain: chain.name,
                chainId: chain.id,
                balance: held.balance,
                contract: ref.contract,
                href: `${chain.tokenExplorer}${ref.contract}`,
                usdValue: null,
                isDust: true,
              });
            }
          }

          const tokens: OnchainToken[] = [];
          for (const item of tokenItems) {
            const contract = (item.token?.address_hash || "").toLowerCase();
            if (!contract) continue;
            const decimals = Number(item.token?.decimals || 18);
            const qty = toNumber(item.value || "0", decimals);
            if (qty <= 0) continue;
            const rate = item.token?.exchange_rate == null ? null : Number(item.token.exchange_rate);
            const usdValue = rate != null && Number.isFinite(rate) ? qty * rate : null;
            tokens.push({
              symbol: item.token?.symbol || "TOKEN",
              name: item.token?.name || "",
              chain: chain.name,
              chainId: chain.id,
              balance: formatUnits(item.value || "0", decimals),
              contract,
              href: `${chain.tokenExplorer}${contract}`,
              usdValue,
              isDust: usdValue == null || usdValue < 1,
            });
          }
          for (const t of extraHeld) {
            if (!tokens.some((x) => x.contract === t.contract)) tokens.push(t);
          }

          const explorerRate = info?.exchange_rate == null ? null : Number(info.exchange_rate);
          const nativeRate =
            explorerRate != null && Number.isFinite(explorerRate) && explorerRate > 0 ? explorerRate : fallbackRate;

          let nativeQty = toNumber(info?.coin_balance || "0", 18);
          if (nativeQty <= 0 && chain.rpc) {
            const balanceHex = await rpcCall(chain.rpc, "eth_getBalance", [address, "latest"]);
            if (typeof balanceHex === "string") {
              try {
                nativeQty = Math.max(nativeQty, toNumber(BigInt(balanceHex).toString(), 18));
              } catch {
                /* ignore */
              }
            }
          }

          const nativeUsd = nativeRate != null && Number.isFinite(nativeRate) && nativeQty > 0 ? nativeQty * nativeRate : null;
          const txCount = Number(counters?.transactions_count || 0);
          const transferCount = Number(counters?.token_transfers_count || 0);
          const valuedTokenCount = tokens.filter((t) => !t.isDust).length;

          const txs = pageItems<TxItem>(txsJson);
          const transfers = pageItems<TransferItem>(transfersJson);
          const nfts = pageItems<NftItem>(nftJson);
          let volumeUsd = 0;
          let feesUsd = 0;
          if (nativeRate != null && Number.isFinite(nativeRate)) {
            volumeUsd += txs.reduce((sum, tx) => sum + toNumber(tx.value || "0", 18) * nativeRate, 0);
            feesUsd += txs.reduce((sum, tx) => sum + toNumber(tx.fee?.value || "0", 18) * nativeRate, 0);
          }
          for (const tr of transfers) {
            const decimals = Number(tr.token?.decimals || 18);
            const qty = toNumber(tr.total?.value || "0", decimals);
            const rate = tr.token?.exchange_rate == null ? null : Number(tr.token.exchange_rate);
            if (rate != null && Number.isFinite(rate) && rate > 0) volumeUsd += qty * rate;
          }

          const activity = deriveActivity([...txs, ...transfers].map((row) => row.timestamp || ""));
          const uniqueContracts = new Set(
            txs.map((tx) => (tx.to?.hash || "").toLowerCase()).filter((h) => h && h !== address)
          ).size;
          const tokenTrades = transfers.filter((tr) => {
            const type = (tr.token?.type || tr.type || "").toUpperCase();
            return type.includes("ERC-20") || type === "TOKEN_TRANSFER" || (!type && !isNftType(type));
          }).length;
          const nftMints = countNfts(transfers, nfts, address);
          const contractsDeployed = txs.filter((tx) => !tx.to?.hash && (tx.from?.hash || "").toLowerCase() === address).length;
          const hasHoldings = valuedTokenCount > 0 || (nativeUsd != null && nativeUsd >= 0.01) || nativeQty > 0 || nftMints > 0;
          const interacted = txCount > 0 || transferCount > 0 || tokens.length > 0 || nativeQty > 0 || nftMints > 0 || !!chain.imported;

          return {
            chain: {
              ...empty(chain.id, chain.name, chain.explorer, chain.native, address, !!chain.imported),
              balance: nativeQty > 0 ? String(nativeQty) : formatUnits(info?.coin_balance || "0"),
              nativeUsd,
              txCount: Math.max(txCount, txs.length),
              transferCount: Math.max(transferCount, transfers.length),
              tokenCount: tokens.length,
              valuedTokenCount,
              uniqueTokens: tokens.length,
              uniqueContracts,
              tokenTrades,
              nftMints,
              contractsDeployed,
              volumeUsd,
              feesUsd,
              firstTx: activity.firstTx,
              lastTx: activity.lastTx,
              walletAgeDays: activity.walletAgeDays,
              activityDays: activity.activityDays,
              activeDays: activity.activeDays,
              activeWeeks: activity.activeWeeks,
              activeMonths: activity.activeMonths,
              interacted,
              hasHoldings,
            } satisfies OnchainChain,
            ens: info?.ens_domain_name || null,
            tokens,
            protocols: [] as DefiProtocol[],
          };
        })(),
        {
          chain: empty(chain.id, chain.name, chain.explorer, chain.native, address, !!chain.imported),
          ens: null as string | null,
          tokens: [] as OnchainToken[],
          protocols: [] as DefiProtocol[],
        }
      )
    )
  );

  const ensData = await ensPromise;
  const chains = chainRows.map((r) => r.chain);
  const tokens = chainRows.flatMap((r) => r.tokens).sort((a, b) => (b.usdValue ?? -1) - (a.usdValue ?? -1));
  const ens = ensData?.ens || chainRows.find((r) => r.ens)?.ens || null;
  const totalValueUsd =
    tokens.reduce((sum, t) => sum + (t.usdValue && !t.isDust ? t.usdValue : 0), 0) +
    chains.reduce((sum, c) => sum + (c.nativeUsd && c.nativeUsd >= 0.01 ? c.nativeUsd : 0), 0);

  return {
    address,
    ens,
    chains,
    tokens,
    protocols: [],
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
