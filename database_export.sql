--
-- PostgreSQL database dump
--

-- Dumped from database version 18.2
-- Dumped by pg_dump version 18.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: BillingType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BillingType" AS ENUM (
    'Prepaid',
    'Postpaid'
);


--
-- Name: CreditTransactionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CreditTransactionType" AS ENUM (
    'topup',
    'deduction'
);


--
-- Name: OcrBatchStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OcrBatchStatus" AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed'
);


--
-- Name: RecordType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RecordType" AS ENUM (
    'Individual',
    'Company'
);


--
-- Name: SubDomainStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SubDomainStatus" AS ENUM (
    'Active',
    'Inactive'
);


--
-- Name: UnlockRequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UnlockRequestStatus" AS ENUM (
    'pending',
    'approved',
    'denied'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    action character varying(100) NOT NULL,
    module character varying(100) NOT NULL,
    "recordId" integer NOT NULL,
    "ipAddress" character varying(45) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id integer NOT NULL,
    "clientCode" character varying(50) NOT NULL,
    name character varying(150) NOT NULL,
    "clientGroup" character varying(100),
    website character varying(255),
    street character varying(255),
    barangay character varying(150),
    city character varying(150),
    province character varying(150),
    "postalCode" character varying(20),
    telephone character varying(50),
    fax character varying(50),
    mobile character varying(50),
    email character varying(150),
    "billingType" public."BillingType" DEFAULT 'Postpaid'::public."BillingType" NOT NULL,
    "creditBalance" numeric(12,2) DEFAULT 0 NOT NULL,
    "creditLimit" numeric(12,2),
    "isActive" smallint DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- Name: credit_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_transactions (
    id integer NOT NULL,
    "clientId" integer NOT NULL,
    amount numeric(12,2) NOT NULL,
    type public."CreditTransactionType" NOT NULL,
    description character varying(255),
    "performedBy" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: credit_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.credit_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: credit_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.credit_transactions_id_seq OWNED BY public.credit_transactions.id;


--
-- Name: lock_histories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lock_histories (
    id integer NOT NULL,
    "recordId" integer NOT NULL,
    "lockedBy" integer NOT NULL,
    action character varying(50) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: lock_histories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lock_histories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lock_histories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lock_histories_id_seq OWNED BY public.lock_histories.id;


--
-- Name: negative_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.negative_records (
    id integer NOT NULL,
    type public."RecordType" NOT NULL,
    "firstName" character varying(120),
    "middleName" character varying(120),
    "lastName" character varying(120),
    "companyName" character varying(200),
    details text,
    source character varying(255),
    "ocrBatchId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    alias character varying(120),
    bounce character varying(100),
    branch character varying(150),
    "caseNo" character varying(100),
    "caseType" character varying(100),
    city character varying(150),
    "courtType" character varying(100),
    "dateFiled" timestamp(3) without time zone,
    decline character varying(100),
    delinquent character varying(100),
    "isScanned" smallint DEFAULT 0 NOT NULL,
    "isScannedCsv" smallint DEFAULT 0 NOT NULL,
    "isScannedPdf" smallint DEFAULT 0 NOT NULL,
    plaintiff character varying(200),
    telecom character varying(100),
    watch character varying(100)
);


--
-- Name: negative_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.negative_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: negative_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.negative_records_id_seq OWNED BY public.negative_records.id;


--
-- Name: news; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.news (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    "imageUrl" character varying(500),
    "createdBy" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: news_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.news_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: news_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.news_id_seq OWNED BY public.news.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    "isRead" smallint DEFAULT 0 NOT NULL,
    "relatedId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: ocr_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ocr_batches (
    id integer NOT NULL,
    "fileName" character varying(255) NOT NULL,
    "filePath" character varying(500) NOT NULL,
    status public."OcrBatchStatus" DEFAULT 'pending'::public."OcrBatchStatus" NOT NULL,
    "totalRecords" integer DEFAULT 0 NOT NULL,
    "uploadedBy" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ocr_batches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ocr_batches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ocr_batches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ocr_batches_id_seq OWNED BY public.ocr_batches.id;


--
-- Name: record_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.record_locks (
    id integer NOT NULL,
    "recordId" integer NOT NULL,
    "lockedBy" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "lockedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: record_locks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.record_locks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: record_locks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.record_locks_id_seq OWNED BY public.record_locks.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: search_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.search_logs (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "clientId" integer NOT NULL,
    "searchType" public."RecordType" NOT NULL,
    "searchTerm" character varying(255) NOT NULL,
    "isBilled" smallint DEFAULT 1 NOT NULL,
    fee numeric(10,2) DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: search_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.search_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: search_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.search_logs_id_seq OWNED BY public.search_logs.id;


--
-- Name: sub_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sub_domains (
    id integer NOT NULL,
    "clientCode" character varying(50),
    "clientId" integer NOT NULL,
    name character varying(150) NOT NULL,
    status public."SubDomainStatus" DEFAULT 'Active'::public."SubDomainStatus" NOT NULL,
    "isDeleted" smallint DEFAULT 0 NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "deletedBy" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: sub_domains_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sub_domains_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sub_domains_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sub_domains_id_seq OWNED BY public.sub_domains.id;


--
-- Name: unlock_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unlock_requests (
    id integer NOT NULL,
    "requestedBy" integer NOT NULL,
    "recordId" integer NOT NULL,
    status public."UnlockRequestStatus" DEFAULT 'pending'::public."UnlockRequestStatus" NOT NULL,
    "reviewedBy" integer,
    "reviewedAt" timestamp(3) without time zone,
    reason text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: unlock_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unlock_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unlock_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unlock_requests_id_seq OWNED BY public.unlock_requests.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(60),
    email character varying(120) NOT NULL,
    "passwordHash" character varying(255) NOT NULL,
    "roleId" integer NOT NULL,
    "clientId" integer,
    "branchId" integer,
    "isApproved" smallint DEFAULT 0 NOT NULL,
    "firstName" character varying(80),
    "middleName" character varying(80),
    "lastName" character varying(80),
    telephone character varying(50),
    "mobileNumber" character varying(50),
    "faxNumber" character varying(50),
    "primaryEmail" character varying(150),
    "alternateEmail1" character varying(150),
    "alternateEmail2" character varying(150),
    "areaHeadManager" character varying(120),
    "areaHeadManagerContact" character varying(50),
    "position" character varying(150),
    department character varying(120),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
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
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: credit_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_transactions ALTER COLUMN id SET DEFAULT nextval('public.credit_transactions_id_seq'::regclass);


--
-- Name: lock_histories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lock_histories ALTER COLUMN id SET DEFAULT nextval('public.lock_histories_id_seq'::regclass);


--
-- Name: negative_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.negative_records ALTER COLUMN id SET DEFAULT nextval('public.negative_records_id_seq'::regclass);


--
-- Name: news id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news ALTER COLUMN id SET DEFAULT nextval('public.news_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: ocr_batches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ocr_batches ALTER COLUMN id SET DEFAULT nextval('public.ocr_batches_id_seq'::regclass);


--
-- Name: record_locks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.record_locks ALTER COLUMN id SET DEFAULT nextval('public.record_locks_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: search_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_logs ALTER COLUMN id SET DEFAULT nextval('public.search_logs_id_seq'::regclass);


--
-- Name: sub_domains id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_domains ALTER COLUMN id SET DEFAULT nextval('public.sub_domains_id_seq'::regclass);


--
-- Name: unlock_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unlock_requests ALTER COLUMN id SET DEFAULT nextval('public.unlock_requests_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, "userId", action, module, "recordId", "ipAddress", "createdAt", "updatedAt") FROM stdin;
1	1	USER_CREATE	users	2	192.168.34.86	2026-02-19 06:30:13.22	2026-02-19 06:30:13.22
2	1	CLIENT_CREATE	clients	1	192.168.34.86	2026-02-19 06:31:12.699	2026-02-19 06:31:12.699
3	1	SUB_DOMAIN_CREATE	sub_domains	1	192.168.34.86	2026-02-19 06:31:23.736	2026-02-19 06:31:23.736
4	1	SUB_DOMAIN_UPDATE	sub_domains	1	192.168.34.86	2026-02-19 06:31:30.551	2026-02-19 06:31:30.551
5	1	USER_CREATE	users	3	192.168.34.86	2026-02-19 06:38:01.174	2026-02-19 06:38:01.174
6	1	RECORD_CREATE	negative_records	1	192.168.34.86	2026-02-19 06:39:09.949	2026-02-19 06:39:09.949
7	1	CREDIT_TOPUP	credit_transactions	1	192.168.34.86	2026-02-19 06:41:19.494	2026-02-19 06:41:19.494
8	2	UNLOCK_REQUEST_CREATE	unlock_requests	1	192.168.34.86	2026-02-24 03:25:06.223	2026-02-24 03:25:06.223
9	1	UNLOCK_REQUEST_APPROVED	unlock_requests	1	192.168.34.86	2026-02-24 03:25:52.862	2026-02-24 03:25:52.862
10	3	RECORD_LOCK_CREATE	record_locks	1	192.168.34.86	2026-02-24 05:13:59.367	2026-02-24 05:13:59.367
11	1	USER_CREATE	users	4	192.168.34.86	2026-02-24 05:15:21.293	2026-02-24 05:15:21.293
12	4	UNLOCK_REQUEST_CREATE	unlock_requests	2	192.168.34.86	2026-02-24 06:47:39.678	2026-02-24 06:47:39.678
13	3	UNLOCK_REQUEST_APPROVED	unlock_requests	2	192.168.34.86	2026-02-24 06:48:47.885	2026-02-24 06:48:47.885
14	1	RECORD_CREATE	negative_records	2	192.168.34.86	2026-02-24 06:54:50.435	2026-02-24 06:54:50.435
15	3	RECORD_LOCK_CREATE	record_locks	2	192.168.34.86	2026-02-24 06:55:04.621	2026-02-24 06:55:04.621
16	4	UNLOCK_REQUEST_CREATE	unlock_requests	3	192.168.34.86	2026-02-24 07:43:41.735	2026-02-24 07:43:41.735
17	3	UNLOCK_REQUEST_APPROVED	unlock_requests	3	192.168.34.86	2026-02-24 07:44:12.008	2026-02-24 07:44:12.008
18	4	UNLOCK_REQUEST_CREATE	unlock_requests	4	192.168.34.86	2026-02-25 02:42:01.322	2026-02-25 02:42:01.322
19	3	RECORD_LOCK_TRANSFER	record_locks	2	192.168.34.86	2026-02-25 02:42:09.544	2026-02-25 02:42:09.544
20	3	UNLOCK_REQUEST_APPROVED	unlock_requests	4	192.168.34.86	2026-02-25 02:42:09.545	2026-02-25 02:42:09.545
21	1	CREDIT_TOPUP	credit_transactions	1	192.168.34.86	2026-02-25 03:56:52.21	2026-02-25 03:56:52.21
22	3	UNLOCK_REQUEST_CREATE	unlock_requests	5	192.168.34.86	2026-02-25 05:02:56.549	2026-02-25 05:02:56.549
23	4	RECORD_LOCK_TRANSFER	record_locks	2	192.168.34.86	2026-02-25 05:03:14.444	2026-02-25 05:03:14.444
24	4	UNLOCK_REQUEST_APPROVED	unlock_requests	5	192.168.34.86	2026-02-25 05:03:14.445	2026-02-25 05:03:14.445
25	3	RECORD_PRINT	negative_records	2	192.168.34.86	2026-02-25 05:34:25.804	2026-02-25 05:34:25.804
26	4	UNLOCK_REQUEST_CREATE	unlock_requests	6	192.168.34.86	2026-02-25 05:35:37.139	2026-02-25 05:35:37.139
27	3	RECORD_LOCK_TRANSFER	record_locks	2	192.168.34.86	2026-02-25 05:36:24.868	2026-02-25 05:36:24.868
28	3	UNLOCK_REQUEST_APPROVED	unlock_requests	6	192.168.34.86	2026-02-25 05:36:24.868	2026-02-25 05:36:24.868
29	4	RECORD_PRINT	negative_records	2	192.168.34.86	2026-02-25 05:36:44.272	2026-02-25 05:36:44.272
30	4	RECORD_PRINT	negative_records	2	192.168.34.86	2026-02-25 05:52:03.282	2026-02-25 05:52:03.282
31	3	UNLOCK_REQUEST_CREATE	unlock_requests	7	192.168.34.86	2026-02-25 05:52:38.048	2026-02-25 05:52:38.048
32	4	RECORD_LOCK_TRANSFER	record_locks	2	192.168.34.86	2026-02-25 06:01:48.1	2026-02-25 06:01:48.1
33	4	UNLOCK_REQUEST_APPROVED	unlock_requests	7	192.168.34.86	2026-02-25 06:01:48.101	2026-02-25 06:01:48.101
34	3	RECORD_PRINT	negative_records	2	192.168.34.86	2026-02-25 06:02:28.753	2026-02-25 06:02:28.753
35	4	UNLOCK_REQUEST_CREATE	unlock_requests	8	192.168.34.86	2026-02-25 06:03:44.514	2026-02-25 06:03:44.514
36	3	RECORD_LOCK_TRANSFER	record_locks	2	192.168.34.86	2026-02-25 06:05:10.591	2026-02-25 06:05:10.591
37	3	UNLOCK_REQUEST_APPROVED	unlock_requests	8	192.168.34.86	2026-02-25 06:05:10.592	2026-02-25 06:05:10.592
38	3	UNLOCK_REQUEST_CREATE	unlock_requests	9	192.168.34.86	2026-02-25 06:17:48.276	2026-02-25 06:17:48.276
39	4	RECORD_LOCK_TRANSFER	record_locks	2	192.168.34.86	2026-02-25 06:35:01.156	2026-02-25 06:35:01.156
40	4	UNLOCK_REQUEST_APPROVED	unlock_requests	9	192.168.34.86	2026-02-25 06:35:01.159	2026-02-25 06:35:01.159
41	3	RECORD_PRINT	negative_records	2	192.168.34.86	2026-02-25 06:36:09.281	2026-02-25 06:36:09.281
42	4	UNLOCK_REQUEST_CREATE	unlock_requests	10	192.168.34.86	2026-02-25 06:36:42.757	2026-02-25 06:36:42.757
43	3	UNLOCK_REQUEST_DENIED	unlock_requests	10	192.168.34.86	2026-02-25 06:38:42.96	2026-02-25 06:38:42.96
44	3	RECORD_PRINT	negative_records	2	192.168.34.86	2026-02-25 06:39:26.81	2026-02-25 06:39:26.81
45	3	RECORD_PRINT	negative_records	2	192.168.34.86	2026-02-25 06:39:43.583	2026-02-25 06:39:43.583
46	3	RECORD_PRINT	negative_records	2	192.168.34.86	2026-02-25 07:10:32.376	2026-02-25 07:10:32.376
47	1	RECORD_CREATE	negative_records	3	192.168.34.86	2026-02-25 07:11:29.473	2026-02-25 07:11:29.473
48	3	RECORD_LOCK_CREATE	record_locks	3	192.168.34.86	2026-02-25 07:11:47.991	2026-02-25 07:11:47.991
49	3	RECORD_PRINT	negative_records	3	192.168.34.86	2026-02-25 07:11:50.396	2026-02-25 07:11:50.396
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clients (id, "clientCode", name, "clientGroup", website, street, barangay, city, province, "postalCode", telephone, fax, mobile, email, "billingType", "creditBalance", "creditLimit", "isActive", "createdAt", "updatedAt") FROM stdin;
1	324	Zorita Frost	Qui qui aut qui sunt	https://www.bikukure.me	Deleniti quia offici	Est reprehenderit a	Proident dicta saep	Dolore ad est esse h	Impedit velit illo 	+1 (232) 989-9764	+1 (787) 698-5881	\N	zyqefab@mailinator.com	Prepaid	1.00	0.00	1	2026-02-19 06:31:12.667	2026-02-25 07:11:50.393
\.


--
-- Data for Name: credit_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.credit_transactions (id, "clientId", amount, type, description, "performedBy", "createdAt", "updatedAt") FROM stdin;
1	1	5.00	topup	Credit top-up of 5	1	2026-02-19 06:41:19.457	2026-02-19 06:41:19.457
2	1	1.00	deduction	Search: Individual - "Amihan bagyo signal"	3	2026-02-19 06:41:25.029	2026-02-19 06:41:25.029
3	1	1.00	deduction	Search: Individual - "Amihan bagyo signal"	3	2026-02-24 05:13:59.37	2026-02-24 05:13:59.37
4	1	1.00	deduction	Search: Individual - "chan chan chan"	3	2026-02-24 06:55:04.624	2026-02-24 06:55:04.624
5	1	1.00	deduction	Search: Individual - "chano chan chan"	4	2026-02-25 02:41:40.865	2026-02-25 02:41:40.865
6	1	10.00	topup	Credit top-up of 10	1	2026-02-25 03:56:52.138	2026-02-25 03:56:52.138
7	1	1.00	deduction	Search: Individual - "chano chano chano"	3	2026-02-25 05:03:42.542	2026-02-25 05:03:42.542
8	1	1.00	deduction	Print Record #2	3	2026-02-25 05:34:25.802	2026-02-25 05:34:25.802
9	1	1.00	deduction	Print Record #2	4	2026-02-25 05:36:44.27	2026-02-25 05:36:44.27
10	1	1.00	deduction	Print Record #2	4	2026-02-25 05:52:03.279	2026-02-25 05:52:03.279
11	1	1.00	deduction	Print Record #2	3	2026-02-25 06:02:28.751	2026-02-25 06:02:28.751
12	1	1.00	deduction	Print Record #2	3	2026-02-25 06:36:09.28	2026-02-25 06:36:09.28
13	1	1.00	deduction	Print Record #2	3	2026-02-25 06:39:26.808	2026-02-25 06:39:26.808
14	1	1.00	deduction	Print Record #2	3	2026-02-25 06:39:43.581	2026-02-25 06:39:43.581
15	1	1.00	deduction	Print Record #2	3	2026-02-25 07:10:32.374	2026-02-25 07:10:32.374
16	1	1.00	deduction	Print Record #3	3	2026-02-25 07:11:50.394	2026-02-25 07:11:50.394
\.


--
-- Data for Name: lock_histories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lock_histories (id, "recordId", "lockedBy", action, "createdAt") FROM stdin;
1	2	4	LOCK_TRANSFERRED	2026-02-25 02:42:09.54
2	2	3	LOCK_TRANSFERRED	2026-02-25 05:03:14.443
3	2	4	LOCK_TRANSFERRED	2026-02-25 05:36:24.865
4	2	3	LOCK_TRANSFERRED	2026-02-25 06:01:48.098
5	2	4	LOCK_TRANSFERRED	2026-02-25 06:05:10.589
6	2	3	LOCK_TRANSFERRED	2026-02-25 06:35:01.153
7	3	3	LOCK_CREATED	2026-02-25 07:11:47.989
\.


--
-- Data for Name: negative_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.negative_records (id, type, "firstName", "middleName", "lastName", "companyName", details, source, "ocrBatchId", "createdAt", "updatedAt", alias, bounce, branch, "caseNo", "caseType", city, "courtType", "dateFiled", decline, delinquent, "isScanned", "isScannedCsv", "isScannedPdf", plaintiff, telecom, watch) FROM stdin;
1	Individual	Amihan	bagyo	signal	\N	\N	\N	\N	2026-02-19 06:39:09.916	2026-02-19 06:39:09.916	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	0	0	\N	\N	\N
2	Individual	chano	chan	chan	\N	aasda	sdf	\N	2026-02-24 06:54:50.401	2026-02-24 06:54:50.401	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	0	0	\N	\N	\N
3	Individual	test	\N	test	\N	werew	rweqr	\N	2026-02-25 07:11:29.471	2026-02-25 07:11:29.471	\N	32wrwraqreqwer	rasdas	24234	3223423	fsadfas	ewrwer	2026-02-25 00:00:00	werwer	werwe	0	0	0	4234234	243234	er
\.


--
-- Data for Name: news; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.news (id, title, content, "imageUrl", "createdBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, "userId", type, title, message, "isRead", "relatedId", "createdAt", "updatedAt") FROM stdin;
1	4	UNLOCK_REQUEST	Access Request Submitted	Your access request for record #2 has been submitted and is pending review.	1	8	2026-02-25 06:03:44.516	2026-02-25 06:04:20.04
2	3	UNLOCK_REQUEST	Access Request Submitted	Your access request for record #2 has been submitted and is pending review.	1	9	2026-02-25 06:17:48.278	2026-02-25 06:34:34.166
3	3	UNLOCK_REQUEST_APPROVED	Access Request Approved	Your access request for "chano chan chan" has been approved by Zorita Frost — pedro Watts. You now have full access to this record.	1	9	2026-02-25 06:35:01.158	2026-02-25 06:35:20.295
4	4	UNLOCK_REQUEST	Access Request Submitted	Your access request for record #2 has been submitted and is pending review.	1	10	2026-02-25 06:36:42.76	2026-02-25 06:38:50.867
6	4	UNLOCK_REQUEST_DENIED	Access Request Denied	Your access request for "chano chan chan" has been denied by Zorita Frost — juan cruz. Reason: "Wala ako pake".	1	10	2026-02-25 06:38:42.959	2026-02-25 06:38:50.867
5	3	UNLOCK_REQUEST_RECEIVED	New Access Request	You have an access request from Zorita Frost — pedro Watts for record #2. Reason: "g"	1	10	2026-02-25 06:36:42.762	2026-02-25 06:38:54.139
\.


--
-- Data for Name: ocr_batches; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ocr_batches (id, "fileName", "filePath", status, "totalRecords", "uploadedBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: record_locks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.record_locks (id, "recordId", "lockedBy", "createdAt", "updatedAt", "lockedAt") FROM stdin;
1	1	3	2026-02-24 05:13:59.365	2026-02-24 05:13:59.365	2026-02-24 16:52:27.226
2	2	3	2026-02-24 06:55:04.62	2026-02-25 06:35:01.152	2026-02-25 06:35:01.151
3	3	3	2026-02-25 07:11:47.954	2026-02-25 07:11:47.954	2026-02-25 07:11:47.952
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roles (id, name, "createdAt", "updatedAt") FROM stdin;
1	Super Admin	2026-02-19 05:51:39.544	2026-02-19 05:51:39.544
2	Admin	2026-02-19 05:51:39.551	2026-02-19 05:51:39.551
3	Affiliate	2026-02-19 05:51:39.552	2026-02-24 08:52:43.076
\.


--
-- Data for Name: search_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.search_logs (id, "userId", "clientId", "searchType", "searchTerm", "isBilled", fee, "createdAt", "updatedAt") FROM stdin;
1	3	1	Individual	amihan bagyo signal	1	1.00	2026-02-19 06:41:25.031	2026-02-19 06:41:25.031
2	3	1	Individual	amihan|bagyo|signal	1	1.00	2026-02-24 05:13:59.373	2026-02-24 05:13:59.373
3	4	1	Individual	amihan|bagyo|signal	0	0.00	2026-02-24 05:16:09.424	2026-02-24 05:16:09.424
4	3	1	Individual	amihan|bagyo|signal	0	0.00	2026-02-24 06:43:43.897	2026-02-24 06:43:43.897
5	4	1	Individual	amihan|bagyo|signal	0	0.00	2026-02-24 06:47:13.317	2026-02-24 06:47:13.317
6	3	1	Individual	amihan|bagyo|signal	0	0.00	2026-02-24 06:53:55.814	2026-02-24 06:53:55.814
7	4	1	Individual	amihan|bagyo|signal	0	0.00	2026-02-24 06:54:14.893	2026-02-24 06:54:14.893
8	3	1	Individual	chan|chan|chan	1	1.00	2026-02-24 06:55:04.626	2026-02-24 06:55:04.626
9	4	1	Individual	chan|chan|chan	0	0.00	2026-02-24 06:55:32.171	2026-02-24 06:55:32.171
10	4	1	Individual	chan|chan|chan	0	0.00	2026-02-24 07:07:17.267	2026-02-24 07:07:17.267
11	3	1	Individual	chan|chan|chan	0	0.00	2026-02-24 07:39:55.122	2026-02-24 07:39:55.122
12	3	1	Individual	chan|chan|chan	0	0.00	2026-02-24 07:41:43.803	2026-02-24 07:41:43.803
13	3	1	Individual	chan|chan|chan	0	0.00	2026-02-24 07:42:32.409	2026-02-24 07:42:32.409
14	4	1	Individual	chan|chan|chan	0	0.00	2026-02-24 07:42:50.999	2026-02-24 07:42:50.999
15	3	1	Individual	chan|chan|chan	0	0.00	2026-02-24 07:43:25.544	2026-02-24 07:43:25.544
16	3	1	Individual	chan|chan|chan	0	0.00	2026-02-24 07:43:54.766	2026-02-24 07:43:54.766
17	4	1	Individual	chan|chan|chan	0	0.00	2026-02-24 07:44:23.553	2026-02-24 07:44:23.553
18	4	1	Individual	chan|chan|chan	0	0.00	2026-02-24 07:44:38.848	2026-02-24 07:44:38.848
19	3	1	Individual	chan|chan|chan	0	0.00	2026-02-24 07:44:49.679	2026-02-24 07:44:49.679
20	3	1	Individual	chan|chan|chan	0	0.00	2026-02-24 07:44:57.792	2026-02-24 07:44:57.792
21	3	1	Individual	chan|chan|chan	0	0.00	2026-02-24 09:25:17.53	2026-02-24 09:25:17.53
22	3	1	Individual	chan|chan|chan	0	0.00	2026-02-24 09:27:42.852	2026-02-24 09:27:42.852
23	3	1	Individual	chan|chan|chan	0	0.00	2026-02-24 09:29:28.973	2026-02-24 09:29:28.973
24	4	1	Individual	chano|chan|chan	1	1.00	2026-02-25 02:41:40.868	2026-02-25 02:41:40.868
25	4	1	Individual	chano|chan|chan	0	0.00	2026-02-25 02:42:46.904	2026-02-25 02:42:46.904
26	3	1	Individual	chano|chan|chan	0	0.00	2026-02-25 05:02:33.709	2026-02-25 05:02:33.709
27	3	1	Individual	chano|chano|chano	1	1.00	2026-02-25 05:03:42.544	2026-02-25 05:03:42.544
28	3	1	Individual	chano|chan|chan	0	0.00	2026-02-25 05:03:55.195	2026-02-25 05:03:55.195
29	3	1	Individual	chano|chan|chan	0	0.00	2026-02-25 05:05:59.861	2026-02-25 05:05:59.861
30	3	1	Individual	chano|chan|chan	0	0.00	2026-02-25 05:34:17.877	2026-02-25 05:34:17.877
31	4	1	Individual	chano|chan|chan	0	0.00	2026-02-25 05:35:07.964	2026-02-25 05:35:07.964
32	3	1	Individual	chano|chan|chan	0	0.00	2026-02-25 05:35:48.116	2026-02-25 05:35:48.116
33	4	1	Individual	chano|chan|chan	0	0.00	2026-02-25 05:36:09.892	2026-02-25 05:36:09.892
34	4	1	Individual	chano|chan|chan	0	0.00	2026-02-25 05:36:36.523	2026-02-25 05:36:36.523
35	4	1	Individual	chano|chan|chan	0	0.00	2026-02-25 05:51:53.058	2026-02-25 05:51:53.058
36	3	1	Individual	chano|chan|chan	0	0.00	2026-02-25 05:52:22.3	2026-02-25 05:52:22.3
37	3	1	Individual	chano|chan|chan	0	0.00	2026-02-25 06:01:28.616	2026-02-25 06:01:28.616
38	3	1	Individual	chano|chan|chan	0	0.00	2026-02-25 06:02:17.075	2026-02-25 06:02:17.075
39	4	1	Individual	chan|chan|chan	0	0.00	2026-02-25 06:03:38.795	2026-02-25 06:03:38.795
40	4	1	Individual	chano|chan|chan	0	0.00	2026-02-25 06:17:19.099	2026-02-25 06:17:19.099
41	3	1	Individual	chano|chan|chan	0	0.00	2026-02-25 06:17:36.876	2026-02-25 06:17:36.876
42	3	1	Individual	chano|chano|chano	0	0.00	2026-02-25 06:22:06.018	2026-02-25 06:22:06.018
43	3	1	Individual	chano|chano|chano	0	0.00	2026-02-25 06:22:06.909	2026-02-25 06:22:06.909
44	3	1	Individual	chano|chano|chano	0	0.00	2026-02-25 06:22:07.357	2026-02-25 06:22:07.357
45	3	1	Individual	chano|chano|chano	0	0.00	2026-02-25 06:22:07.517	2026-02-25 06:22:07.517
46	3	1	Individual	chano|chan|chan	0	0.00	2026-02-25 06:35:50.021	2026-02-25 06:35:50.021
47	4	1	Individual	chano|chan|chan	0	0.00	2026-02-25 06:36:24.933	2026-02-25 06:36:24.933
48	3	1	Individual	chano|chan|chan	0	0.00	2026-02-25 06:39:22	2026-02-25 06:39:22
49	3	1	Individual	chano|chan|chan	0	0.00	2026-02-25 06:39:41.404	2026-02-25 06:39:41.404
50	3	1	Individual	test|test|test	0	0.00	2026-02-25 07:11:45.343	2026-02-25 07:11:45.343
51	3	1	Individual	test||test	0	0.00	2026-02-25 07:11:47.992	2026-02-25 07:11:47.992
\.


--
-- Data for Name: sub_domains; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sub_domains (id, "clientCode", "clientId", name, status, "isDeleted", "deletedAt", "deletedBy", "createdAt", "updatedAt") FROM stdin;
1	324	1	test	Active	0	\N	\N	2026-02-19 06:31:23.697	2026-02-19 06:31:30.514
\.


--
-- Data for Name: unlock_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.unlock_requests (id, "requestedBy", "recordId", status, "reviewedBy", "reviewedAt", reason, "createdAt", "updatedAt") FROM stdin;
1	2	1	approved	1	2026-02-24 03:25:52.822	asd	2026-02-24 03:25:06.202	2026-02-24 03:25:52.857
2	4	1	approved	3	2026-02-24 06:48:47.848	i want to access it the data	2026-02-24 06:47:39.633	2026-02-24 06:48:47.849
3	4	2	approved	3	2026-02-24 07:44:11.971	asdas	2026-02-24 07:43:41.71	2026-02-24 07:44:11.972
4	4	2	approved	3	2026-02-25 02:42:09.498	fg	2026-02-25 02:42:01.287	2026-02-25 02:42:09.499
5	3	2	approved	4	2026-02-25 05:03:14.405	Please let me view this data	2026-02-25 05:02:56.513	2026-02-25 05:03:14.406
6	4	2	approved	3	2026-02-25 05:36:24.862	testing	2026-02-25 05:35:37.107	2026-02-25 05:36:24.863
7	3	2	approved	4	2026-02-25 06:01:48.06	testing	2026-02-25 05:52:38.012	2026-02-25 06:01:48.061
8	4	2	approved	3	2026-02-25 06:05:10.586	a	2026-02-25 06:03:44.478	2026-02-25 06:05:10.587
9	3	2	approved	4	2026-02-25 06:35:01.116	Hello	2026-02-25 06:17:48.203	2026-02-25 06:35:01.117
10	4	2	denied	3	2026-02-25 06:38:42.922	g	2026-02-25 06:36:42.721	2026-02-25 06:38:42.923
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, email, "passwordHash", "roleId", "clientId", "branchId", "isApproved", "firstName", "middleName", "lastName", telephone, "mobileNumber", "faxNumber", "primaryEmail", "alternateEmail1", "alternateEmail2", "areaHeadManager", "areaHeadManagerContact", "position", department, "createdAt", "updatedAt") FROM stdin;
1	admin	admin@negrect.com	$2a$10$HP3qvzKZjqrx1xQ8jHNJ6exKhHM/FD.tK64HFYHEOZcZbmMYe9xT.	1	\N	\N	1	System	\N	Admin	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-19 05:51:39.619	2026-02-19 05:51:39.619
2	user	user@mailinator.com	$2a$10$5MdmgU0cNQbNaNOhNGBsQ.xg/41qu.qV3OcouTxPkvvU.HQ4DnxvS	3	\N	\N	1	user	user	user	+1 (936) 327-3592	890	+1 (858) 976-9848	tujif@mailinator.com	bibebic@mailinator.com	jehexag@mailinator.com	Et exercitationem mi	Porro delectus sed 	Rerum aut officia es	Sed iure nihil aut r	2026-02-19 06:30:13.218	2026-02-19 06:30:13.218
3	juan	juan@mailinator.com	$2a$10$m7igI4RT1Z7/SRwBU6vY5.5BaxSWKnhtM4dXGmEjNrpjWNR2Tczo6	3	1	1	1	juan	dela	cruz	+1 (595) 639-7644	422	+1 (323) 603-6883	gifeciges@mailinator.com	pesobyqa@mailinator.com	dosog@mailinator.com	Corrupti voluptatem	Et eveniet doloremq	Ut esse autem quo d	Ut consequatur Aute	2026-02-19 06:38:01.17	2026-02-19 06:38:01.17
4	pedro	pedro@gmail.com	$2a$10$bvgfNf6P0mODOTJ1bBKmZOOiZEXeYQtg5Sp3CMJ3Rq/LyIuzB6DNe	3	1	1	1	pedro	Igor Watkins	Watts	+1 (288) 596-6652	834	+1 (229) 426-2338	qotujyv@mailinator.com	matiqame@mailinator.com	hejilovyw@mailinator.com	Consectetur cupidat	Molestias numquam si	Sequi eius aut ea en	Est pariatur Offici	2026-02-24 05:15:21.286	2026-02-24 05:15:21.286
\.


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 49, true);


--
-- Name: clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.clients_id_seq', 1, true);


--
-- Name: credit_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.credit_transactions_id_seq', 16, true);


--
-- Name: lock_histories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lock_histories_id_seq', 7, true);


--
-- Name: negative_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.negative_records_id_seq', 3, true);


--
-- Name: news_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.news_id_seq', 1, false);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 6, true);


--
-- Name: ocr_batches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ocr_batches_id_seq', 1, false);


--
-- Name: record_locks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.record_locks_id_seq', 3, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roles_id_seq', 3, true);


--
-- Name: search_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.search_logs_id_seq', 51, true);


--
-- Name: sub_domains_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sub_domains_id_seq', 1, true);


--
-- Name: unlock_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.unlock_requests_id_seq', 10, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 4, true);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: credit_transactions credit_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_transactions
    ADD CONSTRAINT credit_transactions_pkey PRIMARY KEY (id);


--
-- Name: lock_histories lock_histories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lock_histories
    ADD CONSTRAINT lock_histories_pkey PRIMARY KEY (id);


--
-- Name: negative_records negative_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.negative_records
    ADD CONSTRAINT negative_records_pkey PRIMARY KEY (id);


--
-- Name: news news_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT news_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: ocr_batches ocr_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ocr_batches
    ADD CONSTRAINT ocr_batches_pkey PRIMARY KEY (id);


--
-- Name: record_locks record_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.record_locks
    ADD CONSTRAINT record_locks_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: search_logs search_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_logs
    ADD CONSTRAINT search_logs_pkey PRIMARY KEY (id);


--
-- Name: sub_domains sub_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_domains
    ADD CONSTRAINT sub_domains_pkey PRIMARY KEY (id);


--
-- Name: unlock_requests unlock_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unlock_requests
    ADD CONSTRAINT unlock_requests_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: clients_billingType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "clients_billingType_idx" ON public.clients USING btree ("billingType");


--
-- Name: clients_clientCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "clients_clientCode_idx" ON public.clients USING btree ("clientCode");


--
-- Name: clients_clientCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "clients_clientCode_key" ON public.clients USING btree ("clientCode");


--
-- Name: clients_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "clients_isActive_idx" ON public.clients USING btree ("isActive");


--
-- Name: credit_transactions_clientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "credit_transactions_clientId_idx" ON public.credit_transactions USING btree ("clientId");


--
-- Name: lock_histories_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "lock_histories_createdAt_idx" ON public.lock_histories USING btree ("createdAt");


--
-- Name: lock_histories_recordId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "lock_histories_recordId_idx" ON public.lock_histories USING btree ("recordId");


--
-- Name: negative_records_caseNo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "negative_records_caseNo_idx" ON public.negative_records USING btree ("caseNo");


--
-- Name: negative_records_companyName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "negative_records_companyName_idx" ON public.negative_records USING btree ("companyName");


--
-- Name: negative_records_lastName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "negative_records_lastName_idx" ON public.negative_records USING btree ("lastName");


--
-- Name: negative_records_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX negative_records_type_idx ON public.negative_records USING btree (type);


--
-- Name: notifications_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "notifications_createdAt_idx" ON public.notifications USING btree ("createdAt");


--
-- Name: notifications_isRead_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "notifications_isRead_idx" ON public.notifications USING btree ("isRead");


--
-- Name: notifications_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "notifications_userId_idx" ON public.notifications USING btree ("userId");


--
-- Name: record_locks_lockedBy_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "record_locks_lockedBy_idx" ON public.record_locks USING btree ("lockedBy");


--
-- Name: record_locks_recordId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "record_locks_recordId_key" ON public.record_locks USING btree ("recordId");


--
-- Name: roles_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name);


--
-- Name: search_logs_clientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "search_logs_clientId_idx" ON public.search_logs USING btree ("clientId");


--
-- Name: search_logs_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "search_logs_createdAt_idx" ON public.search_logs USING btree ("createdAt");


--
-- Name: search_logs_searchTerm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "search_logs_searchTerm_idx" ON public.search_logs USING btree ("searchTerm");


--
-- Name: search_logs_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "search_logs_userId_idx" ON public.search_logs USING btree ("userId");


--
-- Name: sub_domains_clientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sub_domains_clientId_idx" ON public.sub_domains USING btree ("clientId");


--
-- Name: sub_domains_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sub_domains_createdAt_idx" ON public.sub_domains USING btree ("createdAt");


--
-- Name: sub_domains_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sub_domains_deletedAt_idx" ON public.sub_domains USING btree ("deletedAt");


--
-- Name: sub_domains_isDeleted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sub_domains_isDeleted_idx" ON public.sub_domains USING btree ("isDeleted");


--
-- Name: sub_domains_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sub_domains_status_idx ON public.sub_domains USING btree (status);


--
-- Name: unlock_requests_requestedBy_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "unlock_requests_requestedBy_idx" ON public.unlock_requests USING btree ("requestedBy");


--
-- Name: unlock_requests_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX unlock_requests_status_idx ON public.unlock_requests USING btree (status);


--
-- Name: users_branchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "users_branchId_idx" ON public.users USING btree ("branchId");


--
-- Name: users_clientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "users_clientId_idx" ON public.users USING btree ("clientId");


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_isApproved_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "users_isApproved_idx" ON public.users USING btree ("isApproved");


--
-- Name: users_roleId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "users_roleId_idx" ON public.users USING btree ("roleId");


--
-- Name: users_username_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);


--
-- Name: audit_logs audit_logs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: credit_transactions credit_transactions_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_transactions
    ADD CONSTRAINT "credit_transactions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: credit_transactions credit_transactions_performedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_transactions
    ADD CONSTRAINT "credit_transactions_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: lock_histories lock_histories_lockedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lock_histories
    ADD CONSTRAINT "lock_histories_lockedBy_fkey" FOREIGN KEY ("lockedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: lock_histories lock_histories_recordId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lock_histories
    ADD CONSTRAINT "lock_histories_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES public.negative_records(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: negative_records negative_records_ocrBatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.negative_records
    ADD CONSTRAINT "negative_records_ocrBatchId_fkey" FOREIGN KEY ("ocrBatchId") REFERENCES public.ocr_batches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: news news_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT "news_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: notifications notifications_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ocr_batches ocr_batches_uploadedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ocr_batches
    ADD CONSTRAINT "ocr_batches_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: record_locks record_locks_lockedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.record_locks
    ADD CONSTRAINT "record_locks_lockedBy_fkey" FOREIGN KEY ("lockedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: record_locks record_locks_recordId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.record_locks
    ADD CONSTRAINT "record_locks_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES public.negative_records(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: search_logs search_logs_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_logs
    ADD CONSTRAINT "search_logs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: search_logs search_logs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_logs
    ADD CONSTRAINT "search_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sub_domains sub_domains_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_domains
    ADD CONSTRAINT "sub_domains_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: unlock_requests unlock_requests_recordId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unlock_requests
    ADD CONSTRAINT "unlock_requests_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES public.negative_records(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: unlock_requests unlock_requests_requestedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unlock_requests
    ADD CONSTRAINT "unlock_requests_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: users users_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public.sub_domains(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict Cy22vONt752AkfU8b7KRklGfRdypdGu29nOdKlhBEHyh4T4Glh277IxEqOIVlJp

