// Markdown is parsed directly in the main thread via dynamic (lazy) imports.
// The unified processor is cached after first call so subsequent parses are fast.

export interface ParseResult {
  html: string;
  headings: { id: string; text: string; depth: number }[];
  frontmatter: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Processor = any;
let cachedProcessor: Processor | null = null;

async function getProcessor(): Promise<Processor> {
  if (cachedProcessor) return cachedProcessor;

  const [
    { unified },
    { default: remarkParse },
    { default: remarkGfm },
    { default: remarkMath },
    { default: remarkFrontmatter },
    { default: remarkEmoji },
    { default: remarkRehype },
    { default: rehypeKatex },
    { default: rehypeSlug },
    { default: rehypeAutolinkHeadings },
    { default: rehypeSanitize, defaultSchema },
    { default: rehypeStringify },
  ] = await Promise.all([
    import("unified"),
    import("remark-parse"),
    import("remark-gfm"),
    import("remark-math"),
    import("remark-frontmatter"),
    import("remark-emoji"),
    import("remark-rehype"),
    import("rehype-katex"),
    import("rehype-slug"),
    import("rehype-autolink-headings"),
    import("rehype-sanitize"),
    import("rehype-stringify"),
  ]);

  const sanitizeSchema = {
    ...defaultSchema,
    // Empty string prevents rehype-sanitize from prefixing IDs with "user-content-",
    // which would break the hrefs written by rehype-autolink-headings.
    clobberPrefix: "",
    attributes: {
      ...defaultSchema.attributes,
      "*": [...(defaultSchema.attributes?.["*"] ?? []), "className", "style"],
      code: [...(defaultSchema.attributes?.["code"] ?? []), "className"],
      span: [...(defaultSchema.attributes?.["span"] ?? []), "style"],
      div:  [...(defaultSchema.attributes?.["div"]  ?? []), "className", "style"],
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

  // Callout plugin: > [!NOTE] → <div class="callout callout-note">
  function calloutPlugin() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (tree: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const visitFn = (node: any) => {
        const first = node.children?.[0];
        if (!first || first.type !== "paragraph") return;
        const firstChild = first.children?.[0];
        if (!firstChild || firstChild.type !== "text") return;
        const match = firstChild.value.match(/^\[!(NOTE|WARNING|TIP|IMPORTANT|CAUTION)\]\s*/i);
        if (!match) return;
        const kind = match[1].toLowerCase();
        firstChild.value = firstChild.value.slice(match[0].length);
        node.data = { hName: "div", hProperties: { className: `callout callout-${kind}` } };
        node.children.unshift({
          type: "paragraph",
          data: { hName: "div", hProperties: { className: "callout-title" } },
          children: [{ type: "text", value: kind }],
        });
      };

      // Walk blockquotes manually (avoids unist-util-visit version mismatch)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const walk = (node: any) => {
        if (node.type === "blockquote") visitFn(node);
        if (node.children) node.children.forEach(walk);
      };
      walk(tree);
    };
  }

  cachedProcessor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkEmoji)
    .use(calloutPlugin)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeKatex)           // must come before sanitize (adds math HTML)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: "append", properties: { ariaHidden: true } })
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify);

  return cachedProcessor;
}

// Extract YAML frontmatter with a simple regex (no extra dep)
function extractFrontmatter(content: string): Record<string, unknown> {
  const fm: Record<string, unknown> = {};
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return fm;
  for (const line of match[1].split("\n")) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) fm[m[1]] = m[2].trim();
  }
  return fm;
}

// Extract headings from rendered HTML (no extra dep)
function extractHeadings(html: string): { id: string; text: string; depth: number }[] {
  const headings: { id: string; text: string; depth: number }[] = [];
  const re = /<h([1-6])[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/h[1-6]>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const depth = parseInt(m[1]);
    const id = m[2];
    const text = m[3].replace(/<[^>]+>/g, "").trim();
    headings.push({ id, text, depth });
  }
  return headings;
}

export async function parseMarkdown(content: string): Promise<ParseResult> {
  const processor = await getProcessor();
  const file = await processor.process(content);
  const html = String(file);
  return {
    html,
    headings: extractHeadings(html),
    frontmatter: extractFrontmatter(content),
  };
}
