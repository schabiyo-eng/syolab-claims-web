import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RoleHome } from "./RoleHome";

function headings(html: string): string[] {
  return [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/g)].map((match) => match[1] ?? "");
}

describe("RoleHome", () => {
  it("shows a claimant their claims and the new-claim form", () => {
    const html = renderToStaticMarkup(<RoleHome role="CLAIMANT" />);
    expect(headings(html)).toEqual(["New claim", "My claims"]);
    expect(html).not.toContain("Claims queue");
  });

  it("shows an adjuster the claims queue without the new-claim form", () => {
    const html = renderToStaticMarkup(<RoleHome role="ADJUSTER" />);
    expect(headings(html)).toEqual(["Claims queue"]);
    expect(html).not.toContain("New claim");
    expect(html).not.toContain("Submit claim");
    expect(html).toContain('role="group" aria-label="Status"');
    expect(html).toContain("Search claimant or policy");
  });
});
