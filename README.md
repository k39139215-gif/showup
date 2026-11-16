# ShowUp

> **Social Radar & Daily Consistency Tracker for Founders and Builders**

[![Live Demo](https://img.shields.io/badge/Live_Demo-Open_ShowUp-FF702E?style=for-the-badge&logo=google-chrome&logoColor=white)](https://k39139215-gif.github.io/showup/#today)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)

---

## 🌟 Overview

**ShowUp** is a focused execution dashboard built for founders, creators, and engineers who build in public. 

Most creators fail at social consistency because they track *outcomes* (follower spikes, algorithmic reach volatility) instead of *inputs*. When you measure daily inputs, consistency becomes a repeatable habit rather than an emotional rollercoaster.

ShowUp brings clarity to your daily presence on **X (Twitter)** and **LinkedIn**:
- Set daily input quotas (e.g., 1 original post + 5 outbound replies).
- Measure execution against your daily goals across customizable date ranges.
- Maintain a visual contribution streak heatmap that makes showing up non-negotiable.

---

## ✨ Features

- **🔥 Input-Driven Accountability**: Track both outbound original posts and community replies across platforms.
- **🟩 Visual Activity Heatmap**: 240-day GitHub-style matrix visualizing day-by-day consistency and active streaks.
- **📰 Expandable Content Library**: Searchable master-detail library with inline "Show more / Show less" truncation for long-form LinkedIn posts.
- **🛡️ Privacy-Safe Demo Environment**: Public GitHub preview automatically serves realistic synthetic data to protect personal accounts.
- **⚡ Keyboard Shortcuts**: Cross-platform single-key navigation (`T` for Today, `C` for Content, `A` for Analytics, `S` for Settings, `Ctrl+K` for search).
- **📈 Analytics & Reach Insights**: Engagement rates, impressions breakdown, and weekly performance trends.

---

## 🚀 Live Preview

Check out the interactive live demo hosted on GitHub Pages:  
👉 **[https://k39139215-gif.github.io/showup/#today](https://k39139215-gif.github.io/showup/#today)**

*(Note: The public preview operates in synthetic demo mode to showcase all features with realistic creator activity).*

---

## 🛠️ Tech Stack

- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS v4 + BoardUI Design System
- **State Management**: React Context & Hooks + DateStore
- **Charts & Motion**: Recharts + Motion
- **Tooling**: Vite 6

---

## 💻 Local Development

### 1. Clone the repository
```bash
git clone https://github.com/k39139215-gif/showup.git
cd showup
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start local development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application in your browser.

### 4. Build for production
```bash
npm run build
```

---

## 🔐 Environment Configuration (Optional)

To connect persistent cloud storage and live automated sync, create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional Social Handles
X_HANDLE=your_x_handle
LINKEDIN_PROFILE_URL=https://www.linkedin.com/in/your_profile/
```

*(If `.env` is omitted, ShowUp runs smoothly in demo mode using local state).*

---

## 👤 Author

**Kartik Bhosale**  
- **X (Twitter)**: [@kartikBhosaleHQ](https://x.com/kartikBhosaleHQ)  
- **LinkedIn**: [kartik-bhosale](https://www.linkedin.com/in/kartik-bhosale-5a7a85443/)

---

## 📄 License

MIT © 2026 Kartik Bhosale
