import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock data factories
function makeBM25Index(overrides: Record<string, unknown> = {}) {
  return {
    documents: [
      { id: "doc-1", terms: ["ta.sma", "ta", "sma", "moving", "average", "indicator"] },
      { id: "doc-2", terms: ["pine", "script", "basics", "introduction"] },
      { id: "ref-1", terms: ["ta.sma", "ta", "sma", "simple", "moving", "average", "function"] },
      { id: "ref-2", terms: ["ta.ema", "ta", "ema", "exponential", "moving", "average"] },
      { id: "ref-3", terms: ["math.round", "math", "round", "rounding", "number"] },
      { id: "ref-4", terms: ["strategy", "entry", "exit", "trade"] },
      { id: "ref-5", terms: ["plot", "chart", "display", "series"] },
      { id: "ref-6", terms: ["input", "float", "parameter", "user"] },
      { id: "ex-1", terms: ["ta.sma", "ta", "sma", "crossover", "strategy", "example"] },
      { id: "ex-2", terms: ["pine", "script", "rsi", "indicator", "example"] },
      { id: "ex-3", terms: ["macd", "histogram", "signal", "example"] },
    ],
    idf: {
      "ta.sma": 2.8,
      "ta.ema": 2.7,
      "math.round": 2.5,
      ta: 1.2,
      sma: 2.5,
      moving: 1.0,
      average: 0.8,
      indicator: 1.5,
      pine: 1.3,
      script: 0.9,
      basics: 2.0,
      introduction: 1.8,
      simple: 1.1,
      function: 0.7,
      ema: 2.4,
      exponential: 2.2,
      math: 1.6,
      round: 2.1,
      rounding: 1.9,
      number: 0.6,
      strategy: 1.7,
      entry: 2.0,
      exit: 2.0,
      trade: 1.8,
      plot: 1.5,
      chart: 1.3,
      display: 1.0,
      series: 0.9,
      input: 1.4,
      float: 1.6,
      parameter: 1.2,
      user: 0.5,
      crossover: 2.3,
      example: 0.4,
      rsi: 2.6,
      macd: 2.7,
      histogram: 2.1,
      signal: 1.8,
    },
    avgDl: 5,
    totalDocs: 11,
    ...overrides,
  };
}

function makeDocsChunks() {
  return [
    {
      id: "doc-1",
      type: "documentation",
      source: "reference",
      section: "ta",
      title: "Simple Moving Average",
      content: "The ta.sma function calculates the simple moving average of a series.",
      keywords: ["ta", "sma", "moving", "average"],
    },
    {
      id: "doc-2",
      type: "documentation",
      source: "guide",
      section: "basics",
      title: "PineScript Basics",
      content: "Introduction to PineScript programming language.",
      keywords: ["pine", "script", "basics"],
    },
  ];
}

function makeReferenceFunctions() {
  return [
    {
      id: "ref-1",
      type: "reference",
      namespace: "ta",
      function: "ta.sma",
      signature: "ta.sma(source, length)",
      description: "Simple moving average",
      params: [
        { name: "source", type: "series float", description: "Source series" },
        { name: "length", type: "int", description: "Length" },
      ],
      returns: "series float",
      example: "ta.sma(close, 14)",
      keywords: ["ta", "sma"],
    },
    {
      id: "ref-2",
      type: "reference",
      namespace: "ta",
      function: "ta.ema",
      signature: "ta.ema(source, length)",
      description: "Exponential moving average",
      params: [
        { name: "source", type: "series float", description: "Source series" },
        { name: "length", type: "int", description: "Length" },
      ],
      returns: "series float",
      example: "ta.ema(close, 14)",
      keywords: ["ta", "ema"],
    },
    {
      id: "ref-3",
      type: "reference",
      namespace: "math",
      function: "math.round",
      signature: "math.round(number)",
      description: "Rounds a number",
      params: [{ name: "number", type: "float", description: "Number to round" }],
      returns: "int",
      example: "math.round(3.7)",
      keywords: ["math", "round"],
    },
    {
      id: "ref-4",
      type: "reference",
      namespace: "strategy",
      function: "strategy.entry",
      signature: "strategy.entry(id, direction)",
      description: "Enter a trade",
      params: [],
      returns: "void",
      example: "",
      keywords: ["strategy", "entry"],
    },
    {
      id: "ref-5",
      type: "reference",
      namespace: "",
      function: "plot",
      signature: "plot(series)",
      description: "Plot a series on chart",
      params: [],
      returns: "void",
      example: "plot(close)",
      keywords: ["plot", "chart"],
    },
    {
      id: "ref-6",
      type: "reference",
      namespace: "input",
      function: "input.float",
      signature: "input.float(defval)",
      description: "Float input",
      params: [],
      returns: "float",
      example: "input.float(1.0)",
      keywords: ["input", "float"],
    },
  ];
}

function makeExampleScripts() {
  return [
    {
      id: "ex-1",
      type: "example",
      category: "strategy",
      title: "SMA Crossover Strategy",
      version: "v6",
      code: '//@version=6\nstrategy("SMA Cross")\nsma1 = ta.sma(close, 10)',
      functions_used: ["ta.sma"],
      keywords: ["sma", "crossover"],
    },
    {
      id: "ex-2",
      type: "example",
      category: "indicator",
      title: "RSI Indicator",
      version: "v6",
      code: '//@version=6\nindicator("RSI")\nrsi = ta.rsi(close, 14)',
      functions_used: ["ta.rsi"],
      keywords: ["rsi", "indicator"],
    },
    {
      id: "ex-3",
      type: "example",
      category: "indicator",
      title: "MACD Histogram",
      version: "v6",
      code: '//@version=6\nindicator("MACD")',
      functions_used: ["ta.macd"],
      keywords: ["macd", "histogram"],
    },
  ];
}

// Map filenames to mock data
function getMockFileData(filename: string): string {
  switch (filename) {
    case "docs-chunks.json":
      return JSON.stringify(makeDocsChunks());
    case "reference-functions.json":
      return JSON.stringify(makeReferenceFunctions());
    case "example-scripts.json":
      return JSON.stringify(makeExampleScripts());
    case "bm25-index.json":
      return JSON.stringify(makeBM25Index());
    default:
      throw new Error(`File not found: ${filename}`);
  }
}

// Mock fs module
vi.mock("fs", () => ({
  readFileSync: vi.fn((filePath: string) => {
    const filename = filePath.split("/").pop()!;
    return getMockFileData(filename);
  }),
}));

describe("searchRAG", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  async function getSearchRAG() {
    const mod = await import("@/lib/rag/search");
    return mod.searchRAG;
  }

  it("returns empty array when no data exists (totalDocs === 0)", async () => {
    // Override the mock to return an empty index
    const { readFileSync } = await import("fs");
    vi.mocked(readFileSync).mockImplementation((filePath: unknown) => {
      const filename = (filePath as string).split("/").pop()!;
      if (filename === "bm25-index.json") {
        return JSON.stringify(makeBM25Index({ totalDocs: 0, documents: [] }));
      }
      return getMockFileData(filename);
    });

    const searchRAG = await getSearchRAG();
    const results = searchRAG("ta.sma moving average");
    expect(results).toEqual([]);
  });

  it("returns results limited by maxDocs/maxRefs/maxExamples", async () => {
    // Restore standard mock
    const { readFileSync } = await import("fs");
    vi.mocked(readFileSync).mockImplementation((filePath: unknown) => {
      const filename = (filePath as string).split("/").pop()!;
      return getMockFileData(filename);
    });

    const searchRAG = await getSearchRAG();
    const results = searchRAG("ta sma moving average indicator strategy", {
      maxDocs: 1,
      maxRefs: 2,
      maxExamples: 1,
    });

    const docs = results.filter((r) => r.type === "documentation");
    const refs = results.filter((r) => r.type === "reference");
    const examples = results.filter((r) => r.type === "example");

    expect(docs.length).toBeLessThanOrEqual(1);
    expect(refs.length).toBeLessThanOrEqual(2);
    expect(examples.length).toBeLessThanOrEqual(1);
  });

  it("results are sorted by score (descending)", async () => {
    const { readFileSync } = await import("fs");
    vi.mocked(readFileSync).mockImplementation((filePath: unknown) => {
      const filename = (filePath as string).split("/").pop()!;
      return getMockFileData(filename);
    });

    const searchRAG = await getSearchRAG();
    const results = searchRAG("ta sma moving average", {
      maxDocs: 10,
      maxRefs: 10,
      maxExamples: 10,
    });

    // All results should have scores in descending order
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it("function mentions boost scores (ta.sma query)", async () => {
    // First instance: query WITH function mention "ta.sma"
    const { readFileSync } = await import("fs");
    vi.mocked(readFileSync).mockImplementation((filePath: unknown) => {
      const filename = (filePath as string).split("/").pop()!;
      return getMockFileData(filename);
    });

    const searchRAG = await getSearchRAG();

    // "ta.sma moving average" -- tokenizes to ["ta.sma", "moving", "average"]
    // extractFunctionMentions finds "ta.sma" -> tokenize("ta.sma") = ["ta.sma"]
    // Docs containing "ta.sma" get a 1.5x boost per matching term
    const resultsWithMention = searchRAG("ta.sma moving average", {
      maxDocs: 10,
      maxRefs: 10,
      maxExamples: 10,
    });

    // Reset modules to get a fresh module instance with cleared cached data
    vi.resetModules();

    // Re-establish mock for the new module instance
    const fs2 = await import("fs");
    vi.mocked(fs2.readFileSync).mockImplementation((filePath: unknown) => {
      const filename = (filePath as string).split("/").pop()!;
      return getMockFileData(filename);
    });

    const { searchRAG: searchRAG2 } = await import("@/lib/rag/search");

    // Same base terms but no function mention pattern
    // "moving average calculation" -- tokenizes to ["moving", "average", "calculation"]
    // No function mentions extracted, so no boost applied
    const resultsWithoutMention = searchRAG2("moving average calculation", {
      maxDocs: 10,
      maxRefs: 10,
      maxExamples: 10,
    });

    // Both queries should return results
    expect(resultsWithMention.length).toBeGreaterThan(0);
    expect(resultsWithoutMention.length).toBeGreaterThan(0);

    // Find ref-1 (ta.sma reference) in both result sets
    const smaRefBoosted = resultsWithMention.find((r) => r.id === "ref-1");
    const smaRefUnboosted = resultsWithoutMention.find((r) => r.id === "ref-1");

    // Both should exist since both queries match "moving" and "average" terms
    expect(smaRefBoosted).toBeDefined();
    expect(smaRefUnboosted).toBeDefined();

    // The boosted version should have a higher score due to function mention boost
    expect(smaRefBoosted!.score).toBeGreaterThan(smaRefUnboosted!.score);
  });

  it("respects default limits (3 docs, 5 refs, 2 examples)", async () => {
    const { readFileSync } = await import("fs");
    vi.mocked(readFileSync).mockImplementation((filePath: unknown) => {
      const filename = (filePath as string).split("/").pop()!;
      return getMockFileData(filename);
    });

    const searchRAG = await getSearchRAG();

    // Use a broad query that should match many documents
    const results = searchRAG("ta sma ema pine script indicator strategy plot input math");

    const docs = results.filter((r) => r.type === "documentation");
    const refs = results.filter((r) => r.type === "reference");
    const examples = results.filter((r) => r.type === "example");

    // Default limits: maxDocs=3, maxRefs=5, maxExamples=2
    expect(docs.length).toBeLessThanOrEqual(3);
    expect(refs.length).toBeLessThanOrEqual(5);
    expect(examples.length).toBeLessThanOrEqual(2);
  });
});
