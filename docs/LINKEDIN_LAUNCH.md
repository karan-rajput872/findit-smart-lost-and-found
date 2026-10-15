# FindIt — LinkedIn Launch & Showcase Materials

Prepared for **Priyanshu Karan** (B.Tech Computer Science Engineering, KIIT).

---

## 1. Comprehensive LinkedIn Project Announcement (Detailed Post)

> 🚀 **Excited to share FindIt — An AI-Powered Smart Lost & Found Platform for Campus Communities!**
>
> During my time at KIIT, I noticed a recurring challenge that every student encounters: misplaced belongings. Laptops, ID cards, keys, calculators, and water bottles get lost every semester across busy libraries, lecture halls, and cafeterias. 
>
> Traditional lost-and-found systems are fundamentally broken. They rely on fragmented paper binders at reception desks or chaotic WhatsApp/Telegram channels where public posts expose sensitive belongings and invite fraudulent claims.
>
> To solve this, I designed and built **FindIt** — a full-stack, privacy-first recovery platform tailored for university micro-cities.
>
> 💡 **Key Engineering Highlights:**
>
> 🔹 **AI-Powered Multi-Attribute Smart Matching:** Instead of rigid keyword searches, FindIt runs an automated recommendation engine combining semantic text embeddings (using sentence transformers with pure-Python TF-IDF fallbacks), category hierarchy, campus building proximity, and temporal decay scoring.
>
> 🔹 **Confidential Ownership Verification & Privacy Firewall:** Claimants submit private identifying proof (e.g. unique engravings, custom lock screen wallpapers) that is protected by a strict privacy firewall. Only the verified finder or administrator can review it—eliminating false claims.
>
> 🔹 **Atomic Physical Handover Coordination:** A state-machine-driven workflow coordinates meeting locations and schedules. Confirming the physical return atomically locks the listing and completes the claim within a single database transaction.
>
> 🔹 **Dual-Database Architecture:** Built with zero-config persistent SQLite for instantaneous local development, paired with 100% production-ready PostgreSQL (psycopg3) and Alembic schema migrations.
>
> 🔹 **Enterprise-Grade Quality Assurance:** 83 automated backend tests (pytest) with 100% pass rate, covering authentication, authorization, claims, notifications, persistence, and AI matching.
>
> 🛠️ **Tech Stack:**
> - **Frontend:** React 19, TypeScript, Vite, Vanilla CSS Design System, Lucide React
> - **Backend:** Python 3.11+, FastAPI (ASGI), Uvicorn, Pydantic v2
> - **Database:** SQLAlchemy 2.0, Alembic, SQLite & PostgreSQL 16
> - **AI/ML:** Local embedding pipeline (`all-MiniLM-L6-v2` / TF-IDF synonym clusters)
> - **Security:** Salted Bcrypt, Stateless PyJWT Bearer Tokens
> - **DevOps:** Docker, Docker Compose, Nginx Reverse Proxy
>
> 🔗 **Explore the Project:**
> - GitHub Repository: https://github.com/karan-rajput872/findit-smart-lost-and-found
> - Live Demo & Documentation: (Link attached below)
>
> Building FindIt from architecture design through 83 automated tests and production containerization has been an incredible deep dive into full-stack engineering, practical applied ML, and privacy-first software design.
>
> Would love to hear your thoughts, feedback, and suggestions!
>
> #WebDevelopment #FullStack #FastAPI #React #TypeScript #Python #MachineLearning #ArtificialIntelligence #SoftwareEngineering #KIIT #StudentDeveloper #OpenSource

---

## 2. Short / Punchy LinkedIn Announcement (Quick Read)

> 🎓 **Lost something on campus? Don't lose hope. Find what matters.**
>
> Proud to present **FindIt** — an AI-powered lost-and-found platform I built to solve fragmented campus recoveries!
>
> 🔍 **What it does:**
> - Pairs lost and found items using hybrid semantic similarity, location proximity, and date scoring.
> - Protects ownership with a Confidential Proof Privacy Firewall.
> - Tracks physical handover atomically to ensure safe return.
> - Powered by FastAPI, React 19, TypeScript, PostgreSQL, and Docker.
> - Backed by 83 automated tests!
>
> 💻 Check out the open-source code on GitHub:  
> 👉 https://github.com/karan-rajput872/findit-smart-lost-and-found
>
> #Python #FastAPI #React #TypeScript #AI #KIIT #SoftwareEngineering

---

## 3. Concise Description for LinkedIn "Projects" Section

* **Project Name:** FindIt — AI-Powered Smart Lost & Found Platform
* **Associated With:** Kalinga Institute of Industrial Technology (KIIT)
* **Dates:** Oct 2026 – Present
* **Project URL:** `https://github.com/karan-rajput872/findit-smart-lost-and-found`
* **Description:**
  > Engineered an intelligent, full-stack campus lost-and-found platform using FastAPI (Python) and React 19 (TypeScript). Implemented a multi-attribute AI matching engine that evaluates semantic embeddings, category hierarchy, building proximity, and temporal decay with human-readable explainability. Designed a confidential ownership verification system with a privacy firewall, an atomic physical handover state machine, real-time in-app notifications, and dual SQLite/PostgreSQL compatibility. Verified with 83 automated tests and packaged with Docker Compose.
