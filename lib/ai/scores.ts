import type {
  Profile,
  Skill,
  WorkExperience,
  Education,
  Writing,
  Trade,
  CommunityItem,
  Airdrop,
  Collectible,
  Credential,
  TradingPlatform,
} from "@/types/database";

export type ScoreBreakdown = {
  score: number;
  max: number;
  label: string;
  tips: string[];
};

export type ProfileScores = {
  profileScore: number;
  builderScore: number;
  profileBreakdown: ScoreBreakdown[];
  builderBreakdown: ScoreBreakdown[];
  completenessPct: number;
  checklist: string[];
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function parseSkills(raw: Profile["skills"] | Skill[] | null | undefined): Skill[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .map((s) => {
      if (typeof s === "string") {
        const t = s.trim();
        if (t.startsWith("{") && t.includes("name")) {
          try {
            const p = JSON.parse(t) as Skill;
            if (p?.name) return { name: p.name, description: p.description || "" };
          } catch {
            /* ignore */
          }
        }
        return { name: t, description: "" };
      }
      return { name: (s as Skill).name || "", description: (s as Skill).description || "" };
    })
    .filter((s) => s.name);
}

export type ScoreInput = {
  profile: Profile;
  writings?: Writing[];
  trades?: Trade[];
  community?: CommunityItem[];
  airdrops?: Airdrop[];
  nfts?: Collectible[];
  credentials?: Credential[];
};

/**
 * Profile Score: completeness, richness, professionalism, authenticity of filled data.
 * Builder Score: evidence density and craft depth from proof sections + links.
 */
export function computeScores(input: ScoreInput): ProfileScores {
  const p = input.profile;
  const skills = parseSkills(p.skills);
  const work = (p.work_experience as WorkExperience[] | null) ?? [];
  const edu = (p.education as Education[] | null) ?? [];
  const platforms = (p.trading_platforms as TradingPlatform[] | null) ?? [];
  const writings = input.writings ?? [];
  const trades = input.trades ?? [];
  const community = input.community ?? [];
  const airdrops = input.airdrops ?? [];
  const nfts = input.nfts ?? [];
  const credentials = input.credentials ?? [];

  const tips: string[] = [];
  const checklist: string[] = [];

  // --- Profile Score components (max ~100) ---
  let profilePts = 0;
  const profileBreakdown: ScoreBreakdown[] = [];

  // Identity basics (20)
  let id = 0;
  if (p.display_name) id += 4;
  else tips.push("Add a display name");
  if (p.avatar_url) id += 4;
  else tips.push("Upload an avatar");
  if (p.banner_url) id += 3;
  else checklist.push("Add a banner");
  if (p.bio && p.bio.length >= 40) id += 5;
  else if (p.bio) id += 2;
  else tips.push("Write a short bio (40+ characters)");
  if (p.location_country) id += 4;
  else checklist.push("Set location");
  profilePts += id;
  profileBreakdown.push({ score: id, max: 20, label: "Identity", tips: [] });

  // About depth (25)
  let about = 0;
  const long = (p.long_bio || "").trim();
  if (long.length >= 200) about += 10;
  else if (long.length >= 80) about += 6;
  else if (long.length > 0) about += 3;
  else tips.push("Expand About (aim for 200+ characters)");

  const skillsWithDesc = skills.filter((s) => s.description && s.description.length >= 20);
  about += Math.min(10, skills.length * 2 + skillsWithDesc.length);
  if (skills.length === 0) tips.push("Add skill pillars with short descriptions");

  about += Math.min(5, work.length * 2);
  if (work.length === 0) checklist.push("Add work experience");

  profilePts += Math.min(25, about);
  profileBreakdown.push({
    score: Math.min(25, about),
    max: 25,
    label: "About depth",
    tips: [],
  });

  // Education + credentials (15)
  let docs = 0;
  docs += Math.min(6, edu.length * 3);
  docs += Math.min(9, credentials.length * 3);
  if (edu.length === 0 && credentials.length === 0) {
    checklist.push("Add education or credentials");
  }
  profilePts += docs;
  profileBreakdown.push({ score: docs, max: 15, label: "Education & docs", tips: [] });

  // Connectables (20)
  let conn = 0;
  if (p.x_url) conn += 4;
  if (p.github_url) conn += 4;
  if (p.telegram_url) conn += 3;
  if (p.website_url) conn += 3;
  if (p.wallet_address) conn += 4;
  if (p.ens_name) conn += 2;
  if (conn < 8) checklist.push("Connect more accounts (X, GitHub, wallet)");
  profilePts += Math.min(20, conn);
  profileBreakdown.push({ score: Math.min(20, conn), max: 20, label: "Connections", tips: [] });

  // Proof presence for completeness (20)
  let proof = 0;
  if (writings.length > 0) proof += 5;
  else checklist.push("Add technical writing or research");
  if (trades.length > 0) proof += 5;
  else checklist.push("Log at least one trade");
  if (community.length > 0) proof += 4;
  else checklist.push("Add a community contribution");
  if (airdrops.length > 0) proof += 3;
  if (platforms.length > 0) proof += 3;
  profilePts += Math.min(20, proof);
  profileBreakdown.push({ score: Math.min(20, proof), max: 20, label: "Proof presence", tips: [] });

  const profileScore = clamp(profilePts);

  // --- Builder Score (evidence density) ---
  let builderPts = 0;
  const builderBreakdown: ScoreBreakdown[] = [];

  // Writing depth (25)
  let w = Math.min(25, writings.length * 5);
  if (writings.some((x) => x.description && x.description.length > 40)) w = Math.min(25, w + 3);
  builderPts += w;
  builderBreakdown.push({ score: w, max: 25, label: "Research & writing", tips: [] });

  // Trading depth (25)
  let t = Math.min(20, trades.length * 4);
  if (platforms.length > 0) t += Math.min(5, platforms.length * 2);
  builderPts += Math.min(25, t);
  builderBreakdown.push({ score: Math.min(25, t), max: 25, label: "Trading evidence", tips: [] });

  // Community (20)
  const c = Math.min(20, community.length * 5);
  builderPts += c;
  builderBreakdown.push({ score: c, max: 20, label: "Community", tips: [] });

  // Onchain + airdrops (15)
  let on = 0;
  if (p.wallet_address) on += 5;
  on += Math.min(5, airdrops.length * 2);
  on += Math.min(5, nfts.length * 2);
  builderPts += on;
  builderBreakdown.push({ score: on, max: 15, label: "Onchain & airdrops", tips: [] });

  // Professional trajectory (15)
  let traj = 0;
  traj += Math.min(8, work.filter((x) => x.url).length * 3 + work.length);
  traj += Math.min(4, skillsWithDesc.length * 2);
  traj += Math.min(3, credentials.length * 2);
  builderPts += Math.min(15, traj);
  builderBreakdown.push({
    score: Math.min(15, traj),
    max: 15,
    label: "Trajectory & links",
    tips: [],
  });

  const builderScore = clamp(builderPts);

  // Completeness % for AI checklist messaging
  const checks = [
    !!p.display_name,
    !!p.avatar_url,
    !!(p.bio && p.bio.length >= 40),
    long.length >= 80,
    skills.length >= 2,
    work.length >= 1,
    !!(p.x_url || p.github_url || p.telegram_url),
    !!p.wallet_address,
    writings.length + trades.length + community.length > 0,
  ];
  const completenessPct = clamp((checks.filter(Boolean).length / checks.length) * 100);

  return {
    profileScore,
    builderScore,
    profileBreakdown,
    builderBreakdown,
    completenessPct,
    checklist: [...new Set([...tips, ...checklist])].slice(0, 8),
  };
}
