export type OnchainChain = {
  id: string;
  name: string;
  explorer: string;
  balance: string;
  txCount: number;
  tokenCount: number;
};

export type OnchainToken = {
  symbol: string;
  name: string;
  chain: string;
  balance: string;
};

export type OnchainFootprint = {
  address: string;
  ens: string | null;
  chains: OnchainChain[];
  tokens: OnchainToken[];
  totalTx: number;
  activeChains: number;
  explorers: { label: string; href: string }[];
};

const CHAINS = [
  { id: "eth", name: "Ethereum", host: "https://eth.blockscout.com", explorer: "https://etherscan.io/address/" },
  { id: "base", name: "Base", host: "https://base.blockscout.com", explorer: "https://basescan.org/address/" },
  { id: "arb", name: "Arbitrum", host: "https://arbitrum.blockscout.com", explorer: "https://arbiscan.io/address/" },
  { id: "op", name: "Optimism", host: "https://optimism.blockscout.com", explorer: "https://optimistic.etherscan.io/address/" },
  { id: "polygon", name: "Polygon", host: "https://polygon.blockscout.com", explorer: "https://polygonscan.com/address/" },
] as const;

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
    const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "").slice(0, 4);
    return `${whole}.${fracStr}`;
  } catch {
    return "0";
  }
}

async function getJson(url: string, timeoutMs = 8000): Promise<unknown | null> {
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

export async function loadOnchainFootprint(rawAddress: string): Promise<OnchainFootprint | null> {
  const address = rawAddress.trim().toLowerCase();
  if (!isAddress(address)) return null;

  const ensData = (await getJson(`https://api.ensdata.net/${address}`)) as { ens?: string } | null;

  const chainRows = await Promise.all(
    CHAINS.map(async (chain) => {
      const info = (await getJson(`${chain.host}/api/v2/addresses/${address}`)) as {
        coin_balance?: string;
        transactions_count?: number;
        has_tokens?: boolean;
        ens_domain_name?: string;
      } | null;
      const tokensJson = (await getJson(
        `${chain.host}/api/v2/addresses/${address}/tokens?type=ERC-20`
      )) as { items?: Array<{ token?: { symbol?: string; name?: string; decimals?: string }; value?: string }> } | null;

      const items = tokensJson?.items ?? [];
      const txCount = Number(info?.transactions_count || 0);
      const balance = formatUnits(info?.coin_balance || "0");

      return {
        chain: {
          id: chain.id,
          name: chain.name,
          explorer: `${chain.explorer}${address}`,
          balance,
          txCount,
          tokenCount: items.length,
        } satisfies OnchainChain,
        ens: info?.ens_domain_name || null,
        tokens: items.slice(0, 6).map((item) => ({
          symbol: item.token?.symbol || "TOKEN",
          name: item.token?.name || "",
          chain: chain.name,
          balance: formatUnits(item.value || "0", Number(item.token?.decimals || 18)),
        })),
      };
    })
  );

  const chains = chainRows.map((r) => r.chain);
  const tokens = chainRows.flatMap((r) => r.tokens).slice(0, 12);
  const ens = ensData?.ens || chainRows.find((r) => r.ens)?.ens || null;

  return {
    address,
    ens,
    chains,
    tokens,
    totalTx: chains.reduce((sum, c) => sum + c.txCount, 0),
    activeChains: chains.filter((c) => c.txCount > 0 || Number(c.balance) > 0 || c.tokenCount > 0).length,
    explorers: [
      { label: "Etherscan", href: `https://etherscan.io/address/${address}` },
      { label: "Arkham", href: `https://arkm.com/explorer/address/${address}` },
      { label: "DeBank", href: `https://debank.com/profile/${address}` },
    ],
  };
}
