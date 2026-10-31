export type LoadState<T> =
  { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; data: T };

export function messageOf(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }
  return "Something went wrong.";
}
