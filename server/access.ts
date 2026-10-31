export type Scope =
  { kind: "all" } | { kind: "policies"; policyNumbers: ReadonlySet<string> };

export function canSee(scope: Scope, policyNumber: string): boolean {
  switch (scope.kind) {
    case "all":
      return true;
    case "policies":
      return scope.policyNumbers.has(policyNumber);
  }
}
