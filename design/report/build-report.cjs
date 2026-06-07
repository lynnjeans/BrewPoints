const fs = require('fs')
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, TableOfContents, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageBreak, ExternalHyperlink, PageNumber, Header, Footer,
} = require('docx')

// ---------- helpers ----------
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] })
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] })
const P = (t) => new Paragraph({ children: [new TextRun(t)], spacing: { after: 120 } })
const I = (t) => new Paragraph({ children: [new TextRun({ text: t, italics: true, color: '6B6B6B' })], spacing: { after: 120 } })
const bullet = (t) => new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun(t)] })

// screenshot placeholder box (single-cell table — table borders serialize in valid schema order,
// unlike docx-js paragraph borders which emit an invalid element order).
const dashed = { style: BorderStyle.DASHED, size: 1, color: 'B0B0B0' }
const dashedBorders = { top: dashed, left: dashed, bottom: dashed, right: dashed }
const shot = (label) =>
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: dashedBorders,
            width: { size: 9360, type: WidthType.DXA },
            shading: { fill: 'F3F3F3', type: ShadingType.CLEAR },
            margins: { top: 160, bottom: 160, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: `[ Insert screenshot: ${label} ]`, color: '8A8A8A' })] })],
          }),
        ],
      }),
    ],
  })

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
const borders = { top: border, left: border, bottom: border, right: border }
const cell = (t, w, head = false) =>
  new TableCell({
    borders,
    width: { size: w, type: WidthType.DXA },
    shading: head ? { fill: 'E8E2D5', type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text: t, bold: head })] })],
  })
const table = (widths, rows) =>
  new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((r, i) => new TableRow({ children: r.map((c) => cell(c, widths[r.indexOf(c)] ?? widths[0], i === 0)) })),
  })

const CW = 9360 // content width, US Letter, 1in margins

// ---------- document ----------
const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 30, bold: true, font: 'Arial', color: '1A1A1A' },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 25, bold: true, font: 'Arial', color: '2D5F4F' },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 260 } } } }] },
    ],
  },
  sections: [
    {
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      footers: {
        default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('Page '), new TextRun({ children: [PageNumber.CURRENT] }), new TextRun(' of '), new TextRun({ children: [PageNumber.TOTAL_PAGES] })] })] }),
      },
      children: [
        // ---- Title page ----
        new Paragraph({ spacing: { before: 1800, after: 80 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'BrewPoints', bold: true, size: 64, color: '1A1A1A' })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'A café digital loyalty Progressive Web App', size: 26, color: '6B6B6B' })] }),
        new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'IA730001 — Advanced Application Development', size: 24 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Final Project — Study Block 2, 2026', size: 22, color: '6B6B6B' })] }),
        new Paragraph({ spacing: { before: 800 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Student name: ____________________     Student ID: ____________', size: 22 })] }),
        new Paragraph({ spacing: { before: 200 }, alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: 'GitHub: ', size: 22 }),
          new ExternalHyperlink({ link: 'https://github.com/lynnjeans/BrewPoints', children: [new TextRun({ text: 'https://github.com/lynnjeans/BrewPoints', style: 'Hyperlink', size: 22 })] }),
        ] }),
        new Paragraph({ children: [new PageBreak()] }),

        // ---- TOC ----
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Table of Contents')] }),
        new TableOfContents('Table of Contents', { hyperlink: true, headingStyleRange: '1-2' }),
        I('(After opening in Word: right-click the table → Update Field → Update entire table to populate page numbers.)'),
        new Paragraph({ children: [new PageBreak()] }),

        // ================= PART A — DESIGN PHASE =================
        H1('Part A — Design Phase (10 marks)'),

        H2('1. Introduction & business scenario'),
        P('BrewPoints is a digital loyalty programme for an independent café. It replaces the paper "buy 10, get 1 free" stamp card with an installable Progressive Web App. Customers collect a stamp per coffee and redeem a free coffee at 10 stamps; staff add stamps and confirm redemptions by scanning the customer’s QR code.'),
        I('Optionally expand with your finalised Week-02 scenario statement here.'),

        H2('2. User stories'),
        table([520, 8840], [
          ['#', 'User story'],
          ['US1', 'As a customer, I can sign up / log in (Google or email) so I can collect stamps.'],
          ['US2', 'As a customer, I can view my digital coffee card and member QR offline.'],
          ['US3', 'As staff, I can scan a customer code and add 1–2 stamps.'],
          ['US4', 'As a customer, I can redeem a free coffee when I reach 10 stamps.'],
          ['US5', 'As a customer, I can edit my profile and delete my account (CRUD).'],
          ['US6', 'As a manager, I can add / edit / remove staff accounts (CRUD).'],
          ['US7', 'As a customer, I receive a push notification when I earn or redeem.'],
        ]),

        H2('3. Personas'),
        P('Three personas drive the design (full detail in design/persona.md):'),
        bullet('Sophie — the customer: wants an offline, no-fuss card and a nudge when a reward is ready.'),
        bullet('Sam — the barista: needs a two-tap scan-and-add flow during the rush.'),
        bullet('Morgan — the manager: wants a store overview and staff management.'),
        shot('Persona cards (from design/persona.md, or your Figma persona board)'),

        H2('4. Storyboard'),
        P('Six-frame core loop (full detail in design/storyboard.md): sign up → view card → earn → reward ready → redeem → "coffee’s on the house".'),
        shot('Storyboard frames (hand-drawn or Figma)'),

        H2('5. UML — Class diagram'),
        P('Domain model (Customer, Staff, StampTransaction, Redemption, PushSubscription, Counter) with relationships. Source: design/diagrams/class-diagram.md (Mermaid).'),
        I('Render the Mermaid at https://mermaid.live (or view on GitHub), export PNG, and paste below.'),
        shot('UML class diagram'),

        H2('6. UML — Sequence diagrams'),
        P('Key flows: redemption (one-stage, R1/R2), earn, and authentication. Source: design/diagrams/sequence-*.md.'),
        shot('Sequence diagram — redeem a free coffee'),
        shot('Sequence diagram — earn / authentication'),

        H2('7. UI design — high-fidelity wireframes (Figma)'),
        P('High-fidelity wireframes for the main screens, following the Wellington Espresso design system (Appendix D).'),
        bullet('Login / sign-up'),
        bullet('Coffee card — in progress and reward-ready'),
        bullet('Rewards, History, Profile'),
        bullet('Staff scan, earn, and redeem-confirm'),
        shot('Figma high-fidelity wireframes (you create these)'),

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PART B — IMPLEMENTATION REPORT =================
        H1('Part B — Implementation / Final Report (10 marks)'),

        H2('8. Project environment setup'),
        P('Monorepo: /client (React + Vite + TypeScript PWA) and /server (Express + TypeScript + Mongoose).'),
        shot('Terminal: frontend setup (npm create vite / npm install)'),
        shot('Terminal: backend setup (npm init / npm install)'),
        shot('Project folder structure in the editor'),

        H2('9. Technology stack & architecture'),
        table([3120, 6240], [
          ['Layer', 'Choice'],
          ['Frontend', 'React 19 + Vite + TypeScript + Tailwind, PWA via vite-plugin-pwa (Workbox)'],
          ['Backend', 'Node + Express + TypeScript'],
          ['Database', 'MongoDB (Mongoose ODM), MongoDB Atlas in the cloud'],
          ['Auth', 'Google OAuth 2.0 + email/password (bcrypt) + JWT'],
          ['Messaging', 'Web Push (VAPID) — encrypted notifications'],
          ['Logging', 'pino + pino-http'],
        ]),
        P('Architecture diagram source: design/diagrams/architecture.md.'),
        shot('Architecture diagram (rendered from architecture.md)'),

        H2('10. Secure authentication & authorization'),
        P('Email/password is bcrypt-hashed (cost 12); sessions use JWT (Bearer). Google OAuth 2.0 uses the authorization-code flow. Role guards protect staff/manager routes; only staff can change balances (red line R1).'),
        shot('Google OAuth consent + successful login'),
        shot('Postman: register / login returning a JWT'),
        shot('Database: stored passwordHash (never plaintext)'),

        H2('11. Backend CRUD + MongoDB'),
        P('Two full-CRUD features: (1) customer account, (2) manager staff management. The loyalty ledger is append-only by design (R2). Endpoint reference: server/API.md.'),
        shot('Postman: Create (POST)'),
        shot('Postman: Read (GET)'),
        shot('Postman: Update (PATCH)'),
        shot('Postman: Delete (DELETE)'),
        shot('MongoDB Compass / Atlas: collections with data'),

        H2('12. Cloud database — MongoDB Atlas + replication (bonus)'),
        P('Deployed on MongoDB Atlas (AWS Sydney, ap-southeast-2) as a 3-node replica set, which provides data replication, high availability and automatic failover, and enables multi-document transactions (red line R2).'),
        shot('Atlas cluster overview showing Primary + 2 Secondary nodes'),
        shot('mongosh db.hello() output showing setName + 3 hosts'),

        H2('13. Secure messaging — Push API (Web Push)'),
        P('VAPID keys (stored only in .env) identify the server; payloads are encrypted to each subscription’s ECDH keys (RFC 8291). Notifications fire on earn and redeem. Details: server/PUSH.md.'),
        shot('Postman: GET /api/push/public-key and POST /api/me/push/test'),
        shot('Browser: notification permission + received notification'),

        H2('14. Unit testing'),
        P('Vitest test suite (64 tests) covering auth, earn/redeem (incl. concurrent double-redeem), balance reconciliation, QR signing, scan verification, and CRUD. Tests run against an in-memory MongoDB replica set (mongodb-memory-server).'),
        shot('Terminal: npm test — all tests passing'),
        shot('A representative test file (e.g. redeem.test.ts assertions)'),

        H2('15. Design patterns & code quality'),
        P('Patterns applied (see design/diagrams/architecture.md):'),
        bullet('Layered architecture — routes → services → models.'),
        bullet('Repository / Data-Mapper — Mongoose models encapsulate persistence.'),
        bullet('Middleware (chain of responsibility) — logging, auth, role guards, error handler.'),
        bullet('Strategy via the signed QR "intent" — one component/endpoint routes earn vs redeem.'),
        bullet('Singleton — single DB connection and logger; fail-fast typed config.'),
        shot('Code excerpt illustrating a pattern (e.g. redeem service transaction)'),

        H2('16. Troubleshooting, logging & debugging'),
        P('Structured logging with pino + pino-http (secrets redacted); central error handler + 404 JSON. Full write-up: server/TROUBLESHOOTING.md.'),
        shot('Server log output (startup + request logs)'),
        shot('VS Code debugger: breakpoint hit with Watch panel showing variables'),

        H2('17. Challenges & reflection'),
        I('Write 3–5 short paragraphs. Suggested prompts (real issues are documented in server/TROUBLESHOOTING.md):'),
        bullet('Migrating from a relational design to MongoDB while preserving atomic stamp deduction (transactions need a replica set).'),
        bullet('Keeping the QR usable offline yet secure (client HMAC + server verify).'),
        bullet('Making writes fail safely offline in the PWA (Network-Only for balance changes).'),
        bullet('What you would improve with more time.'),

        H2('18. Source code'),
        new Paragraph({ children: [
          new TextRun('GitHub repository: '),
          new ExternalHyperlink({ link: 'https://github.com/lynnjeans/BrewPoints', children: [new TextRun({ text: 'https://github.com/lynnjeans/BrewPoints', style: 'Hyperlink' })] }),
        ] }),
        I('Submit the source as a zip named <StudentID>-<Name>.zip via Moodle, and include this report.'),
      ],
    },
  ],
})

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('BrewPoints_Final_Report.docx', buf)
  console.log('Wrote BrewPoints_Final_Report.docx (' + buf.length + ' bytes)')
})
