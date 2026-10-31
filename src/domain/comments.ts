export const MAX_COMMENT_LENGTH = 2000;

export function commentError(text: string): string | null {
  if (text.trim() === "") {
    return "Enter a comment.";
  }
  if (text.trim().length > MAX_COMMENT_LENGTH) {
    return `Keep the comment to ${MAX_COMMENT_LENGTH} characters or fewer.`;
  }
  return null;
}
