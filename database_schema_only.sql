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

