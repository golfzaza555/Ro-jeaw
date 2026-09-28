-- Customers no longer have accounts: each order carries a secret token that
-- lets the ordering device track, cancel and rate it.
ALTER TABLE orders ADD COLUMN access_token_hash TEXT;
CREATE INDEX orders_phone_active_idx ON orders (phone) WHERE status IN ('pending', 'cooking', 'ready');
