# Claude Code Workflow for FSA Project

This document outlines the best practices and workflows when using Claude Code with this project.

## 📋 Project Structure Quick Reference

```
fsa/
├── apps/
│   ├── frontend/              # Frontend Agent Territory
│   │   ├── src/
│   │   │   ├── app/          # Next.js App Router pages
│   │   │   ├── sections/     # Feature components
│   │   │   ├── components/   # Shared components
│   │   │   ├── lib/          # Frontend utilities
│   │   │   └── contexts/     # React contexts
│   │   └── package.json
│   │
│   └── backend/              # Backend Agent Territory
│       ├── src/
│       │   ├── routes/       # API endpoints
│       │   ├── controllers/  # Business logic
│       │   ├── models/       # MongoDB models
│       │   └── middleware/   # Auth, validation, etc.
│       └── package.json
│
├── .claude/                  # Claude Code configuration
│   ├── settings.local.json  # Permissions & settings
│   └── WORKFLOW.md          # This file
│
└── README.md                 # Project documentation
```

## 🔧 Common Tasks

### Starting Development Servers

```bash
# Start both frontend and backend
npm run dev

# Or individually:
cd apps/frontend && npm run dev  # Frontend on :3000
cd apps/backend && npm run dev   # Backend on :3001
```

### Fixing Errors

1. **Frontend errors** (TypeScript, React, Next.js):
   - Run diagnostics: `mcp__ide__getDiagnostics`
   - Delegate to `frontend-developer` agent

2. **Backend errors** (API, Database, Node.js):
   - Check backend logs
   - Delegate to `backend-developer` agent

### Database Operations

```bash
# Setup/seed database
cd apps/backend && npm run setup

# Connect to MongoDB (if using CLI)
mongo mongodb://localhost:27017/fsa
```

## 🎯 Key Principles

1. **Always delegate to specialized agents** for frontend/backend work
2. **Use TodoWrite tool** to track multi-step tasks
3. **Run diagnostics** before and after fixes
4. **Test changes** in development environment
5. **Follow existing patterns** in the codebase

## 📝 Notes

- Frontend uses Next.js 15 with App Router
- Backend uses Fastify with TypeScript
- Database is MongoDB
- Authentication uses JWT tokens
- State management: React Context + SWR

## 🔄 Keeping This Document Updated

This workflow document should be updated when:
- New agent patterns are discovered
- Project structure changes significantly
- New development practices are established
- Common issues and solutions are identified

---

Last updated: 2025-10-09
