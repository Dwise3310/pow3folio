export type PlatformDef = {
  name: string;
  domain: string;
  logo?: string;
};

/** Popular CEX + DEX + related platforms. Used for typeahead search. */
export const CEX_DEX_PLATFORMS: PlatformDef[] = [
  {
    name: "Binance",
    domain: "https://www.binance.com",
    logo: "https://assets.coingecko.com/markets/images/52/small/binance.jpg",
  },
  {
    name: "Bybit",
    domain: "https://www.bybit.com",
    logo: "https://assets.coingecko.com/markets/images/698/small/bybit_spot.png",
  },
  {
    name: "Hyperliquid",
    domain: "https://app.hyperliquid.xyz",
    logo: "https://assets.coingecko.com/markets/images/1409/small/hyperliquid.jpg",
  },
  { name: "MEXC", domain: "https://www.mexc.com", logo: "https://assets.coingecko.com/markets/images/409/small/MEXC_logo_square_%281%29.png" },
  { name: "OKX", domain: "https://www.okx.com", logo: "https://assets.coingecko.com/markets/images/96/small/WeChat_Image_20220117220452.png" },
  { name: "Bitget", domain: "https://www.bitget.com" },
  { name: "Gate.io", domain: "https://www.gate.io" },
  { name: "KuCoin", domain: "https://www.kucoin.com" },
  { name: "Coinbase", domain: "https://www.coinbase.com" },
  { name: "Kraken", domain: "https://www.kraken.com" },
  { name: "HTX", domain: "https://www.htx.com" },
  { name: "Bitfinex", domain: "https://www.bitfinex.com" },
  { name: "Crypto.com", domain: "https://crypto.com" },
  { name: "BingX", domain: "https://bingx.com" },
  { name: "Bitmart", domain: "https://www.bitmart.com" },
  { name: "LBank", domain: "https://www.lbank.com" },
  { name: "Phemex", domain: "https://phemex.com" },
  { name: "Woo X", domain: "https://woo.org" },
  { name: "Deribit", domain: "https://www.deribit.com" },
  { name: "dYdX", domain: "https://dydx.trade" },
  { name: "GMX", domain: "https://app.gmx.io" },
  { name: "Gains Network", domain: "https://gains.trade" },
  { name: "Vertex", domain: "https://app.vertexprotocol.com" },
  { name: "Aevo", domain: "https://www.aevo.xyz" },
  { name: "Synthetix", domain: "https://synthetix.io" },
  { name: "Uniswap", domain: "https://app.uniswap.org" },
  { name: "PancakeSwap", domain: "https://pancakeswap.finance" },
  { name: "SushiSwap", domain: "https://www.sushi.com" },
  { name: "Curve", domain: "https://curve.fi" },
  { name: "Balancer", domain: "https://balancer.fi" },
  { name: "1inch", domain: "https://app.1inch.io" },
  { name: "Jupiter", domain: "https://jup.ag" },
  { name: "Raydium", domain: "https://raydium.io" },
  { name: "Orca", domain: "https://www.orca.so" },
  { name: "Polymarket", domain: "https://polymarket.com" },
  { name: "Limitless", domain: "https://limitless.exchange" },
  { name: "TradingView", domain: "https://www.tradingview.com" },
  { name: "BloFin", domain: "https://www.blofin.com" },
  { name: "Weex", domain: "https://www.weex.com" },
  { name: "Bitunix", domain: "https://www.bitunix.com" },
  { name: "Toobit", domain: "https://www.toobit.com" },
  { name: "Deepcoin", domain: "https://www.deepcoin.com" },
  { name: "Aster", domain: "https://www.aster.finance" },
  { name: "ApeX", domain: "https://www.apex.exchange" },
  { name: "Orderly", domain: "https://orderly.network" },
  { name: "Perpetual Protocol", domain: "https://app.perp.com" },
  { name: "Kwenta", domain: "https://kwenta.eth.limo" },
  { name: "Mux Protocol", domain: "https://app.mux.network" },
  { name: "Level Finance", domain: "https://app.level.finance" },
  { name: "Vela Exchange", domain: "https://www.vela.exchange" },
  { name: "Drift", domain: "https://app.drift.trade" },
  { name: "Zeta Markets", domain: "https://zeta.markets" },
  { name: "Phoenix", domain: "https://phoenix.trade" },
  { name: "Mango Markets", domain: "https://trade.mango.markets" },
  { name: "BitMEX", domain: "https://www.bitmex.com" },
  { name: "Upbit", domain: "https://upbit.com" },
  { name: "Bithumb", domain: "https://www.bithumb.com" },
  { name: "Coinone", domain: "https://coinone.co.kr" },
  { name: "Bitstamp", domain: "https://www.bitstamp.net" },
  { name: "Gemini", domain: "https://www.gemini.com" },
  { name: "Bitflyer", domain: "https://bitflyer.com" },
  { name: "Independent Reserve", domain: "https://www.independentreserve.com" },
  { name: "Luno", domain: "https://www.luno.com" },
  { name: "VALR", domain: "https://www.valr.com" },
  { name: "Yellow Card", domain: "https://yellowcard.io" },
  { name: "Quidax", domain: "https://www.quidax.com" },
  { name: "Busha", domain: "https://www.busha.co" },
  { name: "Roqqu", domain: "https://roqqu.com" },
];

export function searchPlatforms(query: string, limit = 8): PlatformDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return CEX_DEX_PLATFORMS.slice(0, limit);
  return CEX_DEX_PLATFORMS.filter((p) =>
    p.name.toLowerCase().includes(q)
  ).slice(0, limit);
}

export function getPlatformDomain(name: string): string {
  const found = CEX_DEX_PLATFORMS.find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );
  return found?.domain || `https://${name.toLowerCase().replace(/\s+/g, "")}.com`;
}

/** Resolve a display logo for a platform name. */
export function getPlatformLogo(name: string): string {
  const found = CEX_DEX_PLATFORMS.find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );
  if (found?.logo) return found.logo;
  const domain = found?.domain || getPlatformDomain(name);
  try {
    const host = new URL(domain).hostname.replace(/^www\./, "");
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch {
    return `https://www.google.com/s2/favicons?domain=${name.toLowerCase().replace(/\s+/g, "")}&sz=64`;
  }
}
