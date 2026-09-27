import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { LogoMark } from "@/components/LogoMark";

/** Minimal markdown renderer for the privacy/terms pages: headings, bold, lists, and pipe tables. No external dep needed for this small a feature set. */
function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-semibold text-ink-900">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function isTableRow(line: string) {
  return line.trim().startsWith("|");
}

export function MarkdownLite({ source }: { source: string }) {
  const lines = source.split("\n");
  const blocks: ReactElement[] = [];
  let i = 0;
  let listBuf: string[] = [];

  function flushList() {
    if (listBuf.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-700/90">
        {listBuf.map((item, idx) => (
          <li key={idx}>{renderInline(item)}</li>
        ))}
      </ul>,
    );
    listBuf = [];
  }

  while (i < lines.length) {
    const line = lines[i];

    if (isTableRow(line)) {
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        if (!/^\|?\s*-+\s*\|/.test(lines[i])) {
          rows.push(
            lines[i]
              .trim()
              .replace(/^\||\|$/g, "")
              .split("|")
              .map((c) => c.trim()),
          );
        }
        i++;
      }
      const [header, ...body] = rows;
      blocks.push(
        <div key={`t-${blocks.length}`} className="mt-3 overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-ink-900">
              <tr>
                {header.map((h, idx) => (
                  <th key={idx} className="px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {body.map((r, ridx) => (
                <tr key={ridx}>
                  {r.map((c, cidx) => (
                    <td key={cidx} className="px-3 py-2 align-top text-ink-700/90">
                      {renderInline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (line.startsWith("## ")) {
      flushList();
      blocks.push(
        <h2 key={i} className="mt-8 font-display text-xl font-semibold text-ink-900">
          {line.slice(3)}
        </h2>,
      );
    } else if (line.startsWith("# ")) {
      flushList();
      blocks.push(
        <h1 key={i} className="font-display text-2xl font-semibold text-ink-900">
          {line.slice(2)}
        </h1>,
      );
    } else if (line.trim().startsWith("- ")) {
      listBuf.push(line.trim().slice(2));
    } else if (line.trim() === "" || line.trim() === "---") {
      flushList();
    } else if (listBuf.length > 0 && (line.startsWith("  ") || line.startsWith("\t"))) {
      // Wrapped continuation of the previous list item, not a new paragraph.
      listBuf[listBuf.length - 1] += " " + line.trim();
    } else {
      flushList();
      const paraLines = [line.trim()];
      while (
        i + 1 < lines.length &&
        lines[i + 1].trim() !== "" &&
        lines[i + 1].trim() !== "---" &&
        !isTableRow(lines[i + 1]) &&
        !lines[i + 1].startsWith("## ") &&
        !lines[i + 1].startsWith("# ") &&
        !lines[i + 1].trim().startsWith("- ")
      ) {
        i++;
        paraLines.push(lines[i].trim());
      }
      blocks.push(
        <p key={i} className="mt-2 text-sm leading-relaxed text-ink-700/90">
          {renderInline(paraLines.join(" "))}
        </p>,
      );
    }
    i++;
  }
  flushList();

  return <>{blocks}</>;
}

export function LegalPage({ title, source }: { title: string; source: string }) {
  return (
    <div className="min-h-dvh bg-neutral-50 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white">
            <LogoMark className="h-4 w-4" />
          </span>
          Lunee
        </Link>
        <div className="mt-6 rounded-3xl border border-neutral-200 bg-white p-6 shadow-soft sm:p-8">
          <MarkdownLite source={`# ${title}\n${source}`} />
        </div>
      </div>
    </div>
  );
}
