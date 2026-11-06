# SE Diagram Portfolio

Software Engineering lab work — twelve analysis and design diagrams for two systems,
published as a small static website with full notation guides.

**Systems modelled**

| System | DFD L0 | DFD L1 | DFD L2 | Use Case | Class | Sequence |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| Online Food Delivery System | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Library Management System | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |

---

## Viewing the site

Open `index.html` in any browser — there is no build step and no dependencies.

To publish it on the web, turn on **GitHub Pages**: repository **Settings → Pages →
Source: Deploy from a branch → Branch: `main` / root**. The site then appears at
`https://<username>.github.io/SE/`.

---

## Repository layout

```
.
├── index.html          # the whole site (single page)
├── assets/
│   ├── style.css       # theme, layout, light + dark mode
│   └── app.js          # theme toggle, diagram lightbox, scroll-spy
└── diagrams/           # the twelve diagrams, as editable SVG
    ├── DFD_Level0_FoodDelivery.svg
    ├── DFD_Level1_FoodDelivery.svg
    ├── DFD_Level2_PlaceOrder.svg
    ├── FoodDelivery_UseCase.svg
    ├── FoodDelivery_ClassDiagram.svg
    ├── FoodDelivery_SequenceDiagram.svg
    ├── Library_DFD_Level0.svg
    ├── Library_DFD_Level1.svg
    ├── Library_DFD_Level2_IssueBook.svg
    ├── Library_UseCaseDiagram.svg
    ├── Library_ClassDiagram.svg
    └── Library_SequenceDiagram.svg
```

---

## Editing the diagrams

Every diagram is a plain SVG, so it stays fully editable:

* **Wondershare EdrawMax** — `File → Import → SVG`, or drag the file onto the canvas.
  Every shape, arrow and label remains a separate object.
* **draw.io / diagrams.net** — `File → Import from → Device`.
* Any vector editor (Inkscape, Illustrator, Figma) opens them directly.

All arrowheads are drawn as **real geometry** rather than SVG `<marker>` elements,
because EdrawMax silently drops markers on import and the arrows would otherwise
vanish, leaving bare lines.

---

## Notation used

**Data Flow Diagrams** follow Yourdon–DeMarco notation: a circle is a process, a plain
rectangle is an external entity, an open-ended rectangle is a data store, and a labelled
arrow is a data flow. A DFD shows *data in motion* — it has no decisions, no loops and
no timing, which is what separates it from a flowchart.

**UML diagrams** follow standard UML 2: a hollow triangle is generalization, a filled
diamond is composition, `«include»` means a step always runs, and `«extend»` means a step
is optional and points from the extending case *to* the base case. On sequence diagrams a
solid line with a filled arrowhead is a call, and a dashed line with an open arrowhead is
a return.

The site's **Notation** section carries the full symbol tables, and its **Rules** section
lists the conventions that are checked during evaluation — balancing between DFD levels,
the ban on direct entity-to-store flows, naming discipline, and so on.

---

## Conventions followed

* Context diagrams contain exactly one process and no data stores.
* Sub-process numbering inherits the parent (`2.0` explodes into `2.1`, `2.2`, …).
* Each DFD level is **balanced** against the one above it: every flow crossing a process
  boundary reappears at the next level, with nothing added or dropped.
* Reading and writing the same data store are drawn as two separate arrows.
* In the Library Level-1 DFD every external entity appears exactly once; only data stores
  are repeated (marked with a double line on the left) so that no two lines cross.
