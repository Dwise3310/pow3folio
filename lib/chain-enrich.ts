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

export async function enrichFootprint(
  data: OnchainFootprint,
  extra: CustomChainInput[],
  imported: ImportedTokenRef[]
) {
  for (const chain of data.chains) {
    const isKii = /kii/i.test(chain.name) || chain.id === "kiichain";
    const rate = await nativePriceUsd(chain.nativeSymbol);
    let qty = Number(chain.balance) || 0;

    if ((qty <= 0 || chain.txCount === 0) && (isKii || chain.imported)) {
      const rpc = isKii ? kiiRpcs() : [];
      const extraMatch = extra.find((c) => (c.id || "").toLowerCase() === chain.id || (c.name || "").toLowerCase() === chain.name.toLowerCase());
      const rpcUrl = extraMatch?.rpc || rpc[0];
      if (rpcUrl && isAddress(data.address)) {
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
        if (activity.firstTx) chain.firstTx = chain.firstTx || activity.firstTx;
        if (activity.lastTx) chain.lastTx = activity.lastTx;
        if (activity.days.length) {
          chain.activityDays = [...new Set([...(chain.activityDays || []), ...activity.days])];
          chain.activeDays = chain.activityDays.length;
        }
        if (rate && activity.volumeNative > 0 && chain.volumeUsd === 0) {
          chain.volumeUsd = activity.volumeNative * rate;
        }
      }
    }

    if (isKii && chain.volumeUsd === 0) {
      const host = "https://blockscout.kiichain.io";
      const txs = await getPagedItems<{ value?: string; timestamp?: string; to?: { hash?: string } | null; fee?: { value?: string } }>(
        `${host}/api/v2/addresses/${data.address}/transactions`,
        8
      );
      if (txs.length) {
        chain.txCount = Math.max(chain.txCount, txs.length);
        if (rate) {
          chain.volumeUsd = txs.reduce((sum, tx) => sum + toNumber(tx.value || "0", 18) * rate, 0);
          chain.feesUsd = txs.reduce((sum, tx) => sum + toNumber(tx.fee?.value || "0", 18) * rate, 0);
        }
        const stamps = txs.map((tx) => tx.timestamp).filter((s): s is string => !!s);
        if (stamps.length) {
          chain.lastTx = stamps[0];
          chain.firstTx = stamps[stamps.length - 1];
        }
      }
      const tokens = await getJson(`${host}/api/v2/addresses/${data.address}/token-balances`);
      if (Array.isArray(tokens) && tokens.length) {
        chain.tokenCount = Math.max(chain.tokenCount, tokens.length);
        chain.uniqueTokens = Math.max(chain.uniqueTokens, tokens.length);
      }
    }

    chain.balance = qty > 0 ? String(qty) : chain.balance;
    if (rate && qty > 0) chain.nativeUsd = qty * rate;
    chain.hasHoldings = qty > 0 || chain.tokenCount > 0 || data.tokens.some((t) => t.chainId === chain.id);
    chain.interacted = chain.txCount > 0 || chain.transferCount > 0 || chain.hasHoldings || chain.imported;
  }

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
