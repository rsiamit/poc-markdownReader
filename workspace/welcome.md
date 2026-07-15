---
title: Welcome to the Markdown Editor
author: POC
date: 2024-01-01
---

# Welcome to the Markdown Editor :wave:

This document demonstrates every feature of the editor. Open it, edit it, and watch the live preview update in real time.

---

## Text Formatting

You can write **bold**, *italic*, ~~strikethrough~~, and `inline code`. Combine them: **_bold italic_**.

Here is a [link to the Mermaid docs](https://mermaid.js.org) and an auto-link: https://github.com

---

## GitHub-Flavored Markdown

### Tables

| Feature          | Status  | Notes                      |
|------------------|---------|----------------------------|
| GFM Tables       | ✅ Done  | Sortable in SHOULD tier    |
| Task Lists       | ✅ Done  | Interactive checkboxes     |
| Footnotes        | ✅ Done  | See below[^1]              |
| Strikethrough    | ✅ Done  | Using `~~text~~`           |

### Task Lists

- [x] Scaffold project
- [x] Build file API
- [ ] Add unit tests
- [ ] Deploy to production

### Footnotes

This sentence has a footnote.[^1]

[^1]: Footnotes appear at the bottom of the rendered document.

---

## Callouts / Admonitions

> [!NOTE]
> This is a **note** callout — useful for informational messages.

> [!WARNING]
> This is a **warning** callout — draws attention to potential issues.

> [!TIP]
> This is a **tip** callout — helpful suggestions for the reader.

> [!IMPORTANT]
> This is an **important** callout — critical information.

---

## Code Blocks

```typescript
// TypeScript with Shiki syntax highlighting
interface MarkdownEditor {
  content: string;
  theme: "light" | "dark";
  render(): Promise<string>;
}

async function renderMarkdown(editor: MarkdownEditor): Promise<void> {
  const html = await editor.render();
  console.log(`Rendered ${html.length} bytes`);
}
```

```python
# Python example
def fibonacci(n: int) -> list[int]:
    seq = [0, 1]
    while len(seq) < n:
        seq.append(seq[-1] + seq[-2])
    return seq[:n]

print(fibonacci(10))
```

```bash
# Shell commands
docker compose up --build
curl http://localhost:3001/api/health
```

---

## Mathematics (KaTeX)

Inline math: The famous equation $E = mc^2$ describes mass-energy equivalence.

Block math:

$$
\int_{-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi}
$$

The quadratic formula:

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

Maxwell's equations in differential form:

$$
\nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0}, \quad \nabla \times \mathbf{B} = \mu_0 \mathbf{J} + \mu_0\varepsilon_0\frac{\partial \mathbf{E}}{\partial t}
$$

---

## Mermaid Diagrams

### Flowchart

```mermaid
flowchart TD
    A([Start]) --> B{User opens file}
    B -- Yes --> C[Load content into editor]
    B -- No --> D[Show empty doc]
    C --> E[Parse markdown in worker]
    D --> E
    E --> F[Render preview]
    F --> G{User edits?}
    G -- Yes --> H[Debounce 150ms]
    H --> E
    G -- No --> I([Idle])
```

### Sequence Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant E as Editor
    participant W as Worker
    participant P as Preview

    U->>E: Type markdown
    E->>E: Debounce 150ms
    E->>W: Send content
    W->>W: Parse with unified
    W->>W: Sanitize HAST
    W-->>P: Return HAST + headings
    P->>P: Render components
    P-->>U: Show live preview
```

### Class Diagram

```mermaid
classDiagram
    class FileNode {
        +String path
        +String name
        +String type
        +Number mtime
        +FileNode[] children
    }
    class EditorStore {
        +FileNode[] tree
        +OpenDoc[] openDocs
        +String activeId
        +Settings settings
        +save()
        +openFile()
    }
    class OpenDoc {
        +String id
        +String path
        +String content
        +Boolean dirty
        +String baseHash
    }
    EditorStore "1" --> "*" OpenDoc
    EditorStore "1" --> "1" FileNode
```

### State Diagram

```mermaid
stateDiagram-v2
    [*] --> Clean
    Clean --> Dirty: Edit content
    Dirty --> Saving: Ctrl+S / autosave
    Saving --> Clean: Save success
    Saving --> Conflict: 409 from server
    Conflict --> Dirty: User resolves
    Clean --> [*]: Close file
```

### Entity Relationship

```mermaid
erDiagram
    WORKSPACE ||--o{ FOLDER : contains
    FOLDER ||--o{ FILE : contains
    FILE {
        string path PK
        string content
        int mtime
        string hash
    }
    FILE ||--o{ EXPORT : generates
    EXPORT {
        string format
        string outputPath
    }
```

### Gantt Chart

```mermaid
gantt
    title Markdown Editor POC — Build Plan
    dateFormat  YYYY-MM-DD
    section Scaffold
    Monorepo setup        :done, 2024-06-01, 1d
    Shared types          :done, 2024-06-01, 1d
    section Backend
    File API              :done, 2024-06-02, 2d
    Export route          :done, 2024-06-02, 1d
    section Frontend
    App shell             :active, 2024-06-03, 2d
    Editor                :2024-06-04, 2d
    Preview pipeline      :2024-06-05, 3d
    Diagrams              :2024-06-06, 2d
    section QA
    Tests + Docker        :2024-06-08, 2d
```

### Pie Chart

```mermaid
pie title Lines of Code by Area
    "Frontend" : 45
    "Backend" : 20
    "Shared/Types" : 5
    "Config/Docker" : 10
    "Tests" : 20
```

### Mindmap

```mermaid
mindmap
  root((Markdown Editor))
    Editing
      CodeMirror 6
      Toolbar
      Find & Replace
      Keyboard Shortcuts
    Rendering
      GFM
      Mermaid Diagrams
      KaTeX Math
      Shiki Highlighting
      Callouts
    Files
      Folder Tree
      Tabs
      Autosave
      Conflict Detection
    Export
      HTML
      PDF via Puppeteer
```

---

## Images

You can embed images using standard Markdown syntax:

```
![Alt text](./assets/diagram.png)
```

Paste an image from your clipboard directly into the editor and it will be saved to `assets/`.

---

## Blockquotes

> "The best way to predict the future is to invent it."
> — Alan Kay

Nested blockquotes:

> First level
> > Second level
> > > Third level

---

*Happy writing!* :pencil:
