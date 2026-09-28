CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer', 'staff', 'admin')),
  display_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  failed_logins INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  business_date TEXT NOT NULL,
  daily_no INT NOT NULL,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  items JSONB NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  total INT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'cooking', 'ready', 'completed', 'cancelled')),
  cancel_reason TEXT,
  pickup_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cooking_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  UNIQUE (business_date, daily_no)
);
CREATE INDEX orders_date_idx ON orders (business_date);
CREATE INDEX orders_status_idx ON orders (status);
CREATE INDEX orders_user_idx ON orders (user_id, created_at DESC);
