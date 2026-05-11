import CodeMirror, { EditorView } from "@uiw/react-codemirror"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { useCallback } from "react"

const darkTheme = EditorView.theme(
  {
    "&": {
      background: "var(--bg-app)",
      color: "var(--fg1)",
      height: "100%",
      fontSize: "14px",
      fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
    },
    ".cm-editor": { height: "100%", outline: "none" },
    ".cm-scroller": { overflow: "auto", lineHeight: "1.65", padding: "0" },
    ".cm-content": {
      padding: "24px 32px",
      maxWidth: "none",
      caretColor: "var(--accent)",
    },
    ".cm-cursor": { borderLeftColor: "var(--accent)", borderLeftWidth: "2px" },
    ".cm-line": { padding: "0" },
    ".cm-activeLine": { background: "rgba(255,255,255,0.02)" },
    ".cm-selectionBackground": { background: "var(--accent-soft) !important" },
    "&.cm-focused .cm-selectionBackground": { background: "var(--accent-soft) !important" },
    ".cm-gutters": { display: "none" },

    // Heading decorations
    ".cm-line .ͼm": { color: "var(--fg1)", fontWeight: "600", fontSize: "1.5em" }, // h1
    ".cm-line .ͼn": { color: "var(--fg1)", fontWeight: "600", fontSize: "1.25em" }, // h2
    ".cm-line .ͼo": { color: "var(--fg1)", fontWeight: "600", fontSize: "1.1em" }, // h3

    // Inline code
    ".ͼs": {
      background: "var(--bg-elev2)",
      padding: "1px 4px",
      borderRadius: "3px",
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      fontSize: "0.88em",
      color: "var(--indigo-300)",
    },
    // Code block
    ".ͼt": {
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      fontSize: "0.88em",
      color: "var(--indigo-300)",
    },
    // Strong/bold
    ".ͼq": { fontWeight: "600", color: "var(--fg1)" },
    // Emphasis/italic
    ".ͼr": { fontStyle: "italic", color: "var(--fg2)" },
    // Link
    ".ͼp": { color: "var(--accent-hover)", textDecoration: "underline" },
    // Block quote
    ".ͼu": { color: "var(--fg3)", borderLeft: "3px solid var(--border-strong)", paddingLeft: "12px" },
    // Markdown punctuation (dim the symbols)
    ".ͼk": { color: "var(--fg3)", opacity: "0.55" },
  },
  { dark: true }
)

const extensions = [
  markdown({ base: markdownLanguage }),
  EditorView.lineWrapping,
]

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  readOnly?: boolean
}

export function MarkdownEditorPane({
  value,
  onChange,
  placeholder = "Write your note in markdown…",
  readOnly = false,
}: Props) {
  const handleChange = useCallback((val: string) => {
    onChange(val)
  }, [onChange])

  return (
    <div style={{ height: "100%", overflow: "hidden" }}>
      <CodeMirror
        value={value}
        onChange={handleChange}
        extensions={extensions}
        theme={darkTheme}
        readOnly={readOnly}
        placeholder={placeholder}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: true,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: true,
          closeBrackets: false,
          autocompletion: false,
          highlightSelectionMatches: false,
        }}
        style={{ height: "100%" }}
      />
    </div>
  )
}
