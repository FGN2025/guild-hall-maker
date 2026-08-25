import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminRoute from "@/components/admin/AdminRoute";

const mockAuth = {
  user: {
    id: "admin-1",
    email: "admin@fgn.gg",
    email_confirmed_at: "2026-01-01T00:00:00Z",
  } as { id: string; email: string; email_confirmed_at: string } | null,
  loading: true,
  isAdmin: false,
  roleLoading: true,
  emailConfirmed: true,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuth,
}));

vi.mock("@/hooks/useTenantAdmin", () => ({
  useTenantAdmin: () => ({ isTenantAdmin: false, isLoading: false }),
}));

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

vi.mock("@/components/admin/AdminLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

function Harness() {
  const [, setTick] = useState(0);
  return (
    <MemoryRouter>
      <button type="button" data-testid="tick" onClick={() => setTick((n) => n + 1)}>
        tick
      </button>
      <AdminRoute>
        <div data-testid="challenge-manager">Challenge Manager</div>
      </AdminRoute>
    </MemoryRouter>
  );
}

describe("AdminRoute settle", () => {
  it("shows a spinner before auth settles, then keeps children mounted if roleLoading flickers", () => {
    mockAuth.loading = true;
    mockAuth.isAdmin = false;
    mockAuth.roleLoading = true;
    mockAuth.emailConfirmed = true;

    render(<Harness />);

    expect(screen.queryByTestId("challenge-manager")).toBeNull();
    expect(document.querySelector(".animate-spin")).not.toBeNull();

    mockAuth.loading = false;
    mockAuth.roleLoading = false;
    mockAuth.isAdmin = true;
    fireEvent.click(screen.getByTestId("tick"));

    expect(screen.getByTestId("challenge-manager")).toBeInTheDocument();
    expect(screen.getByTestId("admin-layout")).toBeInTheDocument();

    mockAuth.roleLoading = true;
    fireEvent.click(screen.getByTestId("tick"));

    expect(screen.getByTestId("challenge-manager")).toBeInTheDocument();
    expect(document.querySelector(".animate-spin")).toBeNull();
  });
});
