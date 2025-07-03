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
    description TEXT
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
