-- PostgreSQL schema for Medinfo

CREATE TABLE medical_facility (
    id SERIAL PRIMARY KEY,
    short_name TEXT NOT NULL,
    official_name TEXT,
    prefecture TEXT,
    city TEXT,
    address_detail TEXT,
    phone_numbers JSONB,
    emails JSONB,
    fax TEXT,
    remarks TEXT,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE function_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE functions (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    memo TEXT,
    selection_type TEXT CHECK (selection_type IN ('single', 'multiple')),
    choices TEXT[],
    category_id INTEGER REFERENCES function_categories(id),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE facility_function_entries (
    id SERIAL PRIMARY KEY,
    facility_id INTEGER REFERENCES medical_facility(id),
    function_id INTEGER REFERENCES functions(id),
    selected_values TEXT[],
    remarks TEXT
);

INSERT INTO function_categories (name, description) VALUES
    ('基本機能', '一般的な機能をまとめたカテゴリ'),
    ('設備', '施設の設備に関する機能'),
    ('サービス', '提供サービスに関する機能');

-- Memo feature tables

CREATE TABLE memo_tags (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    remark TEXT,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE facility_memos (
    id SERIAL PRIMARY KEY,
    facility_id INTEGER REFERENCES medical_facility(id),
    title TEXT NOT NULL,
    content TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE facility_memo_versions (
    id SERIAL PRIMARY KEY,
    memo_id INTEGER REFERENCES facility_memos(id) ON DELETE CASCADE,
    version_no INTEGER NOT NULL,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    UNIQUE (memo_id, version_no)
);

CREATE TABLE facility_memo_tag_links (
    memo_id INTEGER REFERENCES facility_memos(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES memo_tags(id),
    PRIMARY KEY (memo_id, tag_id)
);

CREATE TABLE facility_memo_locks (
    memo_id INTEGER PRIMARY KEY REFERENCES facility_memos(id) ON DELETE CASCADE,
    locked_by TEXT,
    locked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT
);
