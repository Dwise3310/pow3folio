import {
  type CustomChainInput,
  type ImportedTokenRef,
  type OnchainFootprint,
  getPagedItems,
  getJson,
  isAddress,
  toNumber,
} from "@/lib/onchain";
import { kiiLcds, kiiRpcs, loadBankBalances, loadCosmosTxActivity, nativePriceUsd, rpcCall } from "@/lib/chain-rpc";
import { applyActivity, countNfts } from "@/lib/onchain-fast";

export function normalizeExtraChains(extra: CustomChainInput[]): CustomChainInput[] {
  return extra.map((c) => {
    const isKii = /kii/i.test(c.name || "") || (c.id || "").toLowerCase() === "kiichain" || Number(c.chainId) === 1783;
    if (!isKii) return c;
    return {
      ...c,
      id: c.id || "kiichain",
      name: c.name || "KiiChain",
      host: (c.host || "https://blockscout.kiichain.io").replace(/\/$/, ""),
      rpc: c.rpc || kiiRpcs()[0],
      lcd: c.lcd || kiiLcds()[0],
      native: c.native || "KII",
      slug: c.slug || "kiichain",
      chainId: c.chainId || 1783,
      explorer: c.explorer || "https://blockscout.kiichain.io/address/",
    };
  });
}

function explorerHost(chain: { id: string; name: string; explorer: string }, extra: CustomChainInput[]) {
  const match = extra.find(
    (c) =>
      (c.id || "").toLowerCase() === chain.id ||
      (c.name || "").toLowerCase() === chain.name.toLowerCase()
  );
  if (match?.host) return match.host.replace(/\/$/, "");
  const fromExplorer = (chain.explorer || "").replace(/\/address\/?.*$/i, "").replace(/\/$/, "");
  if (/blockscout/i.test(fromExplorer)) return fromExplorer;
  if (/kii/i.test(chain.name) || chain.id === "kiichain") return "https://blockscout.kiichain.io";
  return fromExplorer || "";
}

export async function enrichFootprint(
  data: OnchainFootprint,
  extra: CustomChainInput[],
  imported: ImportedTokenRef[]
) {
  await Promise.all(
    data.chains.map(async (chain) => {
      try {
        const isKii = /kii/i.test(chain.name) || chain.id === "kiichain";
        const rate = await nativePriceUsd(chain.nativeSymbol);
        let qty = Number(chain.balance) || 0;
        const extraMatch = extra.find(
          (c) =>
            (c.id || "").toLowerCase() === chain.id ||
            (c.name || "").toLowerCase() === chain.name.toLowerCase()
        );
        const host = explorerHost(chain, extra);
        const rpcUrl = extraMatch?.rpc || (isKii ? kiiRpcs()[0] : undefined);

        if (qty <= 0 && rpcUrl && isAddress(data.address)) {
          const [balanceHex, nonceHex] = await Promise.all([
            rpcCall(isKii ? kiiRpcs() : rpcUrl, "eth_getBalance", [data.address, "latest"]),
            rpcCall(isKii ? kiiRpcs() : rpcUrl, "eth_getTransactionCount", [data.address, "latest"]),
          ]);
          if (typeof balanceHex === "string") {
            try {
              qty = Math.max(qty, toNumber(BigInt(balanceHex).toString(), 18));
            } catch {
              /* ignore */
            }
          }
          if (typeof nonceHex === "string") {
            try {
              chain.txCount = Math.max(chain.txCount, Number(BigInt(nonceHex)));
            } catch {
              /* ignore */
            }
          }
        }

        if (isKii) {
          const bank = await loadBankBalances(kiiLcds(), data.address, "kii");
          for (const bal of bank) {
            const denom = (bal.denom || "").toLowerCase();
            const amount = bal.amount || "0";
            if (denom === "akii") qty = Math.max(qty, toNumber(amount, 18));
            else if (denom === "ukii") qty = Math.max(qty, toNumber(amount, 6));
            else if (denom === "kii") qty = Math.max(qty, toNumber(amount, 18));
          }
          const activity = await loadCosmosTxActivity(kiiLcds(), data.address, "kii");
          chain.txCount = Math.max(chain.txCount, activity.txCount);
          chain.transferCount = Math.max(chain.transferCount, activity.txCount);
          if (activity.firstTx) chain.firstTx = chain.firstTx && chain.firstTx < activity.firstTx ? chain.firstTx : activity.firstTx;
          if (activity.lastTx) chain.lastTx = chain.lastTx && chain.lastTx > activity.lastTx ? chain.lastTx : activity.lastTx;
          applyActivity(chain, activity.days);
          if (rate && activity.volumeNative > 0 && chain.volumeUsd === 0) {
            chain.volumeUsd = activity.volumeNative * rate;
          }
        }

        const needsExplorer =
          !!host &&
          (
            (qty <= 0 && (isKii || chain.imported || chain.txCount > 0)) ||
            (chain.txCount > 0 && !chain.firstTx) ||
            (chain.transferCount > 0 && chain.nftMints === 0) ||
            (chain.activeDays > 0 && (chain.activeWeeks === 0 || chain.activeMonths === 0 || !chain.walletAgeDays))
          );

        if (needsExplorer) {
          const txs = await getPagedItems<{
            value?: string;
            timestamp?: string;
            to?: { hash?: string } | null;
            from?: { hash?: string } | null;
            fee?: { value?: string };
          }>(`${host}/api/v2/addresses/${data.address}/transactions`, 3);
          if (txs.length) {
            chain.txCount = Math.max(chain.txCount, txs.length);
            if (rate) {
              if (chain.volumeUsd === 0) {
                chain.volumeUsd = txs.reduce((sum, tx) => sum + toNumber(tx.value || "0", 18) * rate, 0);
              }
              if (chain.feesUsd === 0) {
                chain.feesUsd = txs.reduce((sum, tx) => sum + toNumber(tx.fee?.value || "0", 18) * rate, 0);
              }
            }
            applyActivity(
              chain,
              txs.map((tx) => tx.timestamp || "")
            );
            const deployed = txs.filter((tx) => !tx.to?.hash && (tx.from?.hash || "").toLowerCase() === data.address).length;
            chain.contractsDeployed = Math.max(chain.contractsDeployed, deployed);
          }

          if (chain.nftMints === 0 || chain.tokenCount === 0) {
            const [nftJson, transfers] = await Promise.all([
              getJson(`${host}/api/v2/addresses/${data.address}/nft`),
              getPagedItems<{
                timestamp?: string;
                type?: string;
                token?: { type?: string; address_hash?: string };
                from?: { hash?: string } | null;
                to?: { hash?: string } | null;
                token_id?: string;
                total?: { token_id?: string };
              }>(`${host}/api/v2/addresses/${data.address}/token-transfers`, 2),
            ]);
            const nftItems = Array.isArray(nftJson)
              ? nftJson
              : ((nftJson as { items?: unknown[] } | null)?.items || []);
            const nftCount = countNfts(transfers, nftItems as never, data.address);
            chain.nftMints = Math.max(chain.nftMints, nftCount);
            applyActivity(
              chain,
              transfers.map((tr) => tr.timestamp || "")
            );
            if (Array.isArray(nftJson) === false) {
              const tokens = await getJson(`${host}/api/v2/addresses/${data.address}/token-balances`);
              if (Array.isArray(tokens) && tokens.length) {
                chain.tokenCount = Math.max(chain.tokenCount, tokens.filter((t) => {
                  const type = (((t as { token?: { type?: string } }).token?.type) || "").toUpperCase();
                  return !type || type === "ERC-20";
                }).length);
                chain.uniqueTokens = Math.max(chain.uniqueTokens, chain.tokenCount);
              }
            }
          }
        }

        chain.balance = qty > 0 ? String(qty) : chain.balance;
        if (rate && qty > 0) chain.nativeUsd = qty * rate;
        if (chain.firstTx && !chain.walletAgeDays) {
          chain.walletAgeDays = Math.max(1, Math.round((Date.now() - new Date(chain.firstTx).getTime()) / 86400000));
        }
        applyActivity(chain, chain.activityDays || []);
        chain.hasHoldings = qty > 0 || chain.tokenCount > 0 || chain.nftMints > 0 || data.tokens.some((t) => t.chainId === chain.id);
        chain.interacted = chain.txCount > 0 || chain.transferCount > 0 || chain.hasHoldings || chain.imported;
      } catch {
        // Leave this chain as returned by loadOnchainFootprint; do not fail the whole footprint.
      }
    })
  );

  void imported;
  data.totalValueUsd =
    data.tokens.reduce((sum, t) => sum + (t.usdValue && !t.isDust ? t.usdValue : 0), 0) +
    data.chains.reduce((sum, c) => sum + (c.nativeUsd && c.nativeUsd > 0 ? c.nativeUsd : 0), 0);
  data.totalTx = data.chains.reduce((sum, c) => sum + c.txCount, 0);
  data.totalVolumeUsd = data.chains.reduce((sum, c) => sum + c.volumeUsd, 0);
  data.totalFeesUsd = data.chains.reduce((sum, c) => sum + c.feesUsd, 0);
  data.activeChains = data.chains.filter((c) => c.interacted).length;
  data.holdingChains = data.chains.filter((c) => c.hasHoldings).length;
}
