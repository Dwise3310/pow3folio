import Link from "next/link";
import ThemeToggle from "@/components/theme/ThemeToggle";

export const metadata = {
  title: "FAQ",
  description: "Answers about Pow3Folio profiles, proof of work, scores, and discovery.",
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is Pow3Folio?",
    a: "A public proof of work portfolio for Web3 builders: traders, researchers, community leads, airdrop hunters and developers. One clean URL shows trades, writing, community, airdrops, credentials and onchain presence.",
  },
  {
    q: "Who are builders and talents?",
    a: "Everyone with a public profile is a builder (also called a talent). Teams discover builders on the View talents page.",
  },
  {
    q: "What is Profile Score?",
    a: "A 0 to 100 score for completeness, richness and professionalism of your profile fields: identity, About depth, skills with descriptions, work/education, connections and whether proof sections have content.",
  },
  {
    q: "What is Builder Score?",
    a: "A separate 0 to 100 score for evidence density in your craft: technical writing, trading logs and platforms, community roles, onchain/airdrops, and linked work history. More verified proof raises this score.",
  },
  {
    q: "How do I make a tab public or private?",
    a: "In the dashboard, use section visibility toggles. About stays available; Writing, Trading, Community, Airdrops and Onchain can be turned off so they do not appear on your public URL.",
  },
  {
    q: "How do skill pillars work?",
    a: "Each skill is a name plus a short brief (max 250 characters). On the public About tab they appear as compact chips. Tap a chip to open the description. Click outside to close.",
  },
  {
    q: "Can people download my CV from my public page?",
    a: "No. Download CV lives on your dashboard only. It builds a professional PDF from the information you already added. Later you will be able to export skill-specific versions.",
  },
  {
    q: "What is work experience limited to?",
    a: "Up to 5 entries. Each can include company or project, role, full-time or part-time, dates, description and an external link.",
  },
  {
    q: "Where is my public link?",
    a: "https://pow3folio.vercel.app/your_username after you set a username and make the profile public.",
  },
  {
    q: "What is Pow3Bot?",
    a: "The in-product assistant for Pow3Folio only. It helps with setup, copy, scores and how-tos. It does not give investment advice or support for other apps.",
  },
  {
    q: "How do I get Featured on View talents?",
    a: "Featured is a curator flag on high quality public profiles. Contact the team or improve completeness and proof until you are selected.",
  },
  {
    q: "Can I hide my email?",
    a: "Yes. Primary and secondary emails only show when you enable the public toggles in Profile.",
  },
  {
    q: "Does Pow3Bot train on my chats?",
    a: "Chats go through our server to Gemini. On Google free tier, prompts may be used to improve their products. For production privacy, use a paid Gemini project with data opt-out when available.",
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="container-app flex h-14 items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              <span className="text-xs font-bold">P3</span>
            </div>
            <span className="font-semibold truncate text-sm">
              Pow<span className="text-primary">3</span>Folio
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/talents" className="btn-ghost text-xs">View talents</Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="container-app max-w-2xl py-8 sm:py-10">
        <p className="text-[11px] font-medium uppercase tracking-wider text-foreground-subtle">Help</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">FAQ</h1>
        <p className="mt-2 text-sm text-foreground-muted">
          Product answers for builders and teams. For live help, open Pow3Bot (AI button).
        </p>
        <ul className="mt-8 space-y-4">
          {FAQS.map((item) => (
            <li key={item.q} className="card p-4">
              <h2 className="text-sm font-semibold">{item.q}</h2>
              <p className="mt-1.5 text-sm text-foreground-muted leading-relaxed">{item.a}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
