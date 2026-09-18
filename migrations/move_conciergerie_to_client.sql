-- Group transitions for the multi-conciergerie model.
--
-- A group = one `clients` row; membership = `client_id` on the scoped tables
-- (conciergeries, employees, homes, missions, mission_reports, email_logs).
-- These functions implement the three transitions, admin-operated only:
--
--   move_conciergerie_to_client(name, target_client_id)
--       Move one conciergerie (and its subtree: employees, homes, missions,
--       reports, logs) into another group.
--
--   merge_clients(source_client_id, target_client_id)
--       Merge a whole group into another — every scoped row is re-pointed.
--       Name collisions are impossible (global uniques); employee name keys
--       and color names are checked first and abort the merge on conflict.
--
--   split_conciergerie_to_own_client(name)
--       A conciergerie leaves its group and becomes standalone — a fresh
--       client is created and the subtree is moved into it.
--
-- All three run as single transactions (a function is atomic): a failure
-- rolls everything back.
--
-- Assignment cleanup on MOVE/SPLIT (never on MERGE — a merge keeps the
-- group intact):
--   * Missions owned by the moved conciergerie that referenced employees
--     staying behind get those refs cleared (employee_id / employee_id_2 →
--     NULL, allowed_employees filtered to the moving staff, empty → NULL).
--   * Symmetrically, missions staying behind that referenced the moving
--     employees get those refs cleared.
--   * 'accepted' missions left fully unassigned are reopened (status → NULL).
--   * 'started'/'completed' missions keep their refs — an engagement in
--     flight finishes, and completed history stays attributable.
--
-- Employees with NULL conciergerie_name (unclaimed) do NOT move — they are
-- not owned by the moving conciergerie.

-- ============================================================================
-- Move one conciergerie's subtree to another client
-- ============================================================================
CREATE OR REPLACE FUNCTION move_conciergerie_to_client(
    p_conciergerie text,
    p_target_client uuid
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_source uuid;
    v_color text;
    v_moving_keys text[];
    v_dupes text;
BEGIN
    SELECT client_id, color_name INTO v_source, v_color
    FROM public.conciergeries WHERE name = p_conciergerie;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conciergerie % not found', p_conciergerie;
    END IF;
    IF v_source = p_target_client THEN
        RAISE NOTICE '% is already in the target client — nothing to do', p_conciergerie;
        RETURN;
    END IF;
    PERFORM 1 FROM public.clients WHERE id = p_target_client;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target client % not found', p_target_client;
    END IF;

    -- Color uniqueness is per-client: the moved row must not collide.
    IF v_color IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.conciergeries
        WHERE client_id = p_target_client AND color_name = v_color
    ) THEN
        RAISE EXCEPTION 'Color % already used in the target client — change % color first', v_color, p_conciergerie;
    END IF;

    -- Employees whose home is the moving conciergerie move with it.
    SELECT array_agg(first_name || ' ' || family_name) INTO v_moving_keys
    FROM public.employees
    WHERE client_id = v_source AND conciergerie_name = p_conciergerie;
    v_moving_keys := COALESCE(v_moving_keys, '{}');

    -- Employee names are the mission join key — a homonym in the target
    -- group would make mission attribution ambiguous.
    SELECT string_agg(k, ', ') INTO v_dupes
    FROM (
        SELECT e.first_name || ' ' || e.family_name AS k
        FROM public.employees e
        WHERE e.client_id = p_target_client
          AND lower(btrim(e.first_name || ' ' || e.family_name)) IN (
              SELECT lower(btrim(mk)) FROM unnest(v_moving_keys) AS mk
          )
    ) d;
    IF v_dupes IS NOT NULL THEN
        RAISE EXCEPTION 'Employee name collision with target client: %', v_dupes;
    END IF;

    -- Clear refs to employees staying behind, on the moved conciergerie's
    -- open/accepted missions.
    UPDATE public.missions m SET
        employee_id   = CASE WHEN m.employee_id = ANY(v_moving_keys) THEN m.employee_id END,
        employee_id_2 = CASE WHEN m.employee_id_2 = ANY(v_moving_keys) THEN m.employee_id_2 END,
        allowed_employees = CASE
            WHEN m.allowed_employees IS NULL THEN NULL
            ELSE NULLIF(ARRAY(SELECT unnest(m.allowed_employees) INTERSECT SELECT unnest(v_moving_keys)), '{}')
        END
    WHERE m.client_id = v_source AND m.conciergerie_name = p_conciergerie
      AND (m.status IS NULL OR m.status = 'accepted');

    -- Clear refs to the moving employees on missions staying behind.
    UPDATE public.missions m SET
        employee_id   = CASE WHEN NOT (m.employee_id = ANY(v_moving_keys)) THEN m.employee_id END,
        employee_id_2 = CASE WHEN NOT (m.employee_id_2 = ANY(v_moving_keys)) THEN m.employee_id_2 END,
        allowed_employees = CASE
            WHEN m.allowed_employees IS NULL THEN NULL
            ELSE NULLIF(ARRAY(
                SELECT ae FROM unnest(m.allowed_employees) AS ae
                WHERE NOT (ae = ANY(v_moving_keys))
            ), '{}')
        END
    WHERE m.client_id = v_source AND m.conciergerie_name <> p_conciergerie
      AND (m.status IS NULL OR m.status = 'accepted')
      AND (
          m.employee_id = ANY(v_moving_keys)
          OR m.employee_id_2 = ANY(v_moving_keys)
          OR m.allowed_employees && v_moving_keys
      );

    -- Accepted missions left fully unassigned reopen.
    UPDATE public.missions SET status = NULL
    WHERE client_id = v_source AND status = 'accepted'
      AND employee_id IS NULL AND employee_id_2 IS NULL;

    -- Reports follow their mission.
    UPDATE public.mission_reports SET client_id = p_target_client
    WHERE client_id = v_source AND mission_id IN (
        SELECT id FROM public.missions
        WHERE client_id = v_source AND conciergerie_name = p_conciergerie
    );

    -- Mail addressed to the moved conciergerie or its staff.
    UPDATE public.email_logs SET client_id = p_target_client
    WHERE client_id = v_source AND "to" IN (
        SELECT email FROM public.conciergeries WHERE name = p_conciergerie
        UNION
        SELECT email FROM public.employees
        WHERE client_id = v_source AND conciergerie_name = p_conciergerie
    );

    UPDATE public.missions SET client_id = p_target_client
    WHERE client_id = v_source AND conciergerie_name = p_conciergerie;
    UPDATE public.homes SET client_id = p_target_client
    WHERE client_id = v_source AND conciergerie_name = p_conciergerie;
    UPDATE public.employees SET client_id = p_target_client
    WHERE client_id = v_source AND conciergerie_name = p_conciergerie;
    UPDATE public.conciergeries SET client_id = p_target_client
    WHERE name = p_conciergerie;
END;
$$;

-- ============================================================================
-- Merge a whole group into another (every scoped row is re-pointed)
-- ============================================================================
CREATE OR REPLACE FUNCTION merge_clients(
    p_source_client uuid,
    p_target_client uuid
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_dupes text;
    v_colors text;
BEGIN
    IF p_source_client = p_target_client THEN
        RAISE EXCEPTION 'Source and target clients are the same';
    END IF;
    PERFORM 1 FROM public.clients WHERE id = p_source_client;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Source client % not found', p_source_client;
    END IF;
    PERFORM 1 FROM public.clients WHERE id = p_target_client;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target client % not found', p_target_client;
    END IF;

    -- Employee name homonyms across the two groups would collide on the
    -- mission join key — abort rather than corrupt attribution.
    SELECT string_agg(k, ', ') INTO v_dupes
    FROM (
        SELECT e.first_name || ' ' || e.family_name AS k
        FROM public.employees e
        WHERE e.client_id = p_target_client
          AND lower(btrim(e.first_name || ' ' || e.family_name)) IN (
              SELECT lower(btrim(s.first_name || ' ' || s.family_name))
              FROM public.employees s
              WHERE s.client_id = p_source_client
          )
    ) d;
    IF v_dupes IS NOT NULL THEN
        RAISE EXCEPTION 'Employee name collision between clients: %', v_dupes;
    END IF;

    -- Per-client color uniqueness.
    SELECT string_agg(c.color_name, ', ') INTO v_colors
    FROM public.conciergeries c
    WHERE c.client_id = p_source_client
      AND EXISTS (
          SELECT 1 FROM public.conciergeries t
          WHERE t.client_id = p_target_client AND t.color_name = c.color_name
      );
    IF v_colors IS NOT NULL THEN
        RAISE EXCEPTION 'Color collision in target client: % — recolor first', v_colors;
    END IF;

    UPDATE public.conciergeries   SET client_id = p_target_client WHERE client_id = p_source_client;
    UPDATE public.employees       SET client_id = p_target_client WHERE client_id = p_source_client;
    UPDATE public.homes           SET client_id = p_target_client WHERE client_id = p_source_client;
    UPDATE public.missions        SET client_id = p_target_client WHERE client_id = p_source_client;
    UPDATE public.mission_reports SET client_id = p_target_client WHERE client_id = p_source_client;
    UPDATE public.email_logs      SET client_id = p_target_client WHERE client_id = p_source_client;

    DELETE FROM public.clients WHERE id = p_source_client;
END;
$$;

-- ============================================================================
-- A conciergerie leaves its group and becomes standalone
-- ============================================================================
CREATE OR REPLACE FUNCTION split_conciergerie_to_own_client(
    p_conciergerie text
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_new_client uuid;
BEGIN
    INSERT INTO public.clients (name) VALUES (p_conciergerie)
    RETURNING id INTO v_new_client;
    PERFORM move_conciergerie_to_client(p_conciergerie, v_new_client);
    RETURN v_new_client;
END;
$$;

-- ============================================================================
-- Usage (run manually — these are admin operations):
--
--   -- Create the real groups first:
--   INSERT INTO clients (name) VALUES ('Groupe ABC') RETURNING id;
--   INSERT INTO clients (name) VALUES ('Groupe EF')  RETURNING id;
--
--   -- Move conciergeries into their group:
--   SELECT move_conciergerie_to_client('Conciergerie Azur', '<abc-uuid>');
--
--   -- Merge two groups:
--   SELECT merge_clients('<ef-uuid>', '<abc-uuid>');
--
--   -- A conciergerie goes standalone:
--   SELECT split_conciergerie_to_own_client('Conciergerie Azur');
-- ============================================================================
