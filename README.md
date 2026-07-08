<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/Apna_Advisor-Your_AI_Portfolio_Advisor-10b981?style=for-the-badge&labelColor=050508">
    <img alt="Apna Advisor" src="https://img.shields.io/badge/Apna_Advisor-Your_AI_Portfolio_Advisor-10b981?style=for-the-badge&labelColor=050508">
  </picture>
</p>

<p align="center">
  <strong>AI-powered portfolio management for the modern investor.</strong><br>
  Track holdings, analyze opportunities, simulate growth, and make data-driven decisions — all in one place.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js 16">
  <img src="https://img.shields.io/badge/React-19-58c4dc?style=flat-square&logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178c6?style=flat-square&logo=typescript" alt="TypeScript 6.0">
  <img src="https://img.shields.io/badge/Tailwind-4-06b6d4?style=flat-square&logo=tailwindcss" alt="Tailwind CSS 4">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT License">
</p>

---

## ✨ Features

- **📊 Portfolio Management** — Create and manage multiple portfolios with real-time valuation
- **📄 OCR Import** — Upload portfolio screenshots and extract holdings automatically via OCR
- **📰 Market News** — Curated financial news feed with filters
- **🎯 Opportunity Scanner** — Screen stocks based on technical and fundamental criteria
- **💡 Smart Tools**
  - **SIP Calculator** — Project systematic investment plan growth
  - **Goal Planner** — Set and track financial goals
  - **Tax Calculator** — Estimate capital gains tax
  - **Dividend Tracker** — Monitor dividend income
  - **Corporate Actions** — Track stock splits, bonuses, and dividends
  - **Backup & Restore** — Export and import your data
- **📈 Live Quotes** — Real-time stock prices via Finnhub API
- **🔐 Authentication** — Secure login with JWT + httpOnly cookies
- **📱 Responsive** — Works seamlessly across desktop and mobile

## 🖼️ Screenshots

> *Screenshots coming soon.*

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **UI Library** | [React 19](https://react.dev/) |
| **Language** | [TypeScript 6.0](https://www.typescriptlang.org/) — Strict mode |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Auth** | JWT with httpOnly cookies + bcrypt |
| **Data Storage** | In-memory JSON file store (pluggable to any DB) |
| **OCR** | [Tesseract.js](https://tesseract.projectnaptha.com/) + Gemini AI |
| **Live Quotes** | [Finnhub API](https://finnhub.io/) via Server-Sent Events |
| **Charts** | [Recharts](https://recharts.org/) |

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.x or later
- **npm** 10.x or later

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/apna-advisor.git
cd apna-advisor

# Install dependencies
npm install
```

### Environment Variables

This project does **not** require any custom environment variables.  
It uses only Next.js built-in `NODE_ENV` (set automatically).

If you add external services, create a `.env.local` file:

```env
# Optional: Google OAuth credentials
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Optional: Database connection
DATABASE_URL=
```

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
```

The production build is output to the `.next/` directory.

### Lint

```bash
npm run lint
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/                # Backend API endpoints
│   │   ├── auth/           # Authentication (login, register)
│   │   ├── extract/        # OCR & data extraction
│   │   └── ...
│   ├── login/              # Login page
│   ├── register/           # Registration page
│   ├── portfolio/          # Portfolio management pages
│   ├── tools/              # Financial tools (SIP, tax, goals, etc.)
│   ├── news/               # Market news feed
│   ├── opportunities/      # Stock opportunity scanner
│   └── ...
├── components/             # Reusable React components
│   ├── auth/               # Authentication UI components
│   ├── dashboard/          # Dashboard shell & cards
│   ├── layout/             # Layout components (navbar, sidebar)
│   ├── news/               # News feed components
│   ├── portfolio/          # Portfolio-related components
│   └── ui/                 # Primitives (Button, Input, Badge, etc.)
├── contexts/               # React context providers (auth, etc.)
├── lib/                    # Shared utilities & business logic
│   ├── auth-server.ts      # Server-side authentication
│   ├── parsers/            # OCR & extract parsers
│   ├── live-quotes/        # Real-time stock quotes
│   └── stores/             # Data storage layer
├── proxy.ts                # Next.js auth middleware (proxy)
├── app.css                 # Global styles
└── app.tsx                 # Root layout
```

## 🧠 Usage

1. **Register** an account with your name, email, and password.
2. **Create a portfolio** — add holdings manually or upload a screenshot for OCR import.
3. **Monitor** your portfolio value with real-time price updates.
4. **Explore** market news and the opportunity scanner for investment ideas.
5. **Plan** with SIP calculators, goal planners, and tax estimators.
6. **Track** dividends and corporate actions across your holdings.

## 🔮 Future Improvements

- [ ] PostgreSQL / MongoDB database integration
- [ ] OAuth login (Google, GitHub)
- [ ] Real brokerage API integration (Zerodha, Groww, etc.)
- [ ] Interactive portfolio charts & analytics
- [ ] Mobile app (React Native)
- [ ] Multi-currency support
- [ ] Export reports (PDF, Excel)
- [ ] Unit & integration tests
- [ ] CI/CD pipeline with GitHub Actions
- [ ] Docker deployment

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Your Name** — [@yourgithub](https://github.com/yourgithub)

---

<p align="center">
  <sub>Built with ❤️ using Next.js, React, and TypeScript</sub>
</p>
