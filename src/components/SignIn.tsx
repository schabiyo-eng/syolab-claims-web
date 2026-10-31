import { useEffect, useRef, useState, type FormEvent } from "react";
import { login } from "../api/client";
import type { CurrentUser } from "../api/types";

interface SignInProps {
  notice: string | null;
  onSignedIn: (user: CurrentUser) => void;
}

function messageOf(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }
  return "Something went wrong.";
}

export function SignIn({ notice, onSignedIn }: SignInProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = username.trim();
    if (name === "" || password === "") {
      setError("Enter your username and password.");
      (name === ""
        ? usernameRef.current
        : document.getElementById("password")
      )?.focus();
      return;
    }

    setError(null);
    setSubmitting(true);
    let user: CurrentUser;
    try {
      user = await login(name, password);
    } catch (caught: unknown) {
      setError(messageOf(caught));
      setSubmitting(false);
      return;
    }
    onSignedIn(user);
  }

  return (
    <main className="sign-in">
      <section className="panel" aria-labelledby="sign-in-heading">
        <h2 id="sign-in-heading">Sign in</h2>
        {notice ? <p className="notice">{notice}</p> : null}
        <form
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
          noValidate
        >
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              ref={usernameRef}
              id="username"
              name="username"
              autoComplete="username"
              value={username}
              disabled={submitting}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              disabled={submitting}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {error ? (
            <p className="alert sign-in-error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
