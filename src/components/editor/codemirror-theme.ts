import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";

// Dark theme colors
const darkBg = "#0c0c0e";
const darkSurface = "#18181b";
const darkBorder = "#27272a";
const darkText = "#fafafa";
const darkTextDim = "#71717a";

// Light theme colors
const lightBg = "#f8f8fa";
const lightSurface = "#f4f4f5";
const lightBorder = "#e4e4e7";
const lightText = "#18181b";
const lightTextDim = "#71717a";

export const pineTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: darkBg,
      color: darkText,
      fontSize: "13px",
      fontFamily: "var(--font-jetbrains-mono), monospace",
    },
    ".cm-content": {
      padding: "12px 0",
      caretColor: darkText,
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: darkText,
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "rgba(161, 161, 170, 0.15) !important",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(255, 255, 255, 0.03)",
    },
    ".cm-gutters": {
      backgroundColor: darkBg,
      color: darkTextDim,
      border: "none",
      borderRight: `1px solid ${darkBorder}`,
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(255, 255, 255, 0.05)",
      color: darkText,
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 8px 0 12px",
      minWidth: "40px",
      fontSize: "12px",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: darkSurface,
      border: `1px solid ${darkBorder}`,
      color: darkTextDim,
    },
    ".cm-tooltip": {
      backgroundColor: darkSurface,
      border: `1px solid ${darkBorder}`,
      color: darkText,
    },
    ".cm-panels": {
      backgroundColor: darkSurface,
      color: darkText,
    },
  },
  { dark: true }
);

export const pineHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.keyword, color: "#e4e4e7", fontWeight: "bold" },
    { tag: tags.operator, color: "#a1a1aa" },
    { tag: tags.variableName, color: darkText },
    { tag: tags.function(tags.definition(tags.variableName)), color: "#d4d4d8" },
    { tag: tags.typeName, color: "#a1a1aa", fontStyle: "italic" },
    { tag: tags.number, color: "#d4d4d8" },
    { tag: tags.string, color: "#a1a1aa" },
    { tag: tags.lineComment, color: "#52525b", fontStyle: "italic" },
    { tag: tags.meta, color: "#a1a1aa" },
    { tag: tags.namespace, color: "#d4d4d8" },
    { tag: tags.punctuation, color: darkTextDim },
    { tag: tags.bool, color: "#d4d4d8" },
  ])
);

export const pineLightTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: lightBg,
      color: lightText,
      fontSize: "13px",
      fontFamily: "var(--font-jetbrains-mono), monospace",
    },
    ".cm-content": {
      padding: "12px 0",
      caretColor: lightText,
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: lightText,
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "rgba(24, 24, 27, 0.1) !important",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(0, 0, 0, 0.03)",
    },
    ".cm-gutters": {
      backgroundColor: lightBg,
      color: lightTextDim,
      border: "none",
      borderRight: `1px solid ${lightBorder}`,
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(0, 0, 0, 0.05)",
      color: lightText,
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 8px 0 12px",
      minWidth: "40px",
      fontSize: "12px",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: lightSurface,
      border: `1px solid ${lightBorder}`,
      color: lightTextDim,
    },
    ".cm-tooltip": {
      backgroundColor: lightSurface,
      border: `1px solid ${lightBorder}`,
      color: lightText,
    },
    ".cm-panels": {
      backgroundColor: lightSurface,
      color: lightText,
    },
  },
  { dark: false }
);

export const pineLightHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.keyword, color: "#18181b", fontWeight: "bold" },
    { tag: tags.operator, color: "#52525b" },
    { tag: tags.variableName, color: lightText },
    { tag: tags.function(tags.definition(tags.variableName)), color: "#3f3f46" },
    { tag: tags.typeName, color: "#52525b", fontStyle: "italic" },
    { tag: tags.number, color: "#3f3f46" },
    { tag: tags.string, color: "#52525b" },
    { tag: tags.lineComment, color: "#a1a1aa", fontStyle: "italic" },
    { tag: tags.meta, color: "#52525b" },
    { tag: tags.namespace, color: "#3f3f46" },
    { tag: tags.punctuation, color: lightTextDim },
    { tag: tags.bool, color: "#3f3f46" },
  ])
);
