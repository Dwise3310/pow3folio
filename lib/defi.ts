export type DefiProtocol = {
  name: string;
  chain: string;
  address: string;
  href: string;
};

const row = (name: string, chain: string, address: string, explorer: string): DefiProtocol => ({
  name,
  chain,
  address: address.toLowerCase(),
  href: `${explorer}${address}`,
});

export const DEFI_PROTOCOLS: DefiProtocol[] = [
  row("Uniswap", "Ethereum", "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD", "https://etherscan.io/address/"),
  row("Uniswap V3", "Ethereum", "0xE592427A0AEce92De3Edee1F18E0157C05861564", "https://etherscan.io/address/"),
  row("Uniswap V2", "Ethereum", "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", "https://etherscan.io/address/"),
  row("Aave", "Ethereum", "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2", "https://etherscan.io/address/"),
  row("Lido", "Ethereum", "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84", "https://etherscan.io/address/"),
  row("Curve", "Ethereum", "0x99a58482EE208bff276bfbea3439139347372d00", "https://etherscan.io/address/"),
  row("1inch", "Ethereum", "0x1111111254EEB25477B68fb85Ed929f73A960582", "https://etherscan.io/address/"),
  row("Morpho", "Ethereum", "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb", "https://etherscan.io/address/"),
  row("Pendle", "Ethereum", "0x888888888889758F76e7103c6CbF23ABbF58F106", "https://etherscan.io/address/"),
  row("EigenLayer", "Ethereum", "0x858646372CC42E1A627fcE94aa7A7033e7CF075A", "https://etherscan.io/address/"),
  row("Compound", "Ethereum", "0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B", "https://etherscan.io/address/"),
  row("Ethena", "Ethereum", "0x870aC11D48B15DB9a138Cf899d20F13F2B883f51", "https://etherscan.io/address/"),
  row("Ether.fi", "Ethereum", "0x308861A430be4cce5502d0A12724771Fc6DaF6f1", "https://etherscan.io/address/"),
  row("Yearn", "Ethereum", "0x50c1a2eA0a861A967D9d0FFE2AE4012c2E053804", "https://etherscan.io/address/"),
  row("CowSwap", "Ethereum", "0x9008D19f58AAbD9eD0D60971565AA8510560ab41", "https://etherscan.io/address/"),
  row("Balancer", "Ethereum", "0xBA12222222228d8Ba445958a75a0704d566BF2C8", "https://etherscan.io/address/"),
  row("Hyperlane", "Ethereum", "0xc005dc82818d67AF737725bD4bf75435d065D239", "https://etherscan.io/address/"),
  row("Aerodrome", "Base", "0xCF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43", "https://basescan.org/address/"),
  row("Uniswap", "Base", "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD", "https://basescan.org/address/"),
  row("Aave", "Base", "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5", "https://basescan.org/address/"),
  row("Moonwell", "Base", "0x8b62A3401a94E83172Ae89e0652037A29862a736", "https://basescan.org/address/"),
  row("Morpho", "Base", "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb", "https://basescan.org/address/"),
  row("Hyperlane", "Base", "0xeA87ae93Fa0019a82A727bfd3eBd1cFCa8f64f1D", "https://basescan.org/address/"),
  row("GMX", "Arbitrum", "0x489ee077994B6658eAfA855C308275EAd8097C4A", "https://arbiscan.io/address/"),
  row("Uniswap", "Arbitrum", "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD", "https://arbiscan.io/address/"),
  row("Aave", "Arbitrum", "0x794a61358D6845594F94dc1DB02A252b5b4814aD", "https://arbiscan.io/address/"),
  row("Camelot", "Arbitrum", "0xc873fEcbd354f5A56E00E710B90EF4201db2448d", "https://arbiscan.io/address/"),
  row("Pendle", "Arbitrum", "0x888888888889758F76e7103c6CbF23ABbF58F106", "https://arbiscan.io/address/"),
  row("Hyperlane", "Arbitrum", "0x979Ca5202784112f473b3bba106d19309beA3B9", "https://arbiscan.io/address/"),
  row("Velodrome", "Optimism", "0xa062aE8A9c5e11aaa026fc2670B0D65cCc8B2858", "https://optimistic.etherscan.io/address/"),
  row("Aave", "Optimism", "0x794a61358D6845594F94dc1DB02A252b5b4814aD", "https://optimistic.etherscan.io/address/"),
  row("Uniswap", "Optimism", "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD", "https://optimistic.etherscan.io/address/"),
  row("Hyperlane", "Optimism", "0xd4C1905BB1D07BC573C8478a57ab2eB53849A316", "https://optimistic.etherscan.io/address/"),
  row("QuickSwap", "Polygon", "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff", "https://polygonscan.com/address/"),
  row("Aave", "Polygon", "0x794a61358D6845594F94dc1DB02A252b5b4814aD", "https://polygonscan.com/address/"),
  row("Uniswap", "Polygon", "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD", "https://polygonscan.com/address/"),
  row("Balancer", "Polygon", "0xBA12222222228d8Ba445958a75a0704d566BF2C8", "https://polygonscan.com/address/"),
  row("Hyperlane", "Polygon", "0x5d934f4e2f797775A00d59211e417d556f11b477", "https://polygonscan.com/address/"),
];

export const DEFI_BY_CHAIN = DEFI_PROTOCOLS.reduce<Record<string, DefiProtocol[]>>((acc, p) => {
  acc[p.chain] = acc[p.chain] || [];
  acc[p.chain].push(p);
  return acc;
}, {});
