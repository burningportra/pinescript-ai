import { describe, it, expect } from "vitest";
import { scoreBM25 } from "@/lib/rag/bm25";

describe("scoreBM25", () => {
  const defaultIdf: Record<string, number> = {
    pine: 1.5,
    script: 1.0,
    indicator: 2.0,
    strategy: 2.5,
    plot: 1.8,
    sma: 3.0,
    ema: 2.8,
  };
  const defaultAvgDl = 10;

  it("returns 0 for empty doc terms", () => {
    const score = scoreBM25(["pine", "script"], [], defaultIdf, defaultAvgDl);
    expect(score).toBe(0);
  });

  it("returns 0 when no query terms match", () => {
    const score = scoreBM25(
      ["nonexistent", "missing"],
      ["pine", "script", "indicator"],
      defaultIdf,
      defaultAvgDl,
    );
    expect(score).toBe(0);
  });

  it("returns positive score for matching terms", () => {
    const score = scoreBM25(
      ["pine", "script"],
      ["pine", "script", "indicator"],
      defaultIdf,
      defaultAvgDl,
    );
    expect(score).toBeGreaterThan(0);
  });

  it("higher IDF terms contribute more to score", () => {
    // "sma" has IDF 3.0, "script" has IDF 1.0
    const scoreLowIdf = scoreBM25(
      ["script"],
      ["script", "pine", "indicator"],
      defaultIdf,
      defaultAvgDl,
    );
    const scoreHighIdf = scoreBM25(
      ["sma"],
      ["sma", "pine", "indicator"],
      defaultIdf,
      defaultAvgDl,
    );
    expect(scoreHighIdf).toBeGreaterThan(scoreLowIdf);
  });

  it("higher term frequency increases score", () => {
    const scoreLowTf = scoreBM25(
      ["pine"],
      ["pine", "script", "indicator", "plot", "sma"],
      defaultIdf,
      5,
    );
    const scoreHighTf = scoreBM25(
      ["pine"],
      ["pine", "pine", "pine", "plot", "sma"],
      defaultIdf,
      5,
    );
    expect(scoreHighTf).toBeGreaterThan(scoreLowTf);
  });

  it("documents shorter than avg get boosted (b parameter effect)", () => {
    // Short doc (3 terms) vs long doc (20 terms), avgDl = 10
    // With b > 0, shorter docs get a length normalization boost
    const shortDocTerms = ["pine", "script", "indicator"];
    const longDocTerms = [
      "pine", "script", "indicator", "strategy", "plot",
      "sma", "ema", "the", "for", "and",
      "with", "this", "that", "from", "some",
      "more", "data", "value", "type", "func",
    ];

    const scoreShort = scoreBM25(["pine"], shortDocTerms, defaultIdf, 10);
    const scoreLong = scoreBM25(["pine"], longDocTerms, defaultIdf, 10);

    // Both docs have tf=1 for "pine", but shorter doc should score higher
    // due to length normalization
    expect(scoreShort).toBeGreaterThan(scoreLong);
  });

  it("custom k1 and b parameters work", () => {
    const docTerms = ["pine", "script", "indicator"];
    const queryTerms = ["pine"];

    const scoreDefault = scoreBM25(queryTerms, docTerms, defaultIdf, defaultAvgDl);
    const scoreCustom = scoreBM25(queryTerms, docTerms, defaultIdf, defaultAvgDl, 2.0, 0.5);

    // Different k1 and b should produce a different score
    expect(scoreCustom).not.toBe(scoreDefault);

    // With b=0, there should be no length normalization
    const scoreNoLength = scoreBM25(queryTerms, docTerms, defaultIdf, defaultAvgDl, 1.5, 0);
    const scoreFullLength = scoreBM25(queryTerms, docTerms, defaultIdf, defaultAvgDl, 1.5, 1.0);
    expect(scoreNoLength).not.toBe(scoreFullLength);
  });

  it("multiple matching terms accumulate score", () => {
    const docTerms = ["pine", "script", "indicator", "sma", "ema"];

    const scoreSingle = scoreBM25(["pine"], docTerms, defaultIdf, defaultAvgDl);
    const scoreDouble = scoreBM25(["pine", "script"], docTerms, defaultIdf, defaultAvgDl);
    const scoreTriple = scoreBM25(
      ["pine", "script", "indicator"],
      docTerms,
      defaultIdf,
      defaultAvgDl,
    );

    expect(scoreDouble).toBeGreaterThan(scoreSingle);
    expect(scoreTriple).toBeGreaterThan(scoreDouble);
  });
});
