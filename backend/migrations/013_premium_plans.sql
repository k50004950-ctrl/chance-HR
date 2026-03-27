-- 013: Premium subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id SERIAL PRIMARY KEY,
  workplace_id INTEGER NOT NULL REFERENCES workplaces(id),
  plan_type VARCHAR(20) DEFAULT 'free',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_workplace ON subscription_plans(workplace_id, is_active);
