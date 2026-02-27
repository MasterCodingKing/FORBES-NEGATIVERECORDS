-- Enable pg_trgm extension for fast ILIKE searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- NegativeRecord trigram indexes (used by ILIKE search in listRecords + affiliate search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_neg_records_firstname_trgm ON negative_records USING gin ("firstName" gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_neg_records_middlename_trgm ON negative_records USING gin ("middleName" gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_neg_records_lastname_trgm ON negative_records USING gin ("lastName" gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_neg_records_companyname_trgm ON negative_records USING gin ("companyName" gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_neg_records_caseno_trgm ON negative_records USING gin ("caseNo" gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_neg_records_plaintiff_trgm ON negative_records USING gin ("plaintiff" gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_neg_records_source_trgm ON negative_records USING gin ("source" gin_trgm_ops);

-- Client trigram indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_name_trgm ON clients USING gin ("name" gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_clientcode_trgm ON clients USING gin ("clientCode" gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_clientgroup_trgm ON clients USING gin ("clientGroup" gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_email_trgm ON clients USING gin ("email" gin_trgm_ops);

-- User trigram indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_firstname_trgm ON users USING gin ("firstName" gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_lastname_trgm ON users USING gin ("lastName" gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_trgm ON users USING gin ("email" gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username_trgm ON users USING gin ("username" gin_trgm_ops);

-- News trigram indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_title_trgm ON news USING gin ("title" gin_trgm_ops);

-- SubDomain trigram indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subdomains_name_trgm ON sub_domains USING gin ("name" gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subdomains_clientcode_trgm ON sub_domains USING gin ("clientCode" gin_trgm_ops);
