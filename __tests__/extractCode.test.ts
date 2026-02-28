import { describe, it, expect } from "vitest";

/**
 * Tests for the code extraction regex used in the chat route and AI reviewer.
 * The regex: /```(?:pinescript|pine)\s*\n([\s\S]*?)```/
 * Since this is a private function in those modules, we test the regex directly.
 */
function extractCodeFromContent(content: string): string | null {
  const match = content.match(/```(?:pinescript|pine)\s*\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

describe("extractCodeFromContent", () => {
  it("extracts code from ```pinescript block", () => {
    const content = `Here is a script:
\`\`\`pinescript
//@version=6
indicator("My Indicator")
plot(close)
\`\`\`
That's the code.`;

    const result = extractCodeFromContent(content);
    expect(result).toBe('//@version=6\nindicator("My Indicator")\nplot(close)');
  });

  it("extracts code from ```pine block", () => {
    const content = `\`\`\`pine
//@version=6
strategy("SMA Cross")
\`\`\``;

    const result = extractCodeFromContent(content);
    expect(result).toBe('//@version=6\nstrategy("SMA Cross")');
  });

  it("returns null for no code block", () => {
    const content = "Just some text about PineScript without any code blocks.";
    const result = extractCodeFromContent(content);
    expect(result).toBeNull();
  });

  it("returns null for other language blocks (```javascript)", () => {
    const content = `\`\`\`javascript
console.log("hello");
\`\`\``;

    const result = extractCodeFromContent(content);
    expect(result).toBeNull();
  });

  it("handles multiple code blocks (returns first)", () => {
    const content = `First block:
\`\`\`pinescript
//@version=6
indicator("First")
\`\`\`

Second block:
\`\`\`pinescript
//@version=6
indicator("Second")
\`\`\``;

    const result = extractCodeFromContent(content);
    expect(result).toBe('//@version=6\nindicator("First")');
  });

  it("trims whitespace from extracted code", () => {
    const content = `\`\`\`pinescript

  //@version=6
  indicator("Trimmed")

\`\`\``;

    const result = extractCodeFromContent(content);
    expect(result).toBe('//@version=6\n  indicator("Trimmed")');
  });

  it("handles code with backticks inside", () => {
    const content = `\`\`\`pinescript
//@version=6
indicator("Test")
// Use \`close\` as the source
sma = ta.sma(close, 14)
\`\`\``;

    const result = extractCodeFromContent(content);
    expect(result).toBe(
      '//@version=6\nindicator("Test")\n// Use `close` as the source\nsma = ta.sma(close, 14)',
    );
  });
});
