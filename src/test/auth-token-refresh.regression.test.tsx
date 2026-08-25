import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";

const adminUser = {
  id: "admin-1",
  email: "admin@fgn.gg",
  email_confirmed_at: "2026-01-01T00:00:00Z",
};

const adminSession = { user: adminUser, access_token: "tok-1" };

const harness = vi.hoisted(() => {
  const state: {
    authCallback: ((event: string, session: unknown) => void) | null;
    userRolesCalls: number;
    pendingRoles: { resolve: (value: unknown) => void } | null;
  } = {
    authCallback: null,
    userRolesCalls: 0,
    pendingRoles: null,
  };
  return state;
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        harness.authCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      getSession: vi.fn(() => Promise.resolve({ data: { session: adminSession } })),
      signOut: vi.fn(),
    },
    from: (table: string) => {
      if (table === "user_roles") {
        harness.userRolesCalls += 1;
        return {
          select: () => ({
            eq: () =>
              new Promise((resolve) => {
                harness.pendingRoles = { resolve };
              }),
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { discord_id: "d1", discord_bypass_approved: false },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === "tenant_admins") {
        return {
          select: () => ({
            eq: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
    functions: { invoke: vi.fn() },
  },
}));

import { AuthProvider, useAuth } from "@/contexts/AuthContext";

function AuthProbe() {
  const { roleLoading, isAdmin } = useAuth();
  return (
    <div>
      <span data-testid="role-loading">{String(roleLoading)}</span>
      <span data-testid="is-admin">{String(isAdmin)}</span>
    </div>
  );
}

async function resolveRoles() {
  await act(async () => {
    harness.pendingRoles?.resolve({ data: [{ role: "admin" }], error: null });
    harness.pendingRoles = null;
  });
}

describe("AuthContext TOKEN_REFRESHED / in-flight guard", () => {
  beforeEach(() => {
    harness.authCallback = null;
    harness.userRolesCalls = 0;
    harness.pendingRoles = null;
  });

  it("persists the in-flight guard so overlapping auth events do not refetch roles", async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => expect(harness.userRolesCalls).toBe(1));

    await act(async () => {
      harness.authCallback?.("SIGNED_IN", adminSession);
    });

    expect(harness.userRolesCalls).toBe(1);

    await resolveRoles();

    await waitFor(() => {
      expect(screen.getByTestId("role-loading").textContent).toBe("false");
      expect(screen.getByTestId("is-admin").textContent).toBe("true");
    });
  });

  it("does not refetch roles or set roleLoading true on TOKEN_REFRESHED", async () => {
    const roleLoadingLog: string[] = [];

    function Logger() {
      const { roleLoading } = useAuth();
      roleLoadingLog.push(String(roleLoading));
      return <AuthProbe />;
    }

    render(
      <AuthProvider>
        <Logger />
      </AuthProvider>
    );

    await waitFor(() => expect(harness.userRolesCalls).toBe(1));
    await resolveRoles();
    await waitFor(() => expect(screen.getByTestId("role-loading").textContent).toBe("false"));

    const callsAfterLoad = harness.userRolesCalls;
    const logLengthAfterLoad = roleLoadingLog.length;

    await act(async () => {
      harness.authCallback?.("TOKEN_REFRESHED", { ...adminSession, access_token: "tok-2" });
    });

    expect(harness.userRolesCalls).toBe(callsAfterLoad);
    expect(screen.getByTestId("role-loading").textContent).toBe("false");
    expect(roleLoadingLog.slice(logLengthAfterLoad).every((v) => v === "false")).toBe(true);
  });
});
