-- Full public-schema dump of the production database (tables, trigger
-- functions, triggers, constraints, indexes). Regenerate with:
--   pg_dump "$DATABASE_URL" --schema-only --schema=public --no-owner --no-privileges
-- Apply on a fresh database:  psql "$NEW_DATABASE_URL" -f migrations/schema.sql
-- NOTE: Supabase projects already have the public schema; the IF NOT
--       EXISTS below makes this file safe to run there as-is.

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.6 (Ubuntu 18.6-0ubuntu0.26.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: enforce_mission_status_transition(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_mission_status_transition() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.status IS NULL THEN
    IF NEW.status IS NULL OR NEW.status = 'accepted' THEN
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Invalid transition: status can only change from NULL to accepted, got %', NEW.status;
    END IF;
  ELSIF OLD.status = 'accepted' THEN
    IF NEW.status IN ('accepted', 'started', 'completed') OR NEW.status IS NULL THEN
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Invalid transition: status can only change from accepted to started, completed, or NULL, got %', NEW.status;
    END IF;
  ELSIF OLD.status = 'started' THEN
    IF NEW.status IN ('started', 'completed') OR NEW.status IS NULL THEN
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Invalid transition: status can only change from started to completed or NULL, got %', NEW.status;
    END IF;
  ELSIF OLD.status = 'completed' THEN
    IF NEW.status = 'completed' THEN
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Invalid transition: status cannot change from completed, got %', NEW.status;
    END IF;
  END IF;
  RAISE EXCEPTION 'Unexpected status value: %', OLD.status;
END;
$$;


--
-- Name: reset_employee_fields_on_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reset_employee_fields_on_status_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.status = 'pending' AND NEW.status != 'pending' THEN
        RAISE NOTICE 'Resetting message for employee %', NEW.id;
        NEW.message := NULL;
        -- conciergerie_name is the employee's immutable home conciergerie —
        -- it must survive vetting (multi-conciergerie model).
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: reset_mission_employee_on_rejection(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reset_mission_employee_on_rejection() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.status = 'rejected' THEN
    UPDATE missions
    SET employee_id = NULL
    WHERE employee_id = OLD.first_name || ' ' || OLD.family_name;

    UPDATE missions
    SET allowed_employees = array_remove(
      allowed_employees,
      OLD.first_name || ' ' || OLD.family_name
    )
    WHERE allowed_employees IS NOT NULL
    AND OLD.first_name || ' ' || OLD.family_name = ANY(allowed_employees);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_mission_employee_name(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_mission_employee_name() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE missions
  SET employee_id = NEW.first_name || ' ' || NEW.family_name
  WHERE employee_id = OLD.first_name || ' ' || OLD.family_name;

  UPDATE missions
  SET allowed_employees = array_replace(
    allowed_employees,
    OLD.first_name || ' ' || OLD.family_name,
    NEW.first_name || ' ' || NEW.family_name
  )
  WHERE allowed_employees IS NOT NULL
  AND OLD.first_name || ' ' || OLD.family_name = ANY(allowed_employees);

  RETURN NEW;
END;
$$;


--
-- Name: update_mission_modified_date_func(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_mission_modified_date_func() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE NOTICE 'Updating modified_date for mission id %', NEW.id; -- Debug log
    NEW.modified_date := CURRENT_TIMESTAMP; -- Only update modified_date
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text,
    plan text DEFAULT 'decouverte'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    is_admin boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT clients_plan_check CHECK ((plan = ANY (ARRAY['decouverte'::text, 'pro'::text, 'privilege'::text]))),
    CONSTRAINT clients_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text])))
);


--
-- Name: conciergeries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conciergeries (
    id text[] NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    tel text NOT NULL,
    color_name text NOT NULL,
    notification_settings jsonb,
    plan text DEFAULT 'pro'::text NOT NULL,
    client_id uuid,
    discount integer DEFAULT 0 NOT NULL,
    billing_period text DEFAULT 'monthly'::text NOT NULL,
    plan_until timestamp with time zone,
    CONSTRAINT conciergeries_billing_period_check CHECK ((billing_period = ANY (ARRAY['monthly'::text, 'annual'::text]))),
    CONSTRAINT conciergeries_discount_check CHECK (((discount >= 0) AND (discount <= 100))),
    CONSTRAINT conciergeries_plan_check CHECK ((plan = ANY (ARRAY['decouverte'::text, 'pro'::text, 'privilege'::text]))),
    CONSTRAINT valid_color_name CHECK ((color_name = ANY (ARRAY['Rose'::text, 'Orange'::text, 'Vert'::text, 'Bleu'::text, 'Violet'::text, 'Gris'::text])))
);


--
-- Name: device_seen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.device_seen (
    device_hash text NOT NULL,
    last_seen timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: email_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    "to" text NOT NULL,
    subject text,
    success boolean NOT NULL,
    error text,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    body text,
    client_id uuid
);


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id text[] NOT NULL,
    first_name text NOT NULL,
    family_name text NOT NULL,
    tel text NOT NULL,
    email text NOT NULL,
    message text,
    conciergerie_name text,
    notification_settings jsonb,
    status text DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    geographic_zone text,
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid,
    CONSTRAINT concierges_status_check CHECK ((status = ANY (ARRAY[('pending'::character varying)::text, ('accepted'::character varying)::text, ('rejected'::character varying)::text])))
);


--
-- Name: failed_emails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.failed_emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    payload jsonb NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_attempt timestamp with time zone,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: homes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.homes (
    id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    objectives text[] NOT NULL,
    images text[] NOT NULL,
    geographic_zone text NOT NULL,
    hours_of_cleaning numeric(2,1) NOT NULL,
    hours_of_gardening numeric(2,1) NOT NULL,
    conciergerie_name text NOT NULL,
    allow_duo boolean DEFAULT false NOT NULL,
    max_travellers integer DEFAULT 1,
    notes text,
    client_id uuid,
    CONSTRAINT homes_images_check CHECK ((array_length(images, 1) >= 1)),
    CONSTRAINT homes_objectives_check CHECK ((array_length(objectives, 1) >= 1))
);

ALTER TABLE ONLY public.homes REPLICA IDENTITY FULL;


--
-- Name: mission_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mission_reports (
    id text NOT NULL,
    mission_id text NOT NULL,
    employee_id text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    images text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    client_id uuid
);


--
-- Name: missions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.missions (
    id text NOT NULL,
    home_id text NOT NULL,
    tasks text[] NOT NULL,
    start_date_time timestamp with time zone NOT NULL,
    end_date_time timestamp with time zone NOT NULL,
    modified_date timestamp with time zone,
    conciergerie_name text NOT NULL,
    allowed_employees text[],
    hours numeric(4,1) NOT NULL,
    employee_id text,
    status text,
    late_notified_at timestamp with time zone,
    employee_id_2 text,
    allow_duo boolean DEFAULT false,
    travellers integer DEFAULT 1,
    conciergerie_comment text,
    client_id uuid,
    CONSTRAINT check_mission_status CHECK (((status IS NULL) OR (status = ANY (ARRAY['accepted'::text, 'started'::text, 'completed'::text])))),
    CONSTRAINT missions_tasks_check CHECK ((array_length(tasks, 1) >= 1))
);

ALTER TABLE ONLY public.missions REPLICA IDENTITY FULL;


--
-- Name: rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rate_limits (
    key text NOT NULL,
    count integer NOT NULL,
    window_start timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    user_type text NOT NULL,
    row_key text NOT NULL,
    rating smallint NOT NULL,
    comment text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_public boolean DEFAULT true NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 0) AND (rating <= 5))),
    CONSTRAINT reviews_user_type_check CHECK ((user_type = ANY (ARRAY['conciergerie'::text, 'employee'::text])))
);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: conciergeries contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conciergeries
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (name);


--
-- Name: device_seen device_seen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_seen
    ADD CONSTRAINT device_seen_pkey PRIMARY KEY (device_hash);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (uuid);


--
-- Name: failed_emails failed_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_emails
    ADD CONSTRAINT failed_emails_pkey PRIMARY KEY (id);


--
-- Name: homes homes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homes
    ADD CONSTRAINT homes_pkey PRIMARY KEY (id);


--
-- Name: mission_reports mission_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mission_reports
    ADD CONSTRAINT mission_reports_pkey PRIMARY KEY (id);


--
-- Name: missions missions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT missions_pkey PRIMARY KEY (id);


--
-- Name: rate_limits rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limits
    ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (key);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (user_type, row_key);


--
-- Name: conciergeries unique_color_name_per_client; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conciergeries
    ADD CONSTRAINT unique_color_name_per_client UNIQUE (client_id, color_name);


--
-- Name: employees unique_employee_contact; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT unique_employee_contact UNIQUE (tel, email);


--
-- Name: employees unique_employee_email; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT unique_employee_email UNIQUE (email);


--
-- Name: employees unique_employee_tel; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT unique_employee_tel UNIQUE (tel);


--
-- Name: idx_employees_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_client_id ON public.employees USING btree (client_id);


--
-- Name: idx_failed_emails_retry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_failed_emails_retry ON public.failed_emails USING btree (last_attempt NULLS FIRST, attempts);


--
-- Name: idx_homes_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_homes_client_id ON public.homes USING btree (client_id);


--
-- Name: idx_mission_reports_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mission_reports_client_id ON public.mission_reports USING btree (client_id);


--
-- Name: idx_mission_reports_mission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mission_reports_mission_id ON public.mission_reports USING btree (mission_id);


--
-- Name: idx_missions_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_missions_client_id ON public.missions USING btree (client_id);


--
-- Name: employees employee_name_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER employee_name_change BEFORE UPDATE OF first_name, family_name ON public.employees FOR EACH ROW WHEN (((old.first_name IS DISTINCT FROM new.first_name) OR (old.family_name IS DISTINCT FROM new.family_name))) EXECUTE FUNCTION public.update_mission_employee_name();


--
-- Name: employees employee_status_change_from_pending; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER employee_status_change_from_pending BEFORE UPDATE OF status ON public.employees FOR EACH ROW EXECUTE FUNCTION public.reset_employee_fields_on_status_change();


--
-- Name: employees employee_status_rejection; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER employee_status_rejection AFTER UPDATE OF status ON public.employees FOR EACH ROW EXECUTE FUNCTION public.reset_mission_employee_on_rejection();


--
-- Name: missions update_mission_modified_date; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_mission_modified_date BEFORE UPDATE ON public.missions FOR EACH ROW EXECUTE FUNCTION public.update_mission_modified_date_func();


--
-- Name: conciergeries conciergeries_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conciergeries
    ADD CONSTRAINT conciergeries_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: email_logs email_logs_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: employees employees_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: missions fk_home; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT fk_home FOREIGN KEY (home_id) REFERENCES public.homes(id) ON DELETE CASCADE;


--
-- Name: homes homes_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homes
    ADD CONSTRAINT homes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: mission_reports mission_reports_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mission_reports
    ADD CONSTRAINT mission_reports_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: mission_reports mission_reports_mission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mission_reports
    ADD CONSTRAINT mission_reports_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.missions(id) ON DELETE CASCADE;


--
-- Name: missions missions_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT missions_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);



--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    endpoint text NOT NULL,
    user_type text NOT NULL,
    row_key text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    client_id uuid,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT push_subscriptions_user_type_check CHECK ((user_type = ANY (ARRAY['conciergerie'::text, 'employee'::text])))
);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (endpoint);


--
-- Name: idx_push_subscriptions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_push_subscriptions_user ON public.push_subscriptions USING btree (user_type, row_key);


--
-- Name: plan_changes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_changes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    conciergerie_name text NOT NULL,
    from_plan text,
    to_plan text NOT NULL,
    changed_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    client_id uuid,
    CONSTRAINT plan_changes_from_plan_check CHECK ((from_plan IS NULL OR (from_plan = ANY (ARRAY['decouverte'::text, 'pro'::text, 'privilege'::text])))),
    CONSTRAINT plan_changes_to_plan_check CHECK ((to_plan = ANY (ARRAY['decouverte'::text, 'pro'::text, 'privilege'::text])))
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    conciergerie_name text NOT NULL,
    period_year integer NOT NULL,
    period_month integer NOT NULL,
    plan text NOT NULL,
    amount numeric(10,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    client_id uuid,
    discount integer DEFAULT 0 NOT NULL,
    external_ref text,
    CONSTRAINT invoices_period_month_check CHECK (((period_month >= 1) AND (period_month <= 12))),
    CONSTRAINT invoices_plan_check CHECK ((plan = ANY (ARRAY['decouverte'::text, 'pro'::text, 'privilege'::text]))),
    CONSTRAINT invoices_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'paid'::text, 'cancelled'::text]))),
    CONSTRAINT invoices_unique_period UNIQUE (conciergerie_name, period_year, period_month)
);


--
-- Name: plan_changes_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plan_changes_lookup ON public.plan_changes USING btree (conciergerie_name, created_at);


--
-- PostgreSQL database dump complete
--


