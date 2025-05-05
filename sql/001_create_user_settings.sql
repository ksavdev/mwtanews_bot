CREATE TABLE IF NOT EXISTS user_settings (
  tg_id       BIGINT PRIMARY KEY,
  tg_username TEXT NOT NULL,
  tz_offset   SMALLINT  NOT NULL DEFAULT 0,
  lang        CHAR(2)   NOT NULL DEFAULT 'ru',
  importance  SMALLINT  NOT NULL DEFAULT 2,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_user_settings_touch
BEFORE UPDATE ON user_settings
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
