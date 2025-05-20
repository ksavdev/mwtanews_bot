CREATE TABLE IF NOT EXISTS user_settings (
  tg_id        BIGINT      PRIMARY KEY,
  tg_username  TEXT        NOT NULL,
  tz_id        TEXT        NOT NULL DEFAULT 'UTC',
  lang         CHAR(2)     NOT NULL DEFAULT 'ru',
  importance   SMALLINT    NOT NULL DEFAULT 2,        -- 1=low,2=mid,3=high
  last_daily_sent DATE,                              
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_user_settings_touch ON user_settings;

CREATE TRIGGER tr_user_settings_touch
BEFORE UPDATE ON user_settings
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_user_settings_tz_id
  ON user_settings(tz_id);
