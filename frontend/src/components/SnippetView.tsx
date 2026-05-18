import { useEffect, useState } from 'react';
import type { CodeReviewLanguage } from '../lib/questions/types';

const BLANK_TOKEN = '___BLANK___';

const LANG_LABEL: Record<CodeReviewLanguage, string> = {
  python: 'Python',
  yaml: 'YAML',
  bash: 'Bash',
};

interface ShikiInstance {
  codeToHtml: (
    code: string,
    options: { lang: CodeReviewLanguage; theme: string },
  ) => string;
}

let cachedHighlighter: Promise<ShikiInstance> | null = null;

function getHighlighter(): Promise<ShikiInstance> {
  if (!cachedHighlighter) {
    cachedHighlighter = (async () => {
      const [{ createHighlighterCore }, { createJavaScriptRegexEngine }, python, yaml, bash, ghDark, ghLight] =
        await Promise.all([
          import('shiki/core'),
          import('shiki/engine/javascript'),
          import('shiki/langs/python.mjs'),
          import('shiki/langs/yaml.mjs'),
          import('shiki/langs/bash.mjs'),
          import('shiki/themes/github-dark.mjs'),
          import('shiki/themes/github-light.mjs'),
        ]);
      return createHighlighterCore({
        engine: createJavaScriptRegexEngine(),
        themes: [ghDark.default, ghLight.default],
        langs: [python.default, yaml.default, bash.default],
      });
    })();
  }
  return cachedHighlighter;
}

interface Props {
  snippet: string;
  language: CodeReviewLanguage;
  /** App theme. Light → github-light. Anything else → github-dark. */
  themeMode: 'dark' | 'light' | 'solar' | 'forest';
  revealedValue?: string;
}

export default function SnippetView({ snippet, language, themeMode, revealedValue }: Props) {
  const [parts, setParts] = useState<{ before: string; after: string | null } | null>(null);
  const theme = themeMode === 'light' ? 'github-light' : 'github-dark';

  const sourceParts = splitSnippet(snippet, revealedValue);

  useEffect(() => {
    let cancelled = false;
    getHighlighter().then((hl) => {
      if (cancelled) return;
      const before = hl.codeToHtml(sourceParts.before || ' ', { lang: language, theme });
      const after =
        sourceParts.after !== null
          ? hl.codeToHtml(sourceParts.after || ' ', { lang: language, theme })
          : null;
      setParts({ before, after });
    });
    return () => {
      cancelled = true;
    };
  }, [snippet, language, theme, revealedValue, sourceParts.before, sourceParts.after]);

  if (!parts) {
    return (
      <div className="rounded-lg bg-bg-elevated p-4 ring-1 ring-divider">
        <div className="mb-2 flex items-center justify-between text-xs text-fg-muted">
          <span>{LANG_LABEL[language]}</span>
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs">{snippet}</pre>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-bg-elevated p-4 ring-1 ring-divider">
      <div className="mb-2 flex items-center justify-between text-xs text-fg-muted">
        <span>{LANG_LABEL[language]}</span>
      </div>
      <div className="snippet-shiki overflow-x-auto text-xs">
        <span dangerouslySetInnerHTML={{ __html: parts.before }} />
        {parts.after !== null && (
          <span
            className="mx-1 inline-flex items-center rounded-md border border-dashed border-accent/60 bg-accent/10 px-2 py-0.5 align-middle font-mono text-[0.7rem] font-semibold text-accent"
            aria-label="fill in the blank"
          >
            ___BLANK___
          </span>
        )}
        {parts.after !== null && <span dangerouslySetInnerHTML={{ __html: parts.after }} />}
      </div>
    </div>
  );
}

function splitSnippet(snippet: string, revealedValue: string | undefined) {
  const blankIdx = snippet.indexOf(BLANK_TOKEN);
  if (blankIdx === -1) return { before: snippet, after: null as string | null };
  if (revealedValue !== undefined) {
    return {
      before: snippet.replace(BLANK_TOKEN, revealedValue),
      after: null as string | null,
    };
  }
  return {
    before: snippet.slice(0, blankIdx),
    after: snippet.slice(blankIdx + BLANK_TOKEN.length),
  };
}
