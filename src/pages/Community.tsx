import { MessageSquare, Users, Megaphone, ThumbsUp } from "lucide-react";

const topics = [
  { title: "Looking for Valorant duo partner", author: "NeonSlayer", replies: 14, likes: 8, category: "Team Recruitment" },
  { title: "Tips for improving aim in CS2?", author: "AimBot99", replies: 32, likes: 45, category: "Discussion" },
  { title: "FGN Spring Major announced!", author: "FGN_Admin", replies: 67, likes: 120, category: "Announcement" },
  { title: "Best controller settings for Rocket League", author: "RocketKing", replies: 21, likes: 33, category: "Discussion" },
  { title: "Forming a 5-stack for League Clash", author: "MidDiff", replies: 9, likes: 5, category: "Team Recruitment" },
];

const categoryColor: Record<string, string> = {
  "Team Recruitment": "text-neon-accent",
  Discussion: "text-primary",
  Announcement: "text-warning",
};

const Community = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="py-8 container mx-auto px-4">
        <div className="mb-10">
          <p className="font-display text-xs tracking-[0.3em] text-primary uppercase mb-2">Connect & Discuss</p>
          <h1 className="font-display text-4xl font-bold text-foreground">Community</h1>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-10">
          {[
            { icon: MessageSquare, label: "Forum Posts", value: "1,240" },
            { icon: Users, label: "Online Now", value: "342" },
            { icon: Megaphone, label: "Announcements", value: "18" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-5 text-center glow-card">
              <s.icon className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="font-display text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-sm text-muted-foreground font-heading">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-display text-lg font-bold text-foreground">Recent Topics</h2>
          </div>
          {topics.map((t, i) => (
            <div
              key={i}
              className="p-4 border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between"
            >
              <div>
                <p className="font-heading font-semibold text-foreground">{t.title}</p>
                <p className="text-sm text-muted-foreground">
                  by <span className="text-foreground">{t.author}</span> ·{" "}
                  <span className={categoryColor[t.category] || "text-muted-foreground"}>{t.category}</span>
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {t.replies}</span>
                <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {t.likes}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Community;
