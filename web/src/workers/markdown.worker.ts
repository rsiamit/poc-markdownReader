import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkFrontmatter from "remark-frontmatter";
import remarkDirective from "remark-directive";
import remarkEmoji from "remark-emoji";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import type { Root as MdastRoot, Heading, Blockquote, Paragraph, Text } from "mdast";
import { visit } from "unist-util-visit";
import { toString } from "mdast-util-to-string";

export interface ParseResult {
  html: string;
  headings: { id: string; text: string; depth: number }[];
  frontmatter: Record<string, unknown>;
}

// Custom sanitize schema — keep math/diagram classes
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "className", "style"],
    code: [...(defaultSchema.attributes?.["code"] ?? []), "className"],
    span: [...(defaultSchema.attributes?.["span"] ?? []), "style"],
    div: [...(defaultSchema.attributes?.["div"] ?? []), "className", "style"],
    math: ["display"],
    annotation: ["encoding"],
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "math", "mfrac", "mi", "mn", "mo", "mrow", "msqrt", "msub", "msup",
    "msubsup", "mtext", "munder", "mover", "munderover", "mtable", "mtr",
    "mtd", "annotation", "semantics", "kbd", "mark", "details", "summary",
  ],
};

function extractFrontmatter(tree: MdastRoot): Record<string, unknown> {
  const fm: Record<string, unknown> = {};
  visit(tree, "yaml", (node: { type: string; value: string }) => {
    const lines = node.value.split("\n");
    for (const line of lines) {
      const m = line.match(/^(\w+):\s*(.+)$/);
      if (m) fm[m[1]] = m[2].trim();
    }
  });
  return fm;
}

function extractHeadings(tree: MdastRoot): { id: string; text: string; depth: number }[] {
  const headings: { id: string; text: string; depth: number }[] = [];
  visit(tree, "heading", (node: Heading) => {
    const text = toString(node);
    const id = text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 64);
    headings.push({ id, text, depth: node.depth });
  });
  return headings;
}

// Transform > [!NOTE] style callouts into styled divs via mdast data
function calloutPlugin() {
  return (tree: MdastRoot) => {
    visit(tree, "blockquote", (node: Blockquote) => {
      const first = node.children[0] as Paragraph | undefined;
      if (!first || first.type !== "paragraph") return;
      const firstChild = first.children?.[0] as Text | undefined;
      if (!firstChild || firstChild.type !== "text") return;
      const match = firstChild.value.match(/^\[!(NOTE|WARNING|TIP|IMPORTANT|CAUTION)\]\s*/i);
      if (!match) return;
      const kind = match[1].toLowerCase();
      firstChild.value = firstChild.value.slice(match[0].length);

      // Mark the blockquote to render as a callout div
      (node as unknown as { data: Record<string, unknown> }).data = {
        hName: "div",
        hProperties: { className: `callout callout-${kind}` },
      };

      // Prepend title paragraph
      const titleNode: Paragraph = {
        type: "paragraph",
        data: {
          hName: "div",
          hProperties: { className: "callout-title" },
        } as Record<string, unknown>,
        children: [{ type: "text", value: kind }],
      };
      node.children.unshift(titleNode);
    });
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkFrontmatter, ["yaml"])
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkDirective)
  .use(remarkEmoji)
  .use(calloutPlugin)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeSlug)
  .use(rehypeAutolinkHeadings, { behavior: "append", properties: { ariaHidden: true } })
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeStringify);

self.onmessage = async (e: MessageEvent<{ id: string; content: string }>) => {
  const { id, content } = e.data;
  try {
    const mdast = unified()
      .use(remarkParse)
      .use(remarkFrontmatter, ["yaml"])
      .use(remarkGfm)
      .parse(content) as MdastRoot;

    const headings = extractHeadings(mdast);
    const frontmatter = extractFrontmatter(mdast);

    const file = await processor.process(content);
    const html = String(file);

    const result: ParseResult = { html, headings, frontmatter };
    self.postMessage({ id, result });
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
