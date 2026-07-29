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
