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

function isProDesc(s: string, min = 40) {
  const t = s.trim();
  if (t.length < min) return false;
  // penalize very casual / low effort
  if (/\bi'm good\b|\blol\b|\bidk\b|\.\.\.$/i.test(t) && t.length < 80) return false;
  return true;
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
 * Strict scoring. Sparse / unprofessional profiles should land low (often under 20).
 * 80+ requires real depth. 100 is rare.
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
  const profileBreakdown: ScoreBreakdown[] = [];
  const builderBreakdown: ScoreBreakdown[] = [];

  // --- Profile Score (strict) ---
  let profilePts = 0;

  // Identity (max 12)
  let id = 0;
  if (p.display_name && p.display_name.trim().length >= 2) id += 2;
  else tips.push("Add a clear display name");
  if (p.avatar_url) id += 3;
  else tips.push("Upload a real avatar");
  if (p.banner_url) id += 2;
  else checklist.push("Add a banner");
  if (p.bio && isProDesc(p.bio, 50)) id += 3;
  else if (p.bio && p.bio.length >= 25) id += 1;
  else tips.push("Write a professional short bio (50+ characters, no filler)");
  if (p.location_country) id += 2;
  else checklist.push("Set location");
  profilePts += id;
  profileBreakdown.push({ score: id, max: 12, label: "Identity", tips: [] });

  // About depth (max 22)
  let about = 0;
  const long = (p.long_bio || "").trim();
  if (long.length >= 400 && isProDesc(long, 120)) about += 10;
  else if (long.length >= 200 && isProDesc(long, 80)) about += 6;
  else if (long.length >= 100) about += 3;
  else if (long.length > 0) about += 1;
  else tips.push("Expand About (400+ solid characters for full points)");

  const skillsWithDesc = skills.filter(
    (s) => s.description && isProDesc(s.description, 35)
  );
  about += Math.min(8, skillsWithDesc.length * 2);
  if (skills.length > 0 && skillsWithDesc.length === 0) {
    about += Math.min(2, skills.length); // bare names barely count
    tips.push("Add serious skill descriptions (35+ characters each)");
  }
  if (skills.length === 0) tips.push("Add skill pillars with real descriptions");

  const workLinked = work.filter((w) => w.company && w.role && (w.description?.length || 0) >= 40);
  about += Math.min(4, workLinked.length * 2);
  if (work.length === 0) checklist.push("Add work experience with detail");

  profilePts += Math.min(22, about);
  profileBreakdown.push({ score: Math.min(22, about), max: 22, label: "About depth", tips: [] });

  // Education + credentials (max 12)
  let docs = 0;
  docs += Math.min(5, edu.filter((e) => e.institution && e.degree).length * 2);
  docs += Math.min(7, credentials.filter((c) => c.title).length * 2);
  if (edu.length === 0 && credentials.length === 0) {
    checklist.push("Add education or credentials");
  }
  profilePts += docs;
  profileBreakdown.push({ score: docs, max: 12, label: "Education & docs", tips: [] });

  // Connections (max 14)
  let conn = 0;
  if (p.x_url) conn += 3;
  if (p.github_url) conn += 3;
  if (p.telegram_url) conn += 2;
  if (p.website_url) conn += 2;
  if (p.wallet_address && p.wallet_address.length >= 20) conn += 3;
  if (p.ens_name) conn += 1;
  if (conn < 6) checklist.push("Connect X, GitHub, wallet, and a website");
  profilePts += Math.min(14, conn);
  profileBreakdown.push({ score: Math.min(14, conn), max: 14, label: "Connections", tips: [] });

  // Proof presence for profile completeness (max 15) — needs real rows
  let proof = 0;
  if (writings.length >= 3) proof += 5;
  else if (writings.length >= 1) proof += 2;
  else checklist.push("Add technical writing or research");
  if (trades.length >= 3) proof += 5;
  else if (trades.length >= 1) proof += 2;
  else checklist.push("Log multiple trades with analysis");
  if (community.length >= 2) proof += 3;
  else if (community.length >= 1) proof += 1;
  else checklist.push("Add community contributions with detail");
  if (platforms.length >= 1) proof += 2;
  profilePts += Math.min(15, proof);
  profileBreakdown.push({ score: Math.min(15, proof), max: 15, label: "Proof presence", tips: [] });

  // Quality gate: if almost empty, hard cap
  const thin =
    !p.avatar_url &&
    (!p.bio || p.bio.length < 40) &&
    long.length < 80 &&
    skillsWithDesc.length === 0 &&
    writings.length + trades.length + community.length === 0;
  if (thin) profilePts = Math.min(profilePts, 12);

  // Casual copy penalty
  const casualBits = [p.bio, long, ...skills.map((s) => s.description || "")]
    .join(" ")
    .toLowerCase();
  if (/\bi'm good\b|\blol\b|\bidk\b|\bhaha\b/.test(casualBits)) {
    profilePts = Math.max(0, profilePts - 8);
    tips.push("Tighten wording. Casual filler lowers Profile Score");
  }

  const profileScore = clamp(profilePts);

  // --- Builder Score (strict evidence) ---
  let builderPts = 0;

  // Writing (max 22)
  let w = 0;
  w += Math.min(14, writings.length * 3);
  w += Math.min(
    8,
    writings.filter((x) => x.description && isProDesc(x.description, 40)).length * 2
  );
  builderPts += Math.min(22, w);
  builderBreakdown.push({ score: Math.min(22, w), max: 22, label: "Research & writing", tips: [] });

  // Trading (max 22)
  let t = 0;
  t += Math.min(12, trades.length * 2);
  t += Math.min(
    6,
    trades.filter((x) => x.analysis && isProDesc(x.analysis, 40)).length * 2
  );
  t += Math.min(4, platforms.length * 2);
  builderPts += Math.min(22, t);
  builderBreakdown.push({ score: Math.min(22, t), max: 22, label: "Trading evidence", tips: [] });

  // Community (max 18)
  let c = 0;
  c += Math.min(12, community.length * 3);
  c += Math.min(
    6,
    community.filter((x) => x.description && isProDesc(x.description, 40)).length * 2
  );
  builderPts += Math.min(18, c);
  builderBreakdown.push({ score: Math.min(18, c), max: 18, label: "Community", tips: [] });

  // Onchain + airdrops (max 12)
  let on = 0;
  if (p.wallet_address) on += 3;
  on += Math.min(5, airdrops.length * 1);
  on += Math.min(4, nfts.length * 1);
  builderPts += Math.min(12, on);
  builderBreakdown.push({ score: Math.min(12, on), max: 12, label: "Onchain & airdrops", tips: [] });

  // Trajectory (max 12)
  let traj = 0;
  traj += Math.min(6, workLinked.length * 2);
  traj += Math.min(4, skillsWithDesc.length * 1);
  traj += Math.min(2, credentials.length * 1);
  builderPts += Math.min(12, traj);
  builderBreakdown.push({ score: Math.min(12, traj), max: 12, label: "Trajectory & links", tips: [] });

  if (writings.length + trades.length + community.length === 0) {
    builderPts = Math.min(builderPts, 10);
  }

  const builderScore = clamp(builderPts);

  const checks = [
    !!p.display_name,
    !!p.avatar_url,
    !!(p.bio && isProDesc(p.bio, 50)),
    long.length >= 200,
    skillsWithDesc.length >= 2,
    workLinked.length >= 1,
    !!(p.x_url && p.github_url),
    !!p.wallet_address,
    writings.length + trades.length + community.length >= 3,
  ];
  const completenessPct = clamp((checks.filter(Boolean).length / checks.length) * 100);

  return {
    profileScore,
    builderScore,
    profileBreakdown,
    builderBreakdown,
    completenessPct,
    checklist: [...new Set([...tips, ...checklist])].slice(0, 10),
  };
}

/** Compact snapshot for Pow3Bot system context */
export function buildProfileContext(
  input: ScoreInput & { scores?: ProfileScores }
): string {
  const p = input.profile;
  const scores = input.scores || computeScores(input);
  const skills = parseSkills(p.skills);
  const work = (p.work_experience as WorkExperience[] | null) ?? [];
  const edu = (p.education as Education[] | null) ?? [];
  const platforms = (p.trading_platforms as TradingPlatform[] | null) ?? [];

  return [
    `Username: @${p.username}`,
    `Display name: ${p.display_name || "(none)"}`,
    `Bio: ${p.bio || "(empty)"}`,
    `About: ${(p.long_bio || "").slice(0, 1200) || "(empty)"}`,
    `Location: ${[p.location_region, p.location_country].filter(Boolean).join(", ") || "(none)"}`,
    `Open to work: ${p.open_to_work ? "yes" : "no"}`,
    `Skills: ${skills.map((s) => `${s.name}: ${s.description || "(no desc)"}`).join(" | ") || "(none)"}`,
    `Work: ${work.map((w) => `${w.role} @ ${w.company}`).join(" | ") || "(none)"}`,
    `Education: ${edu.map((e) => `${e.degree} ${e.institution}`).join(" | ") || "(none)"}`,
    `Links: X=${p.x_url || "-"} GitHub=${p.github_url || "-"} TG=${p.telegram_url || "-"} Web=${p.website_url || "-"}`,
    `Wallet: ${p.wallet_address || "-"} ENS: ${p.ens_name || "-"}`,
    `Trading platforms: ${platforms.map((x) => x.name).join(", ") || "(none)"}`,
    `Counts: writing=${input.writings?.length || 0} trades=${input.trades?.length || 0} community=${input.community?.length || 0} airdrops=${input.airdrops?.length || 0} nfts=${input.nfts?.length || 0} credentials=${input.credentials?.length || 0}`,
    `Scores now: Profile ${scores.profileScore}/100, Builder ${scores.builderScore}/100`,
    `Checklist: ${scores.checklist.join("; ") || "(none)"}`,
  ].join("\n");
}
