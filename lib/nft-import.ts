import { resolveNftMedia, type ResolvedNft } from "@/lib/nft-engine";

export type NftImportResult = {
  verified: boolean;
  name: string;
  collection: string | null;
  chain: string;
  contractAddress: string;
  tokenId: string;
  image: string | null;
  imageCandidates: string[];
  description: string | null;
  attributes: unknown[];
  marketplaceUrl: string;
  owner: string | null;
  media?: ResolvedNft["media"];
  standard?: ResolvedNft["standard"];
  tokenUri?: string | null;
  failure?: ResolvedNft["failure"];
  error?: string;
};

export async function importNftFromInput(input: {
  url: string;
  walletAddress: string;
}): Promise<NftImportResult> {
  const resolved = await resolveNftMedia({
    url: input.url,
    walletAddress: input.walletAddress,
    verifyOwnership: true,
  });
  return {
    verified: resolved.verified,
    name: resolved.name,
    collection: resolved.collection,
    chain: resolved.chain,
    contractAddress: resolved.contractAddress,
    tokenId: resolved.tokenId,
    image: resolved.image,
    imageCandidates: resolved.imageCandidates,
    description: resolved.description,
    attributes: resolved.attributes,
    marketplaceUrl: resolved.marketplaceUrl,
    owner: resolved.owner,
    media: resolved.media,
    standard: resolved.standard,
    tokenUri: resolved.tokenUri,
    failure: resolved.failure,
    error: resolved.error,
  };
}
