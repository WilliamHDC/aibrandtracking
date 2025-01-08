CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    competitors JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    name TEXT NOT NULL,
    queries JSONB DEFAULT '[]'
);