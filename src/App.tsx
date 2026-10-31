import { useEffect, useState, type ReactNode } from "react";
import {
  ApiError,
  currentUser,
  hasSession,
  logout,
  onUnauthorized,
} from "./api/client";
import type { CurrentUser } from "./api/types";
import { ClaimsDesk } from "./components/ClaimsDesk";
import { SignIn } from "./components/SignIn";
import { roleLabel } from "./domain/roles";

type AuthState =
  | { kind: "restoring" }
  | { kind: "signedOut"; notice: string | null }
  | { kind: "signedIn"; user: CurrentUser };

const SESSION_ENDED = "Your session has ended. Sign in again.";
const RESTORE_FAILED = "Could not restore your session. Sign in again.";

function initialAuth(): AuthState {
  return hasSession() ? { kind: "restoring" } : { kind: "signedOut", notice: null };
}

function Banner({ children }: { children?: ReactNode }) {
  return (
    <header className="banner">
      <div>
        <p className="eyebrow">Syolab desk</p>
        <h1>Claims intake</h1>
        <p className="lede">
          Fictional claims desk. Submit a claim and read the validation status.
        </p>
      </div>
      {children}
    </header>
  );
}

export function App() {
  const [auth, setAuth] = useState<AuthState>(initialAuth);

  useEffect(
    () =>
      onUnauthorized(() => {
        setAuth({ kind: "signedOut", notice: SESSION_ENDED });
      }),
    [],
  );

  useEffect(() => {
    if (!hasSession()) {
      return;
    }
    let cancelled = false;
    void currentUser()
      .then((user) => {
        if (!cancelled) {
          setAuth({ kind: "signedIn", user });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const expired = error instanceof ApiError && error.statusCode === 401;
          setAuth({
            kind: "signedOut",
            notice: expired ? SESSION_ENDED : RESTORE_FAILED,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function signOut() {
    logout();
    setAuth({ kind: "signedOut", notice: null });
  }

  switch (auth.kind) {
    case "restoring":
      return (
        <>
          <Banner />
          <main className="sign-in">
            <p className="state" role="status">
              Restoring your session…
            </p>
          </main>
        </>
      );
    case "signedOut":
      return (
        <>
          <Banner />
          <SignIn
            notice={auth.notice}
            onSignedIn={(user) => setAuth({ kind: "signedIn", user })}
          />
        </>
      );
    case "signedIn":
      return (
        <>
          <a className="skip" href="#claim-form">
            Skip to claim form
          </a>
          <Banner>
            <div className="session">
              <p className="session-user">
                <span className="session-name">{auth.user.displayName}</span>
                <span className="session-role">{roleLabel(auth.user.role)}</span>
              </p>
              <button type="button" className="logout" onClick={signOut}>
                Log out
              </button>
            </div>
          </Banner>
          <ClaimsDesk />
        </>
      );
  }
}
