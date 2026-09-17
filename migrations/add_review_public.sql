-- Reviews can keep their comment private: stars still count toward the
-- landing "Satisfaction" average, but only is_public comments are displayed
-- as testimonials. Additive and safe to re-run.
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;
