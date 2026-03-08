import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ChallengeCard from "@/components/challenges/ChallengeCard";
import TournamentCard from "@/components/tournaments/TournamentCard";

// Mock useAuth
const mockAuth = {
  session: null,
  user: null,
  loading: false,
  isAdmin: false,
  isModerator: false,
  isMarketing: false,
  roleLoading: false,
  discordLinked: false,
  signOut: vi.fn(),
  refreshDiscordStatus: vi.fn(),
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuth,
}));

const baseChallengeProps = {
  challenge: {
    id: "c1",
    name: "Test Challenge",
    description: "A test",
    difficulty: "beginner",
    points_first: 100,
    estimated_minutes: 30,
    cover_image_url: null,
    games: { name: "Valorant", category: "FPS", cover_image_url: null },
  },
  enrollmentCount: 42,
};

const baseTournament = {
  id: "t1",
  name: "Test Tournament",
  game: "Valorant",
  description: "A test tournament",
  format: "single_elimination",
  status: "open",
  start_date: new Date().toISOString(),
  max_participants: 64,
  registrations_count: 32,
  is_registered: false,
  prize_pool: "$500",
  entry_fee: null,
  rules: null,
  created_by: "other-user",
  image_url: null,
  game_cover_url: null,
  prize_type: "cash",
} as any;

const tournamentHandlers = {
  onRegister: vi.fn(),
  onUnregister: vi.fn(),
  isRegistering: false,
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe("Data Shielding — enrollment/registration counts", () => {
  beforeEach(() => {
    mockAuth.isAdmin = false;
    mockAuth.isModerator = false;
    mockAuth.user = null;
  });

  // ── ChallengeCard ──

  describe("ChallengeCard", () => {
    it("shows enrollment count when user is platform admin", () => {
      mockAuth.isAdmin = true;
      render(<ChallengeCard {...baseChallengeProps} />, { wrapper });
      expect(screen.getByText("42 enrolled")).toBeInTheDocument();
    });

    it("hides enrollment count for moderator (non-admin)", () => {
      mockAuth.isModerator = true;
      mockAuth.isAdmin = false;
      render(<ChallengeCard {...baseChallengeProps} />, { wrapper });
      expect(screen.queryByText("42 enrolled")).not.toBeInTheDocument();
    });

    it("hides enrollment count for regular user", () => {
      render(<ChallengeCard {...baseChallengeProps} />, { wrapper });
      expect(screen.queryByText("42 enrolled")).not.toBeInTheDocument();
    });
  });

  // ── TournamentCard ──

  describe("TournamentCard", () => {
    it("shows registration ratio (X/Y) when user is platform admin", () => {
      mockAuth.isAdmin = true;
      render(
        <TournamentCard tournament={baseTournament} {...tournamentHandlers} />,
        { wrapper }
      );
      expect(screen.getByText("32/64")).toBeInTheDocument();
    });

    it("shows only max participants for moderator (non-admin)", () => {
      mockAuth.isModerator = true;
      mockAuth.isAdmin = false;
      render(
        <TournamentCard tournament={baseTournament} {...tournamentHandlers} />,
        { wrapper }
      );
      expect(screen.queryByText("32/64")).not.toBeInTheDocument();
      expect(screen.getByText("64 max")).toBeInTheDocument();
    });

    it("shows only max participants for regular user", () => {
      render(
        <TournamentCard tournament={baseTournament} {...tournamentHandlers} />,
        { wrapper }
      );
      expect(screen.queryByText("32/64")).not.toBeInTheDocument();
      expect(screen.getByText("64 max")).toBeInTheDocument();
    });
  });
});
