import type { ReactNode } from "react";

type MarkdownBlock =
  | { type: "paragraph"; content: string }
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; content: string }
  | { type: "blockquote"; content: string }
  | { type: "code"; lang: string; content: string }
  | { type: "list"; ordered: boolean; items: string[] };

function isBlank(line: string) {
  return line.trim().length === 0;
}

function isHeading(line: string) {
  return /^#{1,6}\s+/.test(line);
}

function isFence(line: string) {
  return /^```/.test(line.trim());
}

function isBlockquote(line: string) {
  return /^>\s?/.test(line);
}

function isListItem(line: string) {
  return /^(\d+\.\s+|[-*+]\s+)/.test(line);
}

function parseBlocks(content: string): MarkdownBlock[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (isBlank(line)) {
      i += 1;
      continue;
    }

    if (isFence(line)) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !isFence(lines[i])) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) {
        i += 1;
      }
      blocks.push({ type: "code", lang, content: codeLines.join("\n") });
      continue;
    }

    if (isHeading(line)) {
      const match = line.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        blocks.push({
          type: "heading",
          level: match[1].length as 1 | 2 | 3 | 4 | 5 | 6,
          content: match[2],
        });
        i += 1;
        continue;
      }
    }

    if (isBlockquote(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && isBlockquote(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "blockquote", content: quoteLines.join("\n") });
      continue;
    }

    if (isListItem(line)) {
      const ordered = /^\d+\.\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && isListItem(lines[i])) {
        items.push(lines[i].replace(/^(\d+\.\s+|[-*+]\s+)/, ""));
        i += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      !isBlank(lines[i]) &&
      !isHeading(lines[i]) &&
      !isFence(lines[i]) &&
      !isBlockquote(lines[i]) &&
      !isListItem(lines[i])
    ) {
      paragraphLines.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: "paragraph", content: paragraphLines.join(" ") });
  }

  return blocks;
}

function findClosing(text: string, start: number, needle: string) {
  return text.indexOf(needle, start);
}

function renderInline(content: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let i = 0;
  let buffer = "";

  const flush = () => {
    if (buffer) {
      nodes.push(buffer);
      buffer = "";
    }
  };

  while (i < content.length) {
    const char = content[i];

    if (content.startsWith("**", i) || content.startsWith("__", i)) {
      const marker = content.slice(i, i + 2);
      const end = findClosing(content, i + 2, marker);
      if (end !== -1) {
        flush();
        nodes.push(
          <strong key={`${i}-${end}`} className="font-semibold text-foreground">
            {renderInline(content.slice(i + 2, end))}
          </strong>,
        );
        i = end + 2;
        continue;
      }
    }

    if (char === "`") {
      const end = findClosing(content, i + 1, "`");
      if (end !== -1) {
        flush();
        nodes.push(
          <code
            key={`${i}-${end}`}
            className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
          >
            {content.slice(i + 1, end)}
          </code>,
        );
        i = end + 1;
        continue;
      }
    }

    if (char === "[") {
      const closeBracket = content.indexOf("]", i + 1);
      const openParen = closeBracket !== -1 ? content.indexOf("(", closeBracket + 1) : -1;
      const closeParen = openParen !== -1 ? content.indexOf(")", openParen + 1) : -1;
      if (closeBracket !== -1 && openParen === closeBracket + 1 && closeParen !== -1) {
        const label = content.slice(i + 1, closeBracket);
        const href = content.slice(openParen + 1, closeParen).trim();
        if (/^(https?:\/\/|mailto:)/i.test(href)) {
          flush();
          nodes.push(
            <a
              key={`${i}-${closeParen}`}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
            >
              {renderInline(label)}
            </a>,
          );
          i = closeParen + 1;
          continue;
        }
      }
    }

    if (char === "*" || char === "_") {
      const end = findClosing(content, i + 1, char);
      if (end !== -1 && content.slice(i + 1, end).trim()) {
        flush();
        nodes.push(
          <em key={`${i}-${end}`} className="italic text-foreground/95">
            {renderInline(content.slice(i + 1, end))}
          </em>,
        );
        i = end + 1;
        continue;
      }
    }

    buffer += char;
    i += 1;
  }

  flush();
  return nodes;
}

export function ChatMarkdown({ content }: { content: string }) {
  const blocks = parseBlocks(content);

  return (
    <div className="space-y-3 break-words text-sm leading-relaxed text-foreground">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const Tag = `h${block.level}` as const;
          return (
            <Tag key={index} className="font-semibold leading-tight text-foreground">
              {renderInline(block.content)}
            </Tag>
          );
        }

        if (block.type === "blockquote") {
          return (
            <blockquote
              key={index}
              className="border-l-2 border-primary/30 pl-3 text-foreground/85"
            >
              <div className="space-y-2">
                {block.content.split("\n").map((line, lineIndex) => (
                  <p key={lineIndex}>{renderInline(line)}</p>
                ))}
              </div>
            </blockquote>
          );
        }

        if (block.type === "code") {
          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-xl border border-border bg-muted px-4 py-3 font-mono text-[13px] leading-6 text-foreground/90"
            >
              <code>{block.content}</code>
            </pre>
          );
        }

        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag key={index} className="ml-5 space-y-1 pl-1">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="pl-1">
                  {renderInline(item)}
                </li>
              ))}
            </ListTag>
          );
        }

        return <p key={index}>{renderInline(block.content)}</p>;
      })}
    </div>
  );
}
