# 🚀 MergePilot

> **Your AI-powered copilot for smarter, faster Pull Request merges.**

MergePilot analyzes pull requests in real time to predict their merge probability and provide actionable, developer-focused feedback — so you can stop guessing and start shipping with confidence.

[![Backend](https://img.shields.io/badge/Backend-Python-blue?style=flat-square&logo=python)](https://www.python.org/)
[![Frontend](https://img.shields.io/badge/Frontend-JavaScript-yellow?style=flat-square&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit-brightgreen?style=flat-square&logo=vercel)](https://amdslingshot-frontend.vercel.app/)
[![Backend](https://img.shields.io/badge/Backend-Vercel-black?style=flat-square&logo=vercel)](https://amdslingshot-backend.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## 🌐 Live Demo

👉 **[https://amdslingshot-frontend.vercel.app/](https://amdslingshot-frontend.vercel.app/)**

No sign-up required. Just paste a GitHub PR URL and get instant analysis.

---

## 🧠 What is MergePilot?

MergePilot is a full-stack developer tool that acts as an intelligent assistant for your GitHub Pull Requests. Think of it as **Copilot for the merge queue** — it doesn't just tell you *if* a PR will merge, it tells you *why* and *how to fix it*.

By combining heuristics and machine learning, MergePilot scores your PR across multiple dimensions and returns a **merge probability score** alongside **concrete, prioritized suggestions** to help you get that green checkmark faster.

Whether you're a solo dev wanting faster review cycles or a team lead looking to reduce review bottlenecks, MergePilot has your back.

---

## ✨ Features

### 🔮 Merge Probability Prediction
Submit any GitHub PR URL and get an instant confidence score (0–100%) predicting the likelihood of it being merged, based on code quality signals, PR hygiene, and historical patterns.

### 🛠️ Actionable Developer Feedback
MergePilot doesn't just score your PR — it breaks down exactly what's dragging your score down and gives you a prioritized checklist of improvements:
- Missing or thin PR description
- Uncommitted or unreviewed files
- Lack of test coverage signals
- Large diff size warnings
- Stale branches or merge conflicts

### 📊 Multi-Dimensional PR Analysis
Your PR is evaluated across several key dimensions:
- **Code Quality** — diff complexity, coupling, file churn
- **PR Hygiene** — title clarity, description completeness, label usage
- **Review Readiness** — reviewer assignment, CI status, linked issues
- **Historical Context** — patterns from similar past PRs in the repo

### ⚡ Fast & Lightweight
The backend is deployed serverlessly on Vercel, meaning zero cold-start headaches and near-instant analysis results.

### 🌐 Clean Web UI
A responsive frontend interface lets you paste a PR URL, hit analyze, and get a visual breakdown of your score and improvement tips — no CLI, no config, no friction.

---

## 🏗️ Project Structure

```
MergePilot/
├── Backend/          # Python-based analysis engine & REST API
│   ├── api/          # API route handlers
│   ├── models/       # ML models & prediction logic
│   ├── analyzers/    # PR feature extractors
│   └── utils/        # Helpers & GitHub API wrappers
├── frontend/         # JavaScript web app
│   ├── src/          # Components & pages
│   └── public/       # Static assets
├── DEPLOYMENT.md     # Deployment guide
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.9+**
- **Node.js 18+**
- A **GitHub Personal Access Token** (for GitHub API calls)

---

### 1. Clone the Repository

```bash
git clone https://github.com/VigunhSaini/MergePilot.git
cd MergePilot
```

---

### 2. Backend Setup

```bash
cd Backend
pip install -r requirements.txt
```

Create a `.env` file in the `Backend/` directory:

```env
GITHUB_TOKEN=your_github_personal_access_token
SECRET_KEY=your_secret_key
GROQ_API_KEY=your_groq_api_key
```

Start the development server:

```bash
python app.py
```

The backend will be running at `http://localhost:5000`.

---

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:5000
```

Start the development server:

```bash
npm run dev
```

The frontend will be running at `http://localhost:5173`.

---

### 4. Open in Browser

Visit `http://localhost:5173`, paste a GitHub PR URL, and hit **Analyze** 🎯

---


## 🌍 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full deployment instructions.

**Quick Deploy to Vercel (Backend)**

```bash
cd Backend
vercel --prod
```

**Quick Deploy Frontend**

```bash
cd frontend
npm run build
vercel --prod
```

---

## 🤝 Contributing

Contributions are welcome and appreciated! Here's how to get involved:

1. **Fork** the repository
2. **Create** your feature branch: `git checkout -b feature/your-feature-name`
3. **Commit** your changes: `git commit -m 'feat: add your feature'`
4. **Push** to the branch: `git push origin feature/your-feature-name`
5. **Open** a Pull Request — and let MergePilot score it for you 😄

Please follow conventional commit messages and make sure your code passes any existing tests before submitting.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 👨‍💻 Author

**Vigunh Saini**
- GitHub: [@VigunhSaini](https://github.com/VigunhSaini)
**Pranat Kheria**
- GitHub: [@kpranat](https://github.com/kpranat)
**Srijan**
- GitHub: [@Srijan78](https://github.com/Srijan78)


---

<p align="center">Built with ❤️ to make every PR merge-worthy.</p>
