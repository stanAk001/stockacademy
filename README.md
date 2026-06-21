# 📈 StockAcademia

StockAcademia is a full-stack platform I built to make learning the stock market simpler, more practical, and more interactive.

Instead of overwhelming beginners with theory, it combines:
learning, real stock analysis, and a trading simulator in one place.

Built with the PERN stack (PostgreSQL, Express, React, Node.js).

---

## ✨ What this project is about

I wanted to solve a simple problem:

Most people want to invest, but they don’t really understand how stocks work or how to analyze them properly.

So StockAcademia helps users:

- Learn the basics of investing step by step  
- Understand how real stocks behave  
- Practice trading without risking real money  
- Track performance and improve over time  

---

## 🚀 What’s inside

### 📚 Learning System
- Structured beginner-to-advanced courses  
- Interactive quizzes with XP tracking  
- Progress and leaderboard system  

### 📊 Stock Analysis Engine
Every stock is broken down into 4 simple ideas:

- Quality — how strong the company is  
- Value — whether the stock is cheap or expensive  
- Momentum — how the price is moving  
- Risk — how stable or volatile it is  

Each stock returns:
- A score from 0–100  
- A combined rating  
- A simple explanation anyone can understand  

### 📈 Real Market Data
- US stocks powered by Finnhub API  
- Nigerian stocks (NGX) included  
- Search by company name or ticker  

### 🧪 Paper Trading Simulator
- $100,000 virtual money  
- Buy and sell stocks in real-time conditions  
- Track profit and loss like a real portfolio  

### ⭐ Watchlist & Alerts
- Save stocks you care about  
- Get price alerts (premium feature)  

### 💬 Community
- Users can post, comment, and learn together  

### 💼 Monetization Layer
- Affiliate links to brokers  
- Click tracking system  
- Premium subscription system (Paystack-ready)  

### 🎓 Mentorship System
- Book 1-on-1 learning sessions  
- Choose time slots  
- Pay and confirm via Paystack  

---

## 🛠 Tech Stack

Frontend:
- React (Vite)
- Tailwind CSS
- Framer Motion
- Recharts

Backend:
- Node.js
- Express
- PostgreSQL
- JWT Authentication
- Google OAuth

Integrations:
- Finnhub API (stock data)
- Paystack (payments)

---

## ⚙️ How to run it locally

### 1. Install requirements
- Node.js (v18+)
- PostgreSQL
- pgAdmin

---

### 2. Database setup
Create a database called:

stockacademy

Then run the SQL files inside `/database`.

---

### 3. Start backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev