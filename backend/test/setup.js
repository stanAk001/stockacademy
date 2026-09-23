// Loaded with --import before any test module.
//
// backend/.env points at the LIVE production database. Every test mocks the db
// module, but as a second line of defence we point DATABASE_URL at a dead
// address first. dotenv never overwrites a variable that's already set, so even
// a missed mock can't reach production.
process.env.DATABASE_URL = 'postgres://test:test@127.0.0.1:1/stockacademia_test';
process.env.OPENAI_API_KEY = '';
process.env.NODE_ENV = 'test';

// Pin the free-tier limits so a value in .env can't change what the tests expect.
process.env.FREE_SCOUT_LIMIT = '2';
process.env.FREE_ANALYSIS_LIMIT = '3';
process.env.FREE_COMPARISON_LIMIT = '1';
process.env.FREE_RESEARCH_LIMIT = '1';
process.env.FREE_NEWS_LIMIT = '2';
process.env.FREE_TRACKED_SETUPS = '1';
