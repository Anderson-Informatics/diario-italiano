# Diario Italiano

Diario Italiano is a full-stack Nuxt app for daily Italian writing practice. Users can write journal entries, get AI-powered review feedback, and track improvement over time.

## Quick Start

```bash
git clone https://github.com/Anderson-Informatics/diario-italiano.git
cd diario-italiano
pnpm install

cat > .env << 'EOF'
MONGO_URI=mongodb://localhost:27017/italian_journal
JWT_SECRET=replace-with-a-strong-secret
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
EOF

pnpm dev
```

Then open http://localhost:3000 in your browser.

## Project Overview

- Daily journal entry workflow with edit/history support
- AI review for grammar, spelling, vocabulary, CEFR estimate, and writing feedback
- Calendar and streak tracking for writing consistency
- Stats dashboard for trends, focus recommendations, and saved tips
- User authentication with profile settings (timezone and target review phase)

## Installation Requirements

- Node.js 20+
- pnpm 9+
- MongoDB instance (local or Atlas)
- OpenAI API key (required for AI review endpoint)

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create a `.env` file in the repository root:

```env
MONGO_URI=mongodb://localhost:27017/italian_journal
JWT_SECRET=replace-with-a-strong-secret
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
```

3. Start the development server:

```bash
pnpm dev
```

4. Open `http://localhost:3000`.

## Useful Commands

```bash
pnpm dev
pnpm build
pnpm preview
pnpm lint
pnpm test:unit
pnpm test:integration
pnpm test:e2e
```

## License

Licensed under GNU AGPLv3-or-later. In short: if you modify and run this software as a network service, you must provide users access to the corresponding source code of that running version.

See [LICENSE](./LICENSE) for full terms.
