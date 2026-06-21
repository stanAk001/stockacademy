--
-- PostgreSQL database dump
--

\restrict ZlYrWv7T8Gv6XPwhnj8tgcjr1KjQNsHv6ek1oQBzQ4fd4PRpoi7tmxwdQEJPX2Q

-- Dumped from database version 15.17
-- Dumped by pg_dump version 15.17

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.achievements (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    icon character varying(50),
    xp_reward integer DEFAULT 50,
    criteria character varying(100)
);


--
-- Name: achievements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.achievements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: achievements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.achievements_id_seq OWNED BY public.achievements.id;


--
-- Name: admin_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_audit_log (
    id integer NOT NULL,
    admin_id integer,
    action character varying(50) NOT NULL,
    target_type character varying(20),
    target_id integer,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: admin_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_audit_log_id_seq OWNED BY public.admin_audit_log.id;


--
-- Name: affiliate_clicks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.affiliate_clicks (
    id integer NOT NULL,
    user_id integer,
    broker_id integer,
    symbol character varying(10),
    clicked_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: affiliate_clicks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.affiliate_clicks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: affiliate_clicks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.affiliate_clicks_id_seq OWNED BY public.affiliate_clicks.id;


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id integer NOT NULL,
    reference character varying(50) NOT NULL,
    user_id integer,
    session_type_id integer,
    name character varying(150) NOT NULL,
    email character varying(150) NOT NULL,
    phone character varying(40),
    session_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    timezone character varying(60) DEFAULT 'Africa/Lagos'::character varying,
    notes text,
    amount_kobo integer NOT NULL,
    currency character varying(3) NOT NULL,
    payment_status character varying(20) DEFAULT 'pending'::character varying,
    payment_provider character varying(20),
    payment_reference character varying(150),
    paid_at timestamp without time zone,
    status character varying(20) DEFAULT 'pending'::character varying,
    meeting_url text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    processor character varying(20) DEFAULT 'paystack'::character varying,
    country_code character varying(2),
    CONSTRAINT ck_payment CHECK (((payment_status)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'failed'::character varying, 'refunded'::character varying])::text[]))),
    CONSTRAINT ck_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;


--
-- Name: brokers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brokers (
    id integer NOT NULL,
    key character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    logo character varying(20),
    color character varying(30),
    asset_types text[],
    affiliate_url text NOT NULL,
    description text,
    priority integer DEFAULT 0,
    enabled boolean DEFAULT true
);


--
-- Name: brokers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.brokers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: brokers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.brokers_id_seq OWNED BY public.brokers.id;


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id integer NOT NULL,
    title character varying(200) NOT NULL,
    slug character varying(200) NOT NULL,
    description text,
    category character varying(50),
    difficulty character varying(20),
    icon character varying(50),
    cover_color character varying(30),
    estimated_minutes integer,
    order_index integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: courses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.courses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: courses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.courses_id_seq OWNED BY public.courses.id;


--
-- Name: forum_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_comments (
    id integer NOT NULL,
    post_id integer,
    user_id integer,
    content text NOT NULL,
    upvotes integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_removed boolean DEFAULT false,
    removed_reason text,
    removed_by integer,
    removed_at timestamp without time zone
);


--
-- Name: forum_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forum_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forum_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forum_comments_id_seq OWNED BY public.forum_comments.id;


--
-- Name: forum_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_posts (
    id integer NOT NULL,
    user_id integer,
    title character varying(300) NOT NULL,
    content text NOT NULL,
    category character varying(50),
    tags text[],
    upvotes integer DEFAULT 0,
    views integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_removed boolean DEFAULT false,
    removed_reason text,
    removed_by integer,
    removed_at timestamp without time zone
);


--
-- Name: forum_posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forum_posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forum_posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forum_posts_id_seq OWNED BY public.forum_posts.id;


--
-- Name: lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lessons (
    id integer NOT NULL,
    course_id integer,
    title character varying(200) NOT NULL,
    slug character varying(200) NOT NULL,
    content text,
    video_url text,
    order_index integer DEFAULT 0,
    xp_reward integer DEFAULT 10,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: lessons_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lessons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lessons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lessons_id_seq OWNED BY public.lessons.id;


--
-- Name: plan_upgrades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_upgrades (
    id integer NOT NULL,
    user_id integer NOT NULL,
    reference character varying(50) NOT NULL,
    amount_kobo integer NOT NULL,
    currency character varying(3) DEFAULT 'NGN'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    paystack_reference character varying(150),
    return_to text,
    paid_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    processor character varying(20) DEFAULT 'paystack'::character varying,
    country_code character varying(2),
    CONSTRAINT ck_plan_upgrade_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: plan_upgrades_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.plan_upgrades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: plan_upgrades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.plan_upgrades_id_seq OWNED BY public.plan_upgrades.id;


--
-- Name: portfolios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolios (
    id integer NOT NULL,
    user_id integer,
    symbol character varying(10) NOT NULL,
    company_name character varying(200),
    shares numeric(15,4) NOT NULL,
    avg_buy_price numeric(15,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: portfolios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.portfolios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: portfolios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.portfolios_id_seq OWNED BY public.portfolios.id;


--
-- Name: post_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_votes (
    id integer NOT NULL,
    user_id integer,
    post_id integer,
    vote_type integer
);


--
-- Name: post_votes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.post_votes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: post_votes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.post_votes_id_seq OWNED BY public.post_votes.id;


--
-- Name: price_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_alerts (
    id integer NOT NULL,
    user_id integer,
    symbol character varying(10) NOT NULL,
    company_name character varying(200),
    target_price numeric(15,2) NOT NULL,
    direction character varying(10) NOT NULL,
    triggered boolean DEFAULT false,
    triggered_at timestamp without time zone,
    note text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: price_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.price_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: price_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.price_alerts_id_seq OWNED BY public.price_alerts.id;


--
-- Name: quiz_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_attempts (
    id integer NOT NULL,
    user_id integer,
    quiz_id integer,
    score integer,
    passed boolean DEFAULT false,
    attempted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: quiz_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quiz_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quiz_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quiz_attempts_id_seq OWNED BY public.quiz_attempts.id;


--
-- Name: quiz_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_questions (
    id integer NOT NULL,
    quiz_id integer,
    question text NOT NULL,
    options jsonb NOT NULL,
    correct_answer integer NOT NULL,
    explanation text
);


--
-- Name: quiz_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quiz_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quiz_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quiz_questions_id_seq OWNED BY public.quiz_questions.id;


--
-- Name: quizzes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quizzes (
    id integer NOT NULL,
    lesson_id integer,
    title character varying(200),
    passing_score integer DEFAULT 70
);


--
-- Name: quizzes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quizzes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quizzes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quizzes_id_seq OWNED BY public.quizzes.id;


--
-- Name: session_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_types (
    id integer NOT NULL,
    key character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    duration_minutes integer NOT NULL,
    price_kobo integer NOT NULL,
    currency character varying(3) DEFAULT 'NGN'::character varying,
    description text,
    features jsonb DEFAULT '[]'::jsonb,
    premium_only boolean DEFAULT false,
    icon character varying(20),
    color character varying(30),
    enabled boolean DEFAULT true,
    sort_order integer DEFAULT 0
);


--
-- Name: session_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.session_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: session_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.session_types_id_seq OWNED BY public.session_types.id;


--
-- Name: stock_quotes_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_quotes_cache (
    symbol character varying(20) NOT NULL,
    price numeric(18,4),
    change_pct numeric(8,4),
    high numeric(18,4),
    low numeric(18,4),
    open numeric(18,4),
    prev_close numeric(18,4),
    volume bigint,
    cached_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: stock_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_views (
    id integer NOT NULL,
    user_id integer,
    symbol character varying(20),
    viewed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: stock_views_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_views_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_views_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_views_id_seq OWNED BY public.stock_views.id;


--
-- Name: stocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stocks (
    id integer NOT NULL,
    symbol character varying(20) NOT NULL,
    display_symbol character varying(20) NOT NULL,
    name character varying(200) NOT NULL,
    exchange character varying(20) NOT NULL,
    country character varying(2) NOT NULL,
    currency character varying(3) NOT NULL,
    sector character varying(100),
    industry character varying(100),
    logo_url text,
    is_active boolean DEFAULT true,
    last_price numeric(18,4),
    prev_close numeric(18,4),
    day_change_pct numeric(8,4),
    market_cap_millions numeric(18,2),
    shares_outstanding_millions numeric(18,2),
    pe_ratio numeric(10,2),
    pb_ratio numeric(10,2),
    ps_ratio numeric(10,2),
    ev_ebitda numeric(10,2),
    peg_ratio numeric(10,2),
    dividend_yield numeric(6,4),
    eps numeric(10,2),
    roe numeric(8,4),
    roa numeric(8,4),
    gross_margin numeric(8,4),
    net_margin numeric(8,4),
    debt_to_equity numeric(10,2),
    current_ratio numeric(8,2),
    revenue_growth_yoy numeric(8,4),
    earnings_growth_yoy numeric(8,4),
    beta numeric(8,3),
    volatility_30d numeric(8,4),
    volatility_1y numeric(8,4),
    max_drawdown_1y numeric(8,4),
    avg_daily_volume_millions numeric(18,2),
    return_1m numeric(8,4),
    return_3m numeric(8,4),
    return_6m numeric(8,4),
    return_1y numeric(8,4),
    high_52w numeric(18,4),
    low_52w numeric(18,4),
    data_updated_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: stocks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stocks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stocks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stocks_id_seq OWNED BY public.stocks.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    user_id integer,
    symbol character varying(10) NOT NULL,
    company_name character varying(200),
    transaction_type character varying(10) NOT NULL,
    shares numeric(15,4) NOT NULL,
    price_per_share numeric(15,2) NOT NULL,
    total_amount numeric(15,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: tutor_availability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tutor_availability (
    id integer NOT NULL,
    day_of_week integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    enabled boolean DEFAULT true,
    CONSTRAINT tutor_availability_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);


--
-- Name: tutor_availability_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tutor_availability_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tutor_availability_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tutor_availability_id_seq OWNED BY public.tutor_availability.id;


--
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_achievements (
    id integer NOT NULL,
    user_id integer,
    achievement_id integer,
    earned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_achievements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_achievements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_achievements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_achievements_id_seq OWNED BY public.user_achievements.id;


--
-- Name: user_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_progress (
    id integer NOT NULL,
    user_id integer,
    lesson_id integer,
    completed boolean DEFAULT false,
    completed_at timestamp without time zone
);


--
-- Name: user_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_progress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_progress_id_seq OWNED BY public.user_progress.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    username character varying(50) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash character varying(255),
    google_id character varying(255),
    avatar_url text,
    full_name character varying(150),
    auth_provider character varying(20) DEFAULT 'local'::character varying,
    is_verified boolean DEFAULT false,
    bio text,
    experience_level character varying(20) DEFAULT 'beginner'::character varying,
    virtual_balance numeric(15,2) DEFAULT 100000.00,
    total_xp integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    plan character varying(20) DEFAULT 'free'::character varying,
    plan_started_at timestamp without time zone,
    plan_expires_at timestamp without time zone,
    is_admin boolean DEFAULT false,
    is_banned boolean DEFAULT false,
    banned_reason text,
    banned_at timestamp without time zone,
    banned_by integer,
    last_login_at timestamp without time zone
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: watchlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.watchlist (
    id integer NOT NULL,
    user_id integer,
    symbol character varying(10) NOT NULL,
    company_name character varying(200),
    added_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    note text
);


--
-- Name: watchlist_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.watchlist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: watchlist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.watchlist_id_seq OWNED BY public.watchlist.id;


--
-- Name: achievements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements ALTER COLUMN id SET DEFAULT nextval('public.achievements_id_seq'::regclass);


--
-- Name: admin_audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log ALTER COLUMN id SET DEFAULT nextval('public.admin_audit_log_id_seq'::regclass);


--
-- Name: affiliate_clicks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_clicks ALTER COLUMN id SET DEFAULT nextval('public.affiliate_clicks_id_seq'::regclass);


--
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);


--
-- Name: brokers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brokers ALTER COLUMN id SET DEFAULT nextval('public.brokers_id_seq'::regclass);


--
-- Name: courses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses ALTER COLUMN id SET DEFAULT nextval('public.courses_id_seq'::regclass);


--
-- Name: forum_comments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_comments ALTER COLUMN id SET DEFAULT nextval('public.forum_comments_id_seq'::regclass);


--
-- Name: forum_posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_posts ALTER COLUMN id SET DEFAULT nextval('public.forum_posts_id_seq'::regclass);


--
-- Name: lessons id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons ALTER COLUMN id SET DEFAULT nextval('public.lessons_id_seq'::regclass);


--
-- Name: plan_upgrades id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_upgrades ALTER COLUMN id SET DEFAULT nextval('public.plan_upgrades_id_seq'::regclass);


--
-- Name: portfolios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolios ALTER COLUMN id SET DEFAULT nextval('public.portfolios_id_seq'::regclass);


--
-- Name: post_votes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_votes ALTER COLUMN id SET DEFAULT nextval('public.post_votes_id_seq'::regclass);


--
-- Name: price_alerts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_alerts ALTER COLUMN id SET DEFAULT nextval('public.price_alerts_id_seq'::regclass);


--
-- Name: quiz_attempts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts ALTER COLUMN id SET DEFAULT nextval('public.quiz_attempts_id_seq'::regclass);


--
-- Name: quiz_questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_questions ALTER COLUMN id SET DEFAULT nextval('public.quiz_questions_id_seq'::regclass);


--
-- Name: quizzes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quizzes ALTER COLUMN id SET DEFAULT nextval('public.quizzes_id_seq'::regclass);


--
-- Name: session_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_types ALTER COLUMN id SET DEFAULT nextval('public.session_types_id_seq'::regclass);


--
-- Name: stock_views id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_views ALTER COLUMN id SET DEFAULT nextval('public.stock_views_id_seq'::regclass);


--
-- Name: stocks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocks ALTER COLUMN id SET DEFAULT nextval('public.stocks_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Name: tutor_availability id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutor_availability ALTER COLUMN id SET DEFAULT nextval('public.tutor_availability_id_seq'::regclass);


--
-- Name: user_achievements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements ALTER COLUMN id SET DEFAULT nextval('public.user_achievements_id_seq'::regclass);


--
-- Name: user_progress id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_progress ALTER COLUMN id SET DEFAULT nextval('public.user_progress_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: watchlist id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watchlist ALTER COLUMN id SET DEFAULT nextval('public.watchlist_id_seq'::regclass);


--
-- Data for Name: achievements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.achievements (id, name, description, icon, xp_reward, criteria) FROM stdin;
1	First Steps	Complete your first lesson	🎓	20	complete_1_lesson
2	Knowledge Seeker	Complete 5 lessons	📚	50	complete_5_lessons
3	Quiz Master	Pass 3 quizzes	🧠	75	pass_3_quizzes
4	First Trade	Execute your first paper trade	💹	30	first_trade
5	Community Starter	Post your first forum discussion	💬	25	first_post
6	Streak Champion	Log in 7 days in a row	🔥	100	streak_7
\.


--
-- Data for Name: admin_audit_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_audit_log (id, admin_id, action, target_type, target_id, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: affiliate_clicks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.affiliate_clicks (id, user_id, broker_id, symbol, clicked_at) FROM stdin;
\.


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bookings (id, reference, user_id, session_type_id, name, email, phone, session_date, start_time, end_time, timezone, notes, amount_kobo, currency, payment_status, payment_provider, payment_reference, paid_at, status, meeting_url, created_at, updated_at, processor, country_code) FROM stdin;
\.


--
-- Data for Name: brokers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.brokers (id, key, name, logo, color, asset_types, affiliate_url, description, priority, enabled) FROM stdin;
1	binance	Binance	🟡	from-sun-400 to-sun-600	{crypto}	https://accounts.binance.com/register?ref=YOUR_REF_CODE	World's largest crypto exchange	1	t
2	etoro	eToro	🟢	from-bull-400 to-bull-600	{us_equity,crypto,forex}	https://etoro.tw/YOUR_ETORO_CODE	Social trading, stocks & crypto	2	t
3	deriv	Deriv	🔴	from-coral-400 to-coral-500	{forex,synthetic}	https://deriv.com/?t=YOUR_DERIV_TOKEN	Forex & synthetic indices	3	t
4	ibkr	Interactive Brokers	⚪	from-ink to-ink-soft	{us_equity,international}	https://ibkr.com/referral/YOUR_IBKR_CODE	Pro-grade global broker	4	t
5	exness	Exness	🔵	from-blue-400 to-blue-600	{forex,crypto}	https://one.exness-track.com/a/YOUR_EXNESS_CODE	Forex and crypto broker	5	t
\.


--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.courses (id, title, slug, description, category, difficulty, icon, cover_color, estimated_minutes, order_index, created_at) FROM stdin;
1	Stock Market Basics	stock-basics	Learn what stocks are, how markets work, and core terminology every investor must know.	basics	Beginner	📈	from-emerald-400 to-teal-500	60	1	2026-05-07 23:10:37.746313
2	How to Earn from Stocks	earning-from-stocks	Dividends, capital gains, compounding — discover the realistic ways money is made in the market.	basics	Beginner	💰	from-amber-400 to-orange-500	45	2	2026-05-07 23:10:37.746313
3	Fundamental Analysis	fundamental-analysis	Read financial statements, ratios and valuation models to pick great companies.	fundamental	Intermediate	📊	from-blue-400 to-indigo-500	90	3	2026-05-07 23:10:37.746313
4	Technical Analysis	technical-analysis	Master charts, candlesticks, indicators, and trading patterns.	technical	Intermediate	📉	from-pink-400 to-rose-500	120	4	2026-05-07 23:10:37.746313
5	Risk Management	risk-management	Position sizing, stop-loss, diversification — how professionals protect their capital.	risk	Intermediate	🛡️	from-purple-400 to-fuchsia-500	50	5	2026-05-07 23:10:37.746313
6	Trading Strategies	trading-strategies	Day trading, swing trading, long-term investing — strategies explained.	strategies	Advanced	🎯	from-cyan-400 to-sky-500	75	6	2026-05-07 23:10:37.746313
\.


--
-- Data for Name: forum_comments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.forum_comments (id, post_id, user_id, content, upvotes, created_at, is_removed, removed_reason, removed_by, removed_at) FROM stdin;
\.


--
-- Data for Name: forum_posts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.forum_posts (id, user_id, title, content, category, tags, upvotes, views, created_at, updated_at, is_removed, removed_reason, removed_by, removed_at) FROM stdin;
\.


--
-- Data for Name: lessons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lessons (id, course_id, title, slug, content, video_url, order_index, xp_reward, created_at) FROM stdin;
1	1	What is a Stock?	what-is-a-stock	# What is a Stock?\n\nA **stock** (also called equity or share) represents partial ownership in a company. When you buy a stock, you become a **shareholder** — you literally own a tiny slice of that business.\n\n## Why do companies issue stocks?\nCompanies sell shares to raise money (capital) to grow. Instead of borrowing from a bank, they raise funds from the public.\n\n## What do you get as a shareholder?\n- **Price appreciation** — if the company grows, your share becomes more valuable.\n- **Dividends** — a portion of the company's profit, paid to shareholders.\n- **Voting rights** — on major company decisions.\n\n## Real example\nApple Inc. has around 15 billion shares outstanding. If you buy 1 share, you own one fifteen-billionth of Apple — including its factories, cash, brands, and future profits.	\N	1	10	2026-05-07 23:10:37.746313
2	1	How the Stock Market Works	how-market-works	# How the Stock Market Works\n\nThe stock market is a giant marketplace where buyers and sellers trade shares. Think of it like an online auction running every weekday.\n\n## Key players\n- **Investors** (you)\n- **Brokers** — middlemen that execute trades\n- **Exchanges** — NYSE, NASDAQ, LSE, NSE, JSE\n- **Market makers** — provide liquidity\n- **Regulators** — SEC, SEBI, FCA\n\n## How a trade happens\n1. You place an order through your broker.\n2. The order reaches the exchange.\n3. A matching seller is found.\n4. The trade executes in milliseconds.\n5. Shares land in your account (T+1 / T+2 settlement).	\N	2	10	2026-05-07 23:10:37.746313
3	1	Bull vs Bear Market	bull-vs-bear	# Bull vs Bear Markets\n\n## 🐂 Bull Market\nPrices are rising. Optimism is high. Economy is strong. Investors are buying aggressively. A bull market usually means the market is up 20%+ from recent lows.\n\n## 🐻 Bear Market\nPrices are falling. Pessimism dominates. Economy may be weakening. A bear market is a drop of 20%+ from recent highs.\n\n## The lesson\nBoth are normal. The S&P 500 has survived every bear market in history and hit new highs. Long-term investors win by staying patient.	\N	3	10	2026-05-07 23:10:37.746313
4	2	Capital Gains Explained	capital-gains	# Capital Gains\n\nA **capital gain** is the profit you make when you sell a stock for more than you paid.\n\n**Formula:** `Capital Gain = Selling Price - Purchase Price`\n\n## Example\nYou buy 10 shares of Tesla at $200 = $2,000 total.\nYou sell them later at $280 = $2,800.\nYour capital gain = **$800**.\n\n## Short-term vs Long-term\n- Short-term (held < 1 year) — usually taxed higher.\n- Long-term (held > 1 year) — usually taxed lower. Be patient.	\N	1	15	2026-05-07 23:10:37.746313
5	2	Dividends: Passive Income from Stocks	dividends	# Dividends\n\nA dividend is a cash payment a company gives its shareholders from its profits. It's passive income — you get paid just for holding the stock.\n\n## Key dates\n- **Declaration date** — company announces dividend\n- **Ex-dividend date** — buy before this to qualify\n- **Record date** — company confirms who holds shares\n- **Payment date** — money hits your account\n\n## Dividend Yield formula\n`Yield = Annual Dividend / Stock Price × 100`\n\nA $50 stock paying $2/yr has a 4% yield — better than most savings accounts.	\N	2	15	2026-05-07 23:10:37.746313
6	2	The Power of Compounding	compounding	# The Power of Compounding\n\nAlbert Einstein reportedly called compound interest "the eighth wonder of the world." It's how small money becomes huge money — over time.\n\n## The magic\nWhen you reinvest your dividends and gains, those reinvestments also earn returns. Growth accelerates.\n\n## Real numbers\n$10,000 invested at 10% annual return:\n- After 10 years: **$25,937**\n- After 20 years: **$67,275**\n- After 30 years: **$174,494**\n- After 40 years: **$452,593**\n\nTime in the market beats timing the market.	\N	3	20	2026-05-07 23:10:37.746313
7	3	Reading an Income Statement	income-statement	# The Income Statement\n\nAn income statement shows a company's **revenue, expenses, and profit** over a period.\n\n## Key lines to know\n- **Revenue** — total sales\n- **Cost of Goods Sold (COGS)** — direct costs\n- **Gross Profit** = Revenue − COGS\n- **Operating Expenses** — salaries, rent, marketing\n- **Operating Income** — core business profit\n- **Net Income** — bottom-line profit after tax\n\n## What to look for\n- Revenue growing year-over-year ✅\n- Net income growing faster than revenue ✅\n- Consistent profit margins ✅	\N	1	20	2026-05-07 23:10:37.746313
8	3	Key Financial Ratios	financial-ratios	# Key Financial Ratios\n\nRatios help you compare companies quickly.\n\n## Valuation\n- **P/E Ratio** — Price ÷ Earnings per share. Lower can mean undervalued.\n- **P/B Ratio** — Price ÷ Book value.\n- **PEG Ratio** — P/E ÷ Growth rate. PEG < 1 is attractive.\n\n## Profitability\n- **ROE (Return on Equity)** — Net income ÷ Equity. Want > 15%.\n- **Gross Margin** — Gross profit ÷ Revenue.\n\n## Health\n- **Debt-to-Equity** — Lower is safer.\n- **Current Ratio** — Current assets ÷ Current liabilities. Want > 1.	\N	2	20	2026-05-07 23:10:37.746313
10	4	Support & Resistance	support-resistance	# Support & Resistance\n\nThese are price levels where the market tends to pause or reverse.\n\n## Support\nA floor where buyers step in. Price bounces up from it.\n\n## Resistance\nA ceiling where sellers appear. Price gets rejected here.\n\n## Key insight\nWhen resistance is broken, it often becomes new support — and vice versa.\n\n## How to trade it\n- Buy near support, place stop just below it.\n- Sell or take profit near resistance.	\N	2	20	2026-05-07 23:10:37.746313
11	4	Moving Averages & RSI	ma-rsi	# Moving Averages & RSI\n\n## Moving Averages (MA)\nA MA smooths out price by averaging it over N days.\n- **50-day MA** — medium-term trend\n- **200-day MA** — long-term trend\n- **Golden Cross** — 50-MA crosses above 200-MA (bullish)\n- **Death Cross** — 50-MA crosses below 200-MA (bearish)\n\n## RSI (Relative Strength Index)\nMeasures momentum 0–100.\n- Above 70 = overbought (may fall)\n- Below 30 = oversold (may rise)\n\nCombine indicators — never rely on just one.	\N	3	25	2026-05-07 23:10:37.746313
9	4	Reading Candlestick Charts	candlesticks	# Reading Candlestick Charts\n\nA candlestick is the most informative chart format in trading. **One candle tells you four prices** — open, high, low, close — and the story of who won between buyers and sellers during that period.\n\nOnce you can read candlesticks fluently, you can read any chart.\n\n## Bull vs Bear: the bigger picture first\n\nBefore zooming into individual candles, you need to recognise the two states a market can be in:\n\n[[visual:bull-vs-bear]]\n\nA **bull market** trends up over weeks or months. A **bear market** trends down. Candlesticks just zoom in on what's happening day by day inside that bigger trend.\n\n## Anatomy of a single candle\n\n[[visual:candle-anatomy]]\n\nEach candle has two parts:\n\n- **Body** — the thick rectangle, drawn between the **open** price (where the period started) and the **close** price (where it ended)\n- **Wick** (also called *shadow*) — the thin line, showing the **highest** and **lowest** prices touched during the period\n\nThe colour tells you the direction:\n\n- **Green / hollow body** → close was *above* open → buyers won → **bullish**\n- **Red / filled body** → close was *below* open → sellers won → **bearish**\n\nThe trick most beginners miss: on a green candle, **open is at the bottom and close is at the top**. On a red candle, it flips — **open is at the top, close is at the bottom**. That's why both candles "look the same" but mean opposite things.\n\n## Why candlesticks beat line charts\n\nA line chart only connects closing prices. A candlestick chart shows you whether buyers were in control all session or whether the price *almost* fell apart before recovering. That extra information is everything in trading.\n\n## Watch this if you're still confused\n\n[[youtube:PLACEHOLDER|Reading candlestick charts — visual walkthrough]]\n\n## Four classic patterns to memorise\n\nThese four patterns are how candles start to "talk" to you. None of them are foolproof predictors, but seeing them at the right place on a chart (e.g. at support or resistance) gives you context.\n\n[[visual:candle-patterns]]\n\n- **Hammer** — a small body with a long *lower* wick. Sellers pushed price down hard, but buyers fought back to close near the top. Often a reversal signal *if* it appears after a downtrend.\n- **Shooting Star** — opposite of a hammer. Small body with a long *upper* wick. Buyers tried to push higher, sellers slammed it back down. Bearish reversal *if* after an uptrend.\n- **Doji** — open and close are almost identical. The body is a thin line. Buyers and sellers fought to a draw — pure indecision. Often appears at turning points.\n- **Bullish Engulfing** — a small red candle followed by a big green candle whose body completely engulfs the previous one. Strong shift in momentum from sellers to buyers.\n\n## How to actually use this\n\n1. **Don't trade single candles in isolation.** Context matters more than any one pattern.\n2. **Look for confluence.** A hammer at strong support is meaningful. A hammer floating in the middle of a chart is noise.\n3. **Practice in the simulator.** Open a chart in the StockAcademy simulator, identify candle patterns yourself, then watch what happens next. That feedback loop is how this skill is actually built.\n\nYou'll start seeing these patterns everywhere once you've read 100 charts. Get reading.\n	\N	1	20	2026-05-07 23:10:37.746313
12	5	Why Risk Management Matters Most	risk-fundamentals	\n# Why Risk Management Matters Most\n\nMost people think investing is about picking winners. The pros know it's about **not losing**.\n\nWarren Buffett's two rules:\n1. Never lose money.\n2. Never forget rule #1.\n\n## The asymmetry of losses\n\nIf you lose **50%** of your portfolio, you don't need a 50% gain to break even. You need **100%**.\n\n| Loss | Gain needed to recover |\n|------|------------------------|\n| -10% | +11% |\n| -25% | +33% |\n| -50% | +100% |\n| -75% | +300% |\n| -90% | +900% |\n\nA single catastrophic loss wipes out years of compounding.\n\n## The three risks every investor faces\n\n**1. Position risk** — losing too much on a single trade. Solution: position sizing.\n\n**2. Concentration risk** — losing too much in one sector. Solution: diversification.\n\n**3. Drawdown risk** — losing too much during a market downturn. Solution: asset allocation and discipline.\n\n## The professional mindset\n\nPros don't think "how much can I make?". They think "how much can I lose if I'm wrong?"\n\nThat single shift in thinking is the difference between people who survive 30 years in markets and people who blow up in 3.\n	\N	1	15	2026-05-07 23:18:44.52115
13	5	Position Sizing — How Much to Risk	position-sizing	\n# Position Sizing — How Much to Risk\n\nThe biggest decision in any trade isn't **what** to buy. It's **how much**.\n\n## The 1-2% rule\n\nProfessional traders risk **no more than 1-2% of total capital** on any single trade.\n\nIf your portfolio is ₦500,000:\n- 1% risk = ₦5,000 max loss per trade\n- 2% risk = ₦10,000 max loss per trade\n\nEven if you're wrong 5 trades in a row, you've only lost 5-10% — recoverable.\n\n## Calculating position size\n\nFormula:\n\nPosition Size = Risk Amount ÷ Distance to Stop Loss\n\nExample:\n- Portfolio = ₦500,000\n- Risk per trade = 1% = ₦5,000\n- Stop loss distance = ₦50\n\nPosition size = ₦5,000 ÷ ₦50 = 100 shares\n\nThis keeps losses controlled no matter what asset you trade.\n\n## Why professionals survive\n\nGood traders are not people who never lose.\n\nThey are people who:\n- keep losses small\n- preserve capital\n- stay emotionally stable\n- survive long enough for probabilities to work\n\nRisk management is what keeps you in the game.\n	\N	2	15	2026-05-07 23:18:44.52115
\.


--
-- Data for Name: plan_upgrades; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.plan_upgrades (id, user_id, reference, amount_kobo, currency, status, paystack_reference, return_to, paid_at, created_at, processor, country_code) FROM stdin;
1	1	PLN_4254CCA0E62EA21056D5	450000	NGN	paid	PLN_4254CCA0E62EA21056D5	\N	2026-05-07 23:43:31.30312	2026-05-07 23:42:59.233143	paystack	\N
\.


--
-- Data for Name: portfolios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.portfolios (id, user_id, symbol, company_name, shares, avg_buy_price, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: post_votes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.post_votes (id, user_id, post_id, vote_type) FROM stdin;
\.


--
-- Data for Name: price_alerts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.price_alerts (id, user_id, symbol, company_name, target_price, direction, triggered, triggered_at, note, created_at) FROM stdin;
\.


--
-- Data for Name: quiz_attempts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.quiz_attempts (id, user_id, quiz_id, score, passed, attempted_at) FROM stdin;
\.


--
-- Data for Name: quiz_questions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.quiz_questions (id, quiz_id, question, options, correct_answer, explanation) FROM stdin;
1	1	What does buying a stock represent?	["A loan to the company", "Partial ownership of the company", "A tax payment", "A subscription service"]	1	A stock represents partial ownership (equity) in a company.
2	1	Which of these is NOT a benefit of owning stock?	["Dividends", "Capital appreciation", "Guaranteed returns", "Voting rights"]	2	Stocks never guarantee returns — their value can go down.
3	1	Where do stocks get traded?	["Banks only", "Stock exchanges", "Post offices", "Supermarkets"]	1	Stocks are traded on exchanges like NYSE or NASDAQ.
4	2	If you buy a stock at $100 and sell at $150, your capital gain is:	["$50", "$150", "$250", "$100"]	0	Capital gain = Selling price − Purchase price = 150 − 100 = $50.
5	2	Long-term capital gains are typically:	["Taxed higher than short-term", "Taxed lower than short-term", "Not taxed at all", "Taxed the same"]	1	Long-term gains (held > 1 year) are typically taxed at lower rates.
6	3	Net income appears at the ___ of the income statement:	["Top", "Middle", "Bottom", "Side"]	2	Net income is called the "bottom line" because it sits at the bottom.
7	11	On a green candlestick, the close price is:	["Below the open", "Above the open", "Equal to the open", "Always the daily low"]	1	Green candles signal closing higher than opening — buyers won.
8	9	A "support" level on a chart is:	["A price ceiling", "A price floor where buyers tend to step in", "A trading commission", "A government regulation"]	1	Support is a price level where buying interest historically prevents further decline.
9	10	An RSI reading above 70 typically suggests:	["The stock is undervalued", "The stock may be overbought", "Trading should stop", "Strong dividend coming"]	1	RSI > 70 is the classic "overbought" zone — momentum has been strong, and a pullback often follows.
10	10	A "golden cross" occurs when:	["A stock pays a special dividend", "The 50-day MA crosses above the 200-day MA", "The market closes early", "Volume spikes"]	1	A golden cross is a long-term bullish signal — short-term momentum has overtaken long-term.
11	4	Which approach generally produces the best long-term investment results?	["Trying to time market tops and bottoms", "A disciplined, diversified, long-term approach", "Following social media tips", "Concentrating all money in one hot stock"]	1	Decades of evidence: discipline, diversification, and patience consistently outperform speculation.
12	5	Which approach generally produces the best long-term investment results?	["Trying to time market tops and bottoms", "A disciplined, diversified, long-term approach", "Following social media tips", "Concentrating all money in one hot stock"]	1	Decades of evidence: discipline, diversification, and patience consistently outperform speculation.
13	6	Which approach generally produces the best long-term investment results?	["Trying to time market tops and bottoms", "A disciplined, diversified, long-term approach", "Following social media tips", "Concentrating all money in one hot stock"]	1	Decades of evidence: discipline, diversification, and patience consistently outperform speculation.
14	7	Which approach generally produces the best long-term investment results?	["Trying to time market tops and bottoms", "A disciplined, diversified, long-term approach", "Following social media tips", "Concentrating all money in one hot stock"]	1	Decades of evidence: discipline, diversification, and patience consistently outperform speculation.
15	8	Which approach generally produces the best long-term investment results?	["Trying to time market tops and bottoms", "A disciplined, diversified, long-term approach", "Following social media tips", "Concentrating all money in one hot stock"]	1	Decades of evidence: discipline, diversification, and patience consistently outperform speculation.
16	3	What is the most important rule of investing?	["Always buy at the bottom", "Don't lose money — manage risk first", "Borrow to amplify gains", "Trade as often as possible"]	1	Warren Buffett's rule #1: don't lose money. Capital preservation is the foundation of long-term success.
17	4	What is the most important rule of investing?	["Always buy at the bottom", "Don't lose money — manage risk first", "Borrow to amplify gains", "Trade as often as possible"]	1	Warren Buffett's rule #1: don't lose money. Capital preservation is the foundation of long-term success.
18	5	What is the most important rule of investing?	["Always buy at the bottom", "Don't lose money — manage risk first", "Borrow to amplify gains", "Trade as often as possible"]	1	Warren Buffett's rule #1: don't lose money. Capital preservation is the foundation of long-term success.
19	6	What is the most important rule of investing?	["Always buy at the bottom", "Don't lose money — manage risk first", "Borrow to amplify gains", "Trade as often as possible"]	1	Warren Buffett's rule #1: don't lose money. Capital preservation is the foundation of long-term success.
20	7	What is the most important rule of investing?	["Always buy at the bottom", "Don't lose money — manage risk first", "Borrow to amplify gains", "Trade as often as possible"]	1	Warren Buffett's rule #1: don't lose money. Capital preservation is the foundation of long-term success.
21	8	What is the most important rule of investing?	["Always buy at the bottom", "Don't lose money — manage risk first", "Borrow to amplify gains", "Trade as often as possible"]	1	Warren Buffett's rule #1: don't lose money. Capital preservation is the foundation of long-term success.
22	9	What is the most important rule of investing?	["Always buy at the bottom", "Don't lose money — manage risk first", "Borrow to amplify gains", "Trade as often as possible"]	1	Warren Buffett's rule #1: don't lose money. Capital preservation is the foundation of long-term success.
23	11	What is the most important rule of investing?	["Always buy at the bottom", "Don't lose money — manage risk first", "Borrow to amplify gains", "Trade as often as possible"]	1	Warren Buffett's rule #1: don't lose money. Capital preservation is the foundation of long-term success.
24	2	Diversification helps you because:	["It guarantees profits", "It reduces the risk of any single stock destroying your portfolio", "It eliminates all risk", "It's required by law"]	1	Diversification doesn't eliminate risk but reduces the impact of any single bad outcome.
25	3	Diversification helps you because:	["It guarantees profits", "It reduces the risk of any single stock destroying your portfolio", "It eliminates all risk", "It's required by law"]	1	Diversification doesn't eliminate risk but reduces the impact of any single bad outcome.
26	4	Diversification helps you because:	["It guarantees profits", "It reduces the risk of any single stock destroying your portfolio", "It eliminates all risk", "It's required by law"]	1	Diversification doesn't eliminate risk but reduces the impact of any single bad outcome.
27	5	Diversification helps you because:	["It guarantees profits", "It reduces the risk of any single stock destroying your portfolio", "It eliminates all risk", "It's required by law"]	1	Diversification doesn't eliminate risk but reduces the impact of any single bad outcome.
28	6	Diversification helps you because:	["It guarantees profits", "It reduces the risk of any single stock destroying your portfolio", "It eliminates all risk", "It's required by law"]	1	Diversification doesn't eliminate risk but reduces the impact of any single bad outcome.
29	7	Diversification helps you because:	["It guarantees profits", "It reduces the risk of any single stock destroying your portfolio", "It eliminates all risk", "It's required by law"]	1	Diversification doesn't eliminate risk but reduces the impact of any single bad outcome.
30	8	Diversification helps you because:	["It guarantees profits", "It reduces the risk of any single stock destroying your portfolio", "It eliminates all risk", "It's required by law"]	1	Diversification doesn't eliminate risk but reduces the impact of any single bad outcome.
31	9	Diversification helps you because:	["It guarantees profits", "It reduces the risk of any single stock destroying your portfolio", "It eliminates all risk", "It's required by law"]	1	Diversification doesn't eliminate risk but reduces the impact of any single bad outcome.
32	10	Diversification helps you because:	["It guarantees profits", "It reduces the risk of any single stock destroying your portfolio", "It eliminates all risk", "It's required by law"]	1	Diversification doesn't eliminate risk but reduces the impact of any single bad outcome.
33	11	Diversification helps you because:	["It guarantees profits", "It reduces the risk of any single stock destroying your portfolio", "It eliminates all risk", "It's required by law"]	1	Diversification doesn't eliminate risk but reduces the impact of any single bad outcome.
\.


--
-- Data for Name: quizzes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.quizzes (id, lesson_id, title, passing_score) FROM stdin;
1	1	What is a Stock? — Quick Quiz	70
2	4	Capital Gains Quiz	70
3	7	Income Statement Quiz	70
4	2	Knowledge check: How the Stock Market Works	70
5	3	Knowledge check: Bull vs Bear Market	70
6	5	Knowledge check: Dividends: Passive Income from Stocks	70
7	6	Knowledge check: The Power of Compounding	70
8	8	Knowledge check: Key Financial Ratios	70
9	10	Knowledge check: Support & Resistance	70
10	11	Knowledge check: Moving Averages & RSI	70
11	9	Knowledge check: Reading Candlestick Charts	70
\.


--
-- Data for Name: session_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.session_types (id, key, name, duration_minutes, price_kobo, currency, description, features, premium_only, icon, color, enabled, sort_order) FROM stdin;
1	quick	30-min Quick Session	30	500000	NGN	A focused 30 minutes to get one specific question answered — a chart breakdown, a concept you're stuck on, or feedback on your paper-trading portfolio.	["30 minutes 1-on-1", "1 chart or topic deep-dive", "Recording on request", "Educational only"]	f	⚡	from-sun-300 to-sun-500	t	1
2	deep	1-hour Deep Dive	60	1000000	NGN	A full hour to walk through fundamental + technical analysis on a ticker you care about, review your portfolio structure, and build a learning plan.	["60 minutes 1-on-1", "Chart + fundamentals walkthrough", "Portfolio review", "Follow-up notes", "Recording included"]	f	📈	from-bull-400 to-bull-600	t	2
3	weekly	Weekly Mentorship (4 weeks)	240	3500000	NGN	Four weekly 1-hour sessions + ongoing chat support over one month. For students who want structured, accountable progress.	["4 × 60-minute sessions", "Async chat support between sessions", "Personalised learning plan", "Priority scheduling", "Educational only — not managed advice"]	t	🏆	from-coral-400 to-coral-600	t	3
\.


--
-- Data for Name: stock_quotes_cache; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stock_quotes_cache (symbol, price, change_pct, high, low, open, prev_close, volume, cached_at) FROM stdin;
\.


--
-- Data for Name: stock_views; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stock_views (id, user_id, symbol, viewed_at) FROM stdin;
1	1	AAPL	2026-05-07 23:42:36.711058
2	1	AAPL	2026-05-07 23:42:36.728374
\.


--
-- Data for Name: stocks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stocks (id, symbol, display_symbol, name, exchange, country, currency, sector, industry, logo_url, is_active, last_price, prev_close, day_change_pct, market_cap_millions, shares_outstanding_millions, pe_ratio, pb_ratio, ps_ratio, ev_ebitda, peg_ratio, dividend_yield, eps, roe, roa, gross_margin, net_margin, debt_to_equity, current_ratio, revenue_growth_yoy, earnings_growth_yoy, beta, volatility_30d, volatility_1y, max_drawdown_1y, avg_daily_volume_millions, return_1m, return_3m, return_6m, return_1y, high_52w, low_52w, data_updated_at, created_at) FROM stdin;
1	NGX:DANGCEM	DANGCEM	Dangote Cement PLC	NGX	NG	NGN	Materials	Cement	\N	t	480.5000	475.0000	\N	8180000.00	\N	9.20	\N	\N	\N	\N	0.0350	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
2	NGX:MTNN	MTNN	MTN Nigeria Communications PLC	NGX	NG	NGN	Communication	Telecom	\N	t	245.0000	240.0000	\N	4990000.00	\N	15.80	\N	\N	\N	\N	0.0420	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
3	NGX:AIRTELAFRI	AIRTELAFRI	Airtel Africa PLC	NGX	NG	NGN	Communication	Telecom	\N	t	2150.0000	2120.0000	\N	8070000.00	\N	21.50	\N	\N	\N	\N	0.0280	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
4	NGX:GTCO	GTCO	Guaranty Trust Holding Co PLC	NGX	NG	NGN	Financial	Banking	\N	t	42.5000	41.9000	\N	1250000.00	\N	3.80	\N	\N	\N	\N	0.0940	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
5	NGX:ZENITHBANK	ZENITHBANK	Zenith Bank PLC	NGX	NG	NGN	Financial	Banking	\N	t	36.2000	35.8000	\N	1137000.00	\N	3.20	\N	\N	\N	\N	0.1020	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
6	NGX:UBA	UBA	United Bank for Africa PLC	NGX	NG	NGN	Financial	Banking	\N	t	25.4000	25.1000	\N	869000.00	\N	2.80	\N	\N	\N	\N	0.1120	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
7	NGX:ACCESSCORP	ACCESSCORP	Access Holdings PLC	NGX	NG	NGN	Financial	Banking	\N	t	18.8000	18.5000	\N	669000.00	\N	2.50	\N	\N	\N	\N	0.1280	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
8	NGX:FBNH	FBNH	FBN Holdings PLC	NGX	NG	NGN	Financial	Banking	\N	t	29.5000	29.2000	\N	1058000.00	\N	3.40	\N	\N	\N	\N	0.0880	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
9	NGX:SEPLAT	SEPLAT	Seplat Energy PLC	NGX	NG	NGN	Energy	Oil & Gas	\N	t	3850.0000	3800.0000	\N	2265000.00	\N	6.50	\N	\N	\N	\N	0.0650	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
10	NGX:NESTLE	NESTLE	Nestle Nigeria PLC	NGX	NG	NGN	Consumer Staples	Food	\N	t	1180.0000	1170.0000	\N	935000.00	\N	24.20	\N	\N	\N	\N	0.0180	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
11	NGX:BUACEMENT	BUACEMENT	BUA Cement PLC	NGX	NG	NGN	Materials	Cement	\N	t	98.5000	97.2000	\N	3336000.00	\N	11.40	\N	\N	\N	\N	0.0395	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
12	NGX:BUAFOODS	BUAFOODS	BUA Foods PLC	NGX	NG	NGN	Consumer Staples	Food	\N	t	385.0000	380.0000	\N	6930000.00	\N	18.50	\N	\N	\N	\N	0.0210	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
13	NGX:TRANSCORP	TRANSCORP	Transnational Corporation PLC	NGX	NG	NGN	Industrial	Conglomerate	\N	t	48.2000	47.6000	\N	490000.00	\N	12.80	\N	\N	\N	\N	0.0310	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
14	NGX:TRANSCOHOT	TRANSCOHOT	Transcorp Hotels PLC	NGX	NG	NGN	Consumer Discretionary	Hotels	\N	t	125.0000	123.0000	\N	1283000.00	\N	22.10	\N	\N	\N	\N	0.0150	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
15	NGX:OANDO	OANDO	Oando PLC	NGX	NG	NGN	Energy	Oil & Gas	\N	t	58.4000	57.8000	\N	725000.00	\N	8.20	\N	\N	\N	\N	0.0000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
16	NGX:STANBIC	STANBIC	Stanbic IBTC Holdings PLC	NGX	NG	NGN	Financial	Banking	\N	t	72.5000	71.9000	\N	939000.00	\N	4.10	\N	\N	\N	\N	0.0740	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
17	NGX:FIDELITYBK	FIDELITYBK	Fidelity Bank PLC	NGX	NG	NGN	Financial	Banking	\N	t	17.8000	17.6000	\N	569000.00	\N	2.90	\N	\N	\N	\N	0.1050	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
18	NGX:NB	NB	Nigerian Breweries PLC	NGX	NG	NGN	Consumer Staples	Beverages	\N	t	38.5000	38.0000	\N	1038000.00	\N	30.50	\N	\N	\N	\N	0.0000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
19	NGX:GUINNESS	GUINNESS	Guinness Nigeria PLC	NGX	NG	NGN	Consumer Staples	Beverages	\N	t	62.8000	62.0000	\N	137000.00	\N	45.20	\N	\N	\N	\N	0.0000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
20	NGX:FLOURMILL	FLOURMILL	Flour Mills of Nigeria PLC	NGX	NG	NGN	Consumer Staples	Food	\N	t	73.0000	72.2000	\N	299000.00	\N	12.60	\N	\N	\N	\N	0.0420	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
21	NGX:DANGSUGAR	DANGSUGAR	Dangote Sugar Refinery PLC	NGX	NG	NGN	Consumer Staples	Food	\N	t	36.4000	36.0000	\N	442000.00	\N	9.80	\N	\N	\N	\N	0.0580	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
22	NGX:PRESCO	PRESCO	Presco PLC	NGX	NG	NGN	Consumer Staples	Agriculture	\N	t	485.0000	480.0000	\N	485000.00	\N	10.20	\N	\N	\N	\N	0.0350	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
23	NGX:OKOMUOIL	OKOMUOIL	Okomu Oil Palm PLC	NGX	NG	NGN	Consumer Staples	Agriculture	\N	t	395.0000	390.0000	\N	377000.00	\N	9.50	\N	\N	\N	\N	0.0410	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
24	NGX:LAFARGE	WAPCO	Lafarge Africa PLC	NGX	NG	NGN	Materials	Cement	\N	t	42.8000	42.5000	\N	689000.00	\N	8.50	\N	\N	\N	\N	0.0485	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
25	NGX:NESTLEFO	NESTLEFO	Nestle Foods Nigeria	NGX	NG	NGN	Consumer Staples	Food	\N	t	1180.0000	1170.0000	\N	935000.00	\N	24.20	\N	\N	\N	\N	0.0180	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
26	NGX:FCMB	FCMB	FCMB Group PLC	NGX	NG	NGN	Financial	Banking	\N	t	8.5000	8.4000	\N	167000.00	\N	2.40	\N	\N	\N	\N	0.1170	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
27	NGX:WEMA	WEMA	Wema Bank PLC	NGX	NG	NGN	Financial	Banking	\N	t	9.2000	9.1000	\N	123000.00	\N	3.10	\N	\N	\N	\N	0.0890	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
28	NGX:STERLING	STERLING	Sterling Financial Holdings	NGX	NG	NGN	Financial	Banking	\N	t	4.8000	4.7500	\N	139000.00	\N	2.60	\N	\N	\N	\N	0.0960	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
29	NGX:CUSTODIAN	CUSTODIAN	Custodian Investment PLC	NGX	NG	NGN	Financial	Insurance	\N	t	15.4000	15.2000	\N	91000.00	\N	5.80	\N	\N	\N	\N	0.0780	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
30	NGX:AIICO	AIICO	AIICO Insurance PLC	NGX	NG	NGN	Financial	Insurance	\N	t	1.3500	1.3300	\N	18900.00	\N	4.20	\N	\N	\N	\N	0.0550	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
32	MSFT	MSFT	Microsoft Corporation	NASDAQ	US	USD	Technology	Software	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
33	GOOGL	GOOGL	Alphabet Inc.	NASDAQ	US	USD	Communication	Internet	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
34	AMZN	AMZN	Amazon.com Inc.	NASDAQ	US	USD	Consumer Discretionary	E-commerce	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
35	NVDA	NVDA	NVIDIA Corporation	NASDAQ	US	USD	Technology	Semiconductors	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
36	META	META	Meta Platforms Inc.	NASDAQ	US	USD	Communication	Social Media	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
37	TSLA	TSLA	Tesla Inc.	NASDAQ	US	USD	Consumer Discretionary	Automotive	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
38	NFLX	NFLX	Netflix Inc.	NASDAQ	US	USD	Communication	Streaming	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
39	BRK.B	BRK.B	Berkshire Hathaway	NYSE	US	USD	Financial	Diversified	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
40	JPM	JPM	JPMorgan Chase & Co.	NYSE	US	USD	Financial	Banking	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
41	V	V	Visa Inc.	NYSE	US	USD	Financial	Payments	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
42	MA	MA	Mastercard Incorporated	NYSE	US	USD	Financial	Payments	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
43	JNJ	JNJ	Johnson & Johnson	NYSE	US	USD	Healthcare	Pharmaceuticals	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
44	UNH	UNH	UnitedHealth Group	NYSE	US	USD	Healthcare	Insurance	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
45	LLY	LLY	Eli Lilly and Company	NYSE	US	USD	Healthcare	Pharmaceuticals	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
46	PG	PG	Procter & Gamble	NYSE	US	USD	Consumer Staples	Household	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
47	KO	KO	The Coca-Cola Company	NYSE	US	USD	Consumer Staples	Beverages	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
48	PEP	PEP	PepsiCo Inc.	NASDAQ	US	USD	Consumer Staples	Beverages	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
49	WMT	WMT	Walmart Inc.	NYSE	US	USD	Consumer Staples	Retail	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
50	DIS	DIS	The Walt Disney Company	NYSE	US	USD	Communication	Media	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
51	XOM	XOM	Exxon Mobil Corporation	NYSE	US	USD	Energy	Oil & Gas	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
52	CVX	CVX	Chevron Corporation	NYSE	US	USD	Energy	Oil & Gas	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
53	BA	BA	The Boeing Company	NYSE	US	USD	Industrial	Aerospace	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
54	CAT	CAT	Caterpillar Inc.	NYSE	US	USD	Industrial	Machinery	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
55	HD	HD	The Home Depot	NYSE	US	USD	Consumer Discretionary	Retail	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-07 23:11:09.585009
31	AAPL	AAPL	Apple Inc.	NASDAQ	US	USD	Technology	Consumer Electronics	\N	t	\N	\N	\N	4219090.00	\N	37.67	50.98	10.14	\N	\N	0.0038	7.47	1.4669	0.3402	0.4786	0.2715	\N	0.89	0.1276	0.2901	1.066	\N	\N	\N	50.92	0.0596	\N	\N	0.4483	288.6200	193.2500	2026-05-07 23:42:36.706288	2026-05-07 23:11:09.585009
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.transactions (id, user_id, symbol, company_name, transaction_type, shares, price_per_share, total_amount, created_at) FROM stdin;
\.


--
-- Data for Name: tutor_availability; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tutor_availability (id, day_of_week, start_time, end_time, enabled) FROM stdin;
1	1	18:00:00	22:00:00	t
2	2	18:00:00	22:00:00	t
3	3	18:00:00	22:00:00	t
4	4	18:00:00	22:00:00	t
5	5	18:00:00	22:00:00	t
\.


--
-- Data for Name: user_achievements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_achievements (id, user_id, achievement_id, earned_at) FROM stdin;
\.


--
-- Data for Name: user_progress; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_progress (id, user_id, lesson_id, completed, completed_at) FROM stdin;
1	1	2	f	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, uuid, username, email, password_hash, google_id, avatar_url, full_name, auth_provider, is_verified, bio, experience_level, virtual_balance, total_xp, created_at, updated_at, plan, plan_started_at, plan_expires_at, is_admin, is_banned, banned_reason, banned_at, banned_by, last_login_at) FROM stdin;
1	79b81257-3119-47ba-87f0-7eebad6adc80	sanij	ake@gmail.com	$2a$12$9xLdzCZEkp.iKhkfANkeaOe7.SzDtb8WMUvHbDxbtqdkWSQs9qKBy	\N	\N	san ak	local	f	\N	beginner	100000.00	0	2026-05-07 23:41:35.09407	2026-05-07 23:41:35.09407	premium	2026-05-07 23:43:31.30312	2026-06-07 23:43:31.302	f	f	\N	\N	\N	2026-05-07 23:41:35.09407
\.


--
-- Data for Name: watchlist; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.watchlist (id, user_id, symbol, company_name, added_at, note) FROM stdin;
\.


--
-- Name: achievements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.achievements_id_seq', 6, true);


--
-- Name: admin_audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_audit_log_id_seq', 1, false);


--
-- Name: affiliate_clicks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.affiliate_clicks_id_seq', 1, false);


--
-- Name: bookings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bookings_id_seq', 1, false);


--
-- Name: brokers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.brokers_id_seq', 5, true);


--
-- Name: courses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.courses_id_seq', 6, true);


--
-- Name: forum_comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.forum_comments_id_seq', 1, false);


--
-- Name: forum_posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.forum_posts_id_seq', 1, false);


--
-- Name: lessons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lessons_id_seq', 13, true);


--
-- Name: plan_upgrades_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.plan_upgrades_id_seq', 1, true);


--
-- Name: portfolios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.portfolios_id_seq', 1, false);


--
-- Name: post_votes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.post_votes_id_seq', 1, false);


--
-- Name: price_alerts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.price_alerts_id_seq', 1, false);


--
-- Name: quiz_attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.quiz_attempts_id_seq', 1, false);


--
-- Name: quiz_questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.quiz_questions_id_seq', 33, true);


--
-- Name: quizzes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.quizzes_id_seq', 11, true);


--
-- Name: session_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.session_types_id_seq', 3, true);


--
-- Name: stock_views_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stock_views_id_seq', 2, true);


--
-- Name: stocks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stocks_id_seq', 55, true);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.transactions_id_seq', 1, false);


--
-- Name: tutor_availability_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tutor_availability_id_seq', 5, true);


--
-- Name: user_achievements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_achievements_id_seq', 1, false);


--
-- Name: user_progress_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_progress_id_seq', 2, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: watchlist_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.watchlist_id_seq', 1, false);


--
-- Name: achievements achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_pkey PRIMARY KEY (id);


--
-- Name: admin_audit_log admin_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log
    ADD CONSTRAINT admin_audit_log_pkey PRIMARY KEY (id);


--
-- Name: affiliate_clicks affiliate_clicks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_clicks
    ADD CONSTRAINT affiliate_clicks_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_reference_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_reference_key UNIQUE (reference);


--
-- Name: brokers brokers_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brokers
    ADD CONSTRAINT brokers_key_key UNIQUE (key);


--
-- Name: brokers brokers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brokers
    ADD CONSTRAINT brokers_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: courses courses_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_slug_key UNIQUE (slug);


--
-- Name: forum_comments forum_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_comments
    ADD CONSTRAINT forum_comments_pkey PRIMARY KEY (id);


--
-- Name: forum_posts forum_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_posts
    ADD CONSTRAINT forum_posts_pkey PRIMARY KEY (id);


--
-- Name: lessons lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);


--
-- Name: plan_upgrades plan_upgrades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_upgrades
    ADD CONSTRAINT plan_upgrades_pkey PRIMARY KEY (id);


--
-- Name: plan_upgrades plan_upgrades_reference_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_upgrades
    ADD CONSTRAINT plan_upgrades_reference_key UNIQUE (reference);


--
-- Name: portfolios portfolios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolios
    ADD CONSTRAINT portfolios_pkey PRIMARY KEY (id);


--
-- Name: portfolios portfolios_user_id_symbol_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolios
    ADD CONSTRAINT portfolios_user_id_symbol_key UNIQUE (user_id, symbol);


--
-- Name: post_votes post_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_votes
    ADD CONSTRAINT post_votes_pkey PRIMARY KEY (id);


--
-- Name: post_votes post_votes_user_id_post_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_votes
    ADD CONSTRAINT post_votes_user_id_post_id_key UNIQUE (user_id, post_id);


--
-- Name: price_alerts price_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_alerts
    ADD CONSTRAINT price_alerts_pkey PRIMARY KEY (id);


--
-- Name: quiz_attempts quiz_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_pkey PRIMARY KEY (id);


--
-- Name: quiz_questions quiz_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_pkey PRIMARY KEY (id);


--
-- Name: quizzes quizzes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_pkey PRIMARY KEY (id);


--
-- Name: session_types session_types_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_types
    ADD CONSTRAINT session_types_key_key UNIQUE (key);


--
-- Name: session_types session_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_types
    ADD CONSTRAINT session_types_pkey PRIMARY KEY (id);


--
-- Name: stock_quotes_cache stock_quotes_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_quotes_cache
    ADD CONSTRAINT stock_quotes_cache_pkey PRIMARY KEY (symbol);


--
-- Name: stock_views stock_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_views
    ADD CONSTRAINT stock_views_pkey PRIMARY KEY (id);


--
-- Name: stocks stocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocks
    ADD CONSTRAINT stocks_pkey PRIMARY KEY (id);


--
-- Name: stocks stocks_symbol_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocks
    ADD CONSTRAINT stocks_symbol_key UNIQUE (symbol);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: tutor_availability tutor_availability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutor_availability
    ADD CONSTRAINT tutor_availability_pkey PRIMARY KEY (id);


--
-- Name: lessons unique_slug; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT unique_slug UNIQUE (slug);


--
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id);


--
-- Name: user_achievements user_achievements_user_id_achievement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_achievement_id_key UNIQUE (user_id, achievement_id);


--
-- Name: user_progress user_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_progress
    ADD CONSTRAINT user_progress_pkey PRIMARY KEY (id);


--
-- Name: user_progress user_progress_user_id_lesson_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_progress
    ADD CONSTRAINT user_progress_user_id_lesson_id_key UNIQUE (user_id, lesson_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_google_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_key UNIQUE (google_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: users users_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_uuid_key UNIQUE (uuid);


--
-- Name: watchlist watchlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watchlist
    ADD CONSTRAINT watchlist_pkey PRIMARY KEY (id);


--
-- Name: watchlist watchlist_user_id_symbol_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watchlist
    ADD CONSTRAINT watchlist_user_id_symbol_key UNIQUE (user_id, symbol);


--
-- Name: idx_alerts_symbol; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alerts_symbol ON public.price_alerts USING btree (symbol);


--
-- Name: idx_alerts_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alerts_user ON public.price_alerts USING btree (user_id);


--
-- Name: idx_audit_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_admin_id ON public.admin_audit_log USING btree (admin_id);


--
-- Name: idx_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_created ON public.admin_audit_log USING btree (created_at DESC);


--
-- Name: idx_audit_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_target ON public.admin_audit_log USING btree (target_type, target_id);


--
-- Name: idx_bookings_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_date ON public.bookings USING btree (session_date, start_time);


--
-- Name: idx_bookings_processor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_processor ON public.bookings USING btree (processor);


--
-- Name: idx_bookings_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_ref ON public.bookings USING btree (reference);


--
-- Name: idx_bookings_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_user ON public.bookings USING btree (user_id);


--
-- Name: idx_comments_removed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_removed ON public.forum_comments USING btree (is_removed);


--
-- Name: idx_plan_upgrades_processor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_upgrades_processor ON public.plan_upgrades USING btree (processor);


--
-- Name: idx_plan_upgrades_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_upgrades_ref ON public.plan_upgrades USING btree (reference);


--
-- Name: idx_plan_upgrades_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_upgrades_user ON public.plan_upgrades USING btree (user_id);


--
-- Name: idx_posts_removed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_removed ON public.forum_posts USING btree (is_removed);


--
-- Name: idx_stock_views_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_views_user_date ON public.stock_views USING btree (user_id, viewed_at);


--
-- Name: idx_stocks_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stocks_country ON public.stocks USING btree (country);


--
-- Name: idx_stocks_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stocks_search ON public.stocks USING gin (to_tsvector('simple'::regconfig, (((display_symbol)::text || ' '::text) || (name)::text)));


--
-- Name: idx_stocks_sector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stocks_sector ON public.stocks USING btree (sector);


--
-- Name: idx_stocks_symbol; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stocks_symbol ON public.stocks USING btree (symbol);


--
-- Name: idx_users_banned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_banned ON public.users USING btree (is_banned) WHERE (is_banned = true);


--
-- Name: idx_users_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_created_at ON public.users USING btree (created_at DESC);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_google; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_google ON public.users USING btree (google_id);


--
-- Name: idx_users_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_plan ON public.users USING btree (plan);


--
-- Name: uq_booking_confirmed_slot; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_booking_confirmed_slot ON public.bookings USING btree (session_date, start_time) WHERE (((payment_status)::text = 'paid'::text) OR ((status)::text = 'confirmed'::text));


--
-- Name: admin_audit_log admin_audit_log_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log
    ADD CONSTRAINT admin_audit_log_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: affiliate_clicks affiliate_clicks_broker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_clicks
    ADD CONSTRAINT affiliate_clicks_broker_id_fkey FOREIGN KEY (broker_id) REFERENCES public.brokers(id) ON DELETE SET NULL;


--
-- Name: affiliate_clicks affiliate_clicks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_clicks
    ADD CONSTRAINT affiliate_clicks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_session_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_session_type_id_fkey FOREIGN KEY (session_type_id) REFERENCES public.session_types(id);


--
-- Name: bookings bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: forum_comments forum_comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_comments
    ADD CONSTRAINT forum_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.forum_posts(id) ON DELETE CASCADE;


--
-- Name: forum_comments forum_comments_removed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_comments
    ADD CONSTRAINT forum_comments_removed_by_fkey FOREIGN KEY (removed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: forum_comments forum_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_comments
    ADD CONSTRAINT forum_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: forum_posts forum_posts_removed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_posts
    ADD CONSTRAINT forum_posts_removed_by_fkey FOREIGN KEY (removed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: forum_posts forum_posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_posts
    ADD CONSTRAINT forum_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: lessons lessons_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: plan_upgrades plan_upgrades_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_upgrades
    ADD CONSTRAINT plan_upgrades_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: portfolios portfolios_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolios
    ADD CONSTRAINT portfolios_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: post_votes post_votes_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_votes
    ADD CONSTRAINT post_votes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.forum_posts(id) ON DELETE CASCADE;


--
-- Name: post_votes post_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_votes
    ADD CONSTRAINT post_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: price_alerts price_alerts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_alerts
    ADD CONSTRAINT price_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: quiz_attempts quiz_attempts_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;


--
-- Name: quiz_attempts quiz_attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: quiz_questions quiz_questions_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;


--
-- Name: quizzes quizzes_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: stock_quotes_cache stock_quotes_cache_symbol_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_quotes_cache
    ADD CONSTRAINT stock_quotes_cache_symbol_fkey FOREIGN KEY (symbol) REFERENCES public.stocks(symbol) ON DELETE CASCADE;


--
-- Name: stock_views stock_views_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_views
    ADD CONSTRAINT stock_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_achievement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id) ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_progress user_progress_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_progress
    ADD CONSTRAINT user_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: user_progress user_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_progress
    ADD CONSTRAINT user_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_banned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_banned_by_fkey FOREIGN KEY (banned_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: watchlist watchlist_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watchlist
    ADD CONSTRAINT watchlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict ZlYrWv7T8Gv6XPwhnj8tgcjr1KjQNsHv6ek1oQBzQ4fd4PRpoi7tmxwdQEJPX2Q

