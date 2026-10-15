# FindIt — Project Overview & Requirements Specification

> **Platform Tagline:** *"Don't lose hope. Find what matters."*  
> **Target Audience:** College students, campus faculty, library administrators, facilities & security personnel.

---

## 1. Executive Summary & Problem Statement

University and college campuses are busy micro-cities where thousands of valuable belongings are misplaced every semester: student IDs, laptops, headphones, calculators, keys, and water bottles. 

Historically, campus lost-and-found operations suffer from severe fragmentation:
- **Disjoint Information Silos:** Individual departments, residence halls, athletic complexes, and library front desks maintain separate, uncatalogued physical boxes or handwritten paper logs.
- **Unstructured Digital Channels:** Social media groups, Reddit subreddits, and campus message boards produce high signal-to-noise ratios, rapidly burying urgent recovery notices.
- **Privacy & Theft Risks:** Publicly posting full pictures of high-value items without verification allows impostors to claim belongings that are not theirs.
- **Lack of Accountability:** No systematic tracking of when an item was turned in, who reviewed an ownership claim, or when physical handover occurred.

**FindIt** solves these challenges by providing a centralized, secure, privacy-preserving lost-and-found platform tailored specifically to campus life.

---

## 2. Platform Objectives

1. **Centralized Discovery:** Single unified searchable catalog of lost and found listings across all campus buildings and locations.
2. **Confidential Ownership Verification:** Students claiming found items must provide private identifying proof (e.g., lock screen wallpapers, engraving details, serial numbers) that remains strictly hidden from the public.
3. **Structured Claim Lifecycle:** State machine enforcing proper verification steps: `pending` → `under_review` → `approved` / `rejected` → `completed` / `cancelled`.
4. **Physical Handover Coordination:** Dedicated workflow for arrangers and claimants to agree on physical meeting points (e.g., Library Front Desk, Campus Security) and record handover completion atomically.
5. **Real-Time In-App Notifications:** Instant, user-isolated notification feed alerting members when claims are filed, approved, rejected, or updated.
6. **Robust Dual-Database Architecture:** File-based SQLite for instant local developer setup without external prerequisites, paired with 100% PostgreSQL compatibility for cloud production deployment.

---

## 3. Core Feature Specifications

### A. Authentication & User Management
- **Self-Service Registration:** Campus email, password, full name, and campus location.
- **Secure Credentials:** Passwords hashed with salted Bcrypt (`bcrypt>=4.1.0`).
- **Stateless Bearer Tokens:** PyJWT-generated tokens with configurable expiration (default 24h).
- **Identity Isolation:** Users can view and manage only their own listings, claims, and alerts.

### B. Lost & Found Item Catalog
- **Report Item:** Detailed forms for both `lost` and `found` belongings.
- **Rich Metadata:** Category, description, date, location/building, and optional image URL.
- **Search & Filter:** Instant multi-parameter filtering by type, category, campus, status, and free-text search.
- **Strict Authorization:** Only the original reporter or system admin can edit or remove a listing (`403 Forbidden` enforced for unauthorized users).

### C. Ownership Claims & Verification
- **Claim Submission:** Claimants submit an explanation and private ownership proof.
- **Privacy Firewall:** Private proof details are accessible **only** to the item reporter and the claimant.
- **Anti-Fraud Rules:**
  - Users cannot claim items they reported themselves (`400 Bad Request`).
  - Claimants cannot approve or complete their own claims (`403 Forbidden`).
  - Duplicate active claims are prohibited (`400 Bad Request`).
  - Items already returned or resolved cannot be claimed (`400 Bad Request`).

### D. Item Handover & Atomic Return
- **Handover Tracker:** Tracks handover status (`awaiting_handover`, `handover_arranged`, `returned_successfully`).
- **Physical Meeting Coordination:** Parties coordinate meeting notes and location.
- **Atomic Database Resolution:** Confirmation of physical return updates claim status to `completed` and item status to `returned` within a single database transaction.

### E. In-App Notifications
- **Automated Alerts:** Dispatched across every milestone in the claim, return, and smart match lifecycles.
- **Interactive UI:** Header notification bell with live unread counter badge, interactive dropdown list, and dedicated notifications management page.
- **Read State Management:** Single-click mark as read, bulk mark all as read, and single-item deletion.

### F. AI-Powered Smart Matching & Intelligent Recommendations
- **Automated Discovery:** Continuously pairs lost and found reports across campus listings.
- **Hybrid Multi-Attribute Scoring:**
  - Semantic text similarity (40% weight): Uses `LocalEmbeddingModel` (SentenceTransformer `all-MiniLM-L6-v2` with pure-Python TF-IDF synonym cluster fallback).
  - Category match (25% weight): Exact and related category alignment.
  - Location proximity (20% weight): Campus building and zone matching.
  - Temporal proximity (15% weight): Gaussian decay scoring based on date difference.
- **Explainable Match Insights:** Transparent breakdown showing category, location, date delta, and semantic alignment reasons.
- **User Feedback Loop:** Users mark suggestions as `relevant`, `not_relevant`, `already_recovered`, or `duplicate` with optional remarks to improve recommendations.
- **Privacy Preservation:** AI recommendations never disclose private ownership verification details.

---

## 4. Professional Project Presentation Outline

1. **Problem Statement:** Fragmented lost-and-found across university campuses, paper logs, public social media leaks, and high rate of unreturned items.
2. **Proposed Solution:** FindIt — A unified, campus-specific lost-and-found platform with confidential ownership verification, smart AI matching, and atomic handover tracking.
3. **Main Application Features:** User authentication, lost/found report catalog, multi-attribute search & filters, confidential claims, claim review, physical handover coordinator, atomic return confirmation, real-time notifications, AI smart matching dashboard, and admin management.
4. **Architecture:** Clean layered architecture with FastAPI backend (routers, services, repositories, schemas, models) and React 19 + TypeScript + Vite frontend (components, contexts, services, layouts).
5. **Technology Stack:**
   - Frontend: React 19, TypeScript, Vite, Vanilla CSS design system, Lucide icons.
   - Backend: Python 3.12, FastAPI, SQLAlchemy 2.0 ORM, Pydantic v2, PyJWT, Passlib/Bcrypt.
   - Database: SQLite (local development zero-config), PostgreSQL 16 (production ready).
   - AI/ML: Local embedding pipeline (`sentence-transformers` / `all-MiniLM-L6-v2` with zero-dependency TF-IDF cosine similarity fallback).
6. **AI Matching Implementation:** Multi-attribute weighted scoring algorithm (semantic 40%, category 25%, location 20%, date 15%), match generation API, explainability payload, and interactive feedback loop.
7. **Database Design:** 5 relational entities (`users`, `items`, `claims`, `notifications`, `matches`) with foreign keys, compound indexes, cascades, and status state machines.
8. **Security and Privacy:** Salted Bcrypt hashing, stateless JWT with expiration, role-based access control, private claim verification hidden from public APIs, file upload validation (type & size limits), CORS restrictions, and environment-driven secrets.
9. **Challenges Solved:** Offline-capable ML embeddings without breaking low-resource systems, dual-database compatibility (SQLite + Postgres), strict privacy preservation during claim review, and atomic multi-entity status synchronization during item return.
10. **Future Scope:** Native mobile apps (React Native), QR-code physical handover badges, computer-vision image similarity via embeddings, and campus card (SSO) integration.

---

## 5. Concise Portfolio & GitHub Project Description

**FindIt — Smart Campus Lost & Found Platform**  
FindIt is a full-stack, production-ready web application engineered to solve the fragmented and insecure lost-and-found process across campus environments. Built with a FastAPI (Python) backend and React 19 (TypeScript) frontend, FindIt combines confidential ownership verification, an automated multi-attribute AI matching engine, atomic physical handover tracking, and real-time alerts. With zero external API dependencies, dual-database flexibility (SQLite / PostgreSQL), and comprehensive test coverage (83 automated tests), FindIt provides an end-to-end, privacy-first recovery experience for universities and institutions.
