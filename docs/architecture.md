# FindIt — Architecture & Design Document

## 1. System Vision
FindIt is a campus-first Smart Lost & Found platform designed to streamline discovery, reporting, and secure claim resolution for misplaced personal belongings across academic and institutional environments.

## 2. Multi-Tier Architecture Plan
```
┌─────────────────────────────────────────────────────────────┐
│                       Client Tier                           │
│   React 18/19 + TypeScript + Vite + Tailwind CSS + Lucide   │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST / JSON (Future)
┌──────────────────────────────▼──────────────────────────────┐
│                     API Gateway / Core                      │
│                FastAPI (Python Asynchronous)                │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
┌──────────────▼──────────────┐ ┌─────────────▼───────────────┐
│     Relational Storage      │ │     AI Matching Engine      │
│   PostgreSQL (Items/Claims) │ │   Sentence Transformers     │
│       + pgvector indexing   │ │   Semantic vector search    │
└─────────────────────────────┘ └─────────────────────────────┘
```

## 3. Milestone 1 Focus: Frontend Foundation
- Interactive component hierarchy.
- Type-safe domain models for Items, Claims, Notifications, and Matches.
- Centralized UI state with localStorage fallback for rich prototyping.
- Curated dark aesthetic matching high-end SaaS tools.
- Strict security boundaries: no exposure of sensitive verification keys or real AI claims.
