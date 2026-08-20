export type Skill = {
  name: string;
  description: string;
};

export type WorkExperience = {
  id: string;
  company: string;
  description: string | null;
  url: string | null;
  role: string;
  employment_type: "full-time" | "part-time";
  start_date: string;
  end_date: string | null;
};

export type Education = {
  id: string;
  institution: string;
  degree: string | null;
  field_of_study: string | null;
  country: string | null;
  start_year: string | null;
  end_year: string | null;
  description: string | null;
  url: string | null;
};

export type TradingPlatform = {
  id: string;
  name: string;
  link: string;
  logo?: string | null;
};

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  long_bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  open_to_work: boolean;
  wallet_address: string | null;
  ens_name: string | null;
  x_url: string | null;
  discord_url: string | null;
  telegram_url: string | null;
  github_url: string | null;
  website_url: string | null;
  secondary_email: string | null;
  primary_email: string | null;
  show_primary_email: boolean;
  show_secondary_email: boolean;
  location_country: string | null;
  location_region: string | null;
  skills: Skill[] | string[] | null;
  work_experience: WorkExperience[] | null;
  education: Education[] | null;
  trading_platforms: TradingPlatform[] | null;
  show_writing: boolean;
  show_trading: boolean;
  show_community: boolean;
  show_airdrops: boolean;
  show_nfts: boolean;
  show_credentials: boolean;
  show_dust_tokens: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type ProfileUpdate = Partial<
  Omit<Profile, "id" | "created_at" | "updated_at">
>;

export type Writing = {
  id: string;
  user_id: string;
  title: string;
  url: string;
  thumbnail_url: string | null;
  image_url_2: string | null;
  description: string | null;
  tags: string[] | null;
  published_at: string | null;
  likes: number;
  views: number;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TradeDirection = "long" | "short" | "spot";
export type TradeStatus = "win" | "loss" | "breakeven" | "open";

export type Trade = {
  id: string;
  user_id: string;
  ticker: string;
  pair: string | null;
  direction: TradeDirection | null;
  status: TradeStatus;
  roi: number | null;
  entry_price: number | null;
  exit_price: number | null;
  chart_url: string | null;
  chart_url_2: string | null;
  post_url: string | null;
  analysis: string | null;
  traded_at: string | null;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TradeUpdate = {
  id: string;
  trade_id: string;
  user_id: string;
  label: string;
  chart_url: string | null;
  caption: string | null;
  post_url: string | null;
  occurred_at: string | null;
  created_at: string;
};

export type CommunityItem = {
  id: string;
  user_id: string;
  title: string;
  role: string | null;
  platform: string | null;
  description: string | null;
  url: string | null;
  thumbnail_url: string | null;
  metrics: string | null;
  started_at: string | null;
  ended_at: string | null;
  tags: string[] | null;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type AirdropStatus =
  | "farming"
  | "qualified"
  | "claimed"
  | "missed"
  | "pending";

export type Airdrop = {
  id: string;
  user_id: string;
  title: string;
  chain: string | null;
  status: AirdropStatus;
  role: string | null;
  description: string | null;
  reward: string | null;
  url: string | null;
  thumbnail_url: string | null;
  started_at: string | null;
  claimed_at: string | null;
  tags: string[] | null;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Collectible = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  url: string | null;
  image_url: string | null;
  chain: string | null;
  collection_name: string | null;
  token_id: string | null;
  acquired_at: string | null;
  tags: string[] | null;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Credential = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string | null;
  file_type: string | null;
  issuer: string | null;
  issued_at: string | null;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
