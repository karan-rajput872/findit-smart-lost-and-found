# Contributing to FindIt

Thank you for your interest in contributing to **FindIt — Smart Campus Lost & Found Platform**! This document provides guidelines for reporting issues, proposing new features, and submitting pull requests.

---

## Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free environment for all contributors. Please be respectful and constructive in all discussions.

---

## Getting Started

1. **Fork the Repository:** Create a personal fork of the repository on GitHub.
2. **Clone your fork:**
   ```bash
   git clone https://github.com/<your-username>/findit-smart-lost-and-found.git
   cd findit-smart-lost-and-found
   ```
3. **Set up local development:**
   - Refer to [`docs/SETUP_GUIDE.md`](file:///c:/Users/KIIT/OneDrive/Documents/FindIt/docs/SETUP_GUIDE.md) for step-by-step instructions.
   - For a single-command startup on Windows, run `.\start-findit.ps1`.

---

## Development Workflow

1. **Create a Feature Branch:**
   ```bash
   git checkout -b feat/your-feature-name
   # or for bug fixes:
   git checkout -b fix/issue-description
   ```

2. **Backend Guidelines (FastAPI & SQLAlchemy):**
   - Place API route handlers in `backend/app/api/routes/`.
   - Keep business logic in domain services (`backend/app/services/`).
   - Use Pydantic v2 schemas for request and response validation.
   - Write automated pytest tests in `backend/tests/` for new functionality.
   - Run the full test suite before committing:
     ```powershell
     cd backend
     .\.venv\Scripts\python.exe -m pytest -v
     ```

3. **Frontend Guidelines (React 19, TypeScript, Vite):**
   - Follow the established design system tokens in Vanilla CSS.
   - Ensure clean typing without `any` overrides.
   - Verify that the production build compiles cleanly:
     ```powershell
     cd frontend
     npm run build
     npm run lint
     ```

4. **Database Migrations:**
   - When modifying SQLAlchemy models, generate and test Alembic migrations:
     ```powershell
     cd backend
     .\.venv\Scripts\python.exe -m alembic revision --autogenerate -m "describe_changes"
     .\.venv\Scripts\python.exe -m alembic upgrade head
     ```
   - Ensure SQLite batch mode compatibility (`render_as_batch=True`).

---

## Submitting Pull Requests

1. Commit your changes with descriptive messages:
   ```bash
   git commit -m "feat(matching): add explainability confidence breakdown"
   ```
2. Push your branch to GitHub:
   ```bash
   git push origin feat/your-feature-name
   ```
3. Open a Pull Request against the `main` branch.
4. Include a clear description of:
   - What problem is solved.
   - What changes were made.
   - Steps to test and verify the changes.

---

## Security Vulnerabilities

If you discover a security vulnerability, please do NOT create a public issue. Instead, report it privately to the maintainer:
- Maintainer: **Priyanshu Karan**
- Email: `priyanshukaran25@gmail.com`
