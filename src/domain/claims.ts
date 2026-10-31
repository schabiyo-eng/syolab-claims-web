export function newestFirst<T extends { createdAt: string }>(
  claims: readonly T[],
): T[] {
  return [...claims].sort((left, right) => {
    if (left.createdAt === right.createdAt) {
      return 0;
    }
    return left.createdAt < right.createdAt ? 1 : -1;
  });
}

export function shortId(id: string): string {
  return id.split("-")[0] ?? id;
}
