-- ═══════════════════════════════════════════════════════════════════
-- ย้อนกลับการเปลี่ยนแปลงวันที่ 2026-07-26
-- รันเฉพาะส่วนที่ต้องการย้อน ไม่ต้องรันทั้งไฟล์
-- ═══════════════════════════════════════════════════════════════════

-- ── ย้อนชุด 2: คืนสิทธิ์ anon แบบเดิม ───────────────────────────────
-- รันชุดนี้ถ้าตัวสั่งแอร์ (device) ทำงานไม่ได้หลังจำกัดสิทธิ์
grant update on public.air_commands to anon;

drop policy if exists "device marks pending commands" on public.air_commands;
create policy "device update status"
  on public.air_commands for update to anon
  using (true) with check (true);

drop policy if exists "device reads pending commands" on public.air_commands;
create policy "device read commands"
  on public.air_commands for select to anon
  using (true);

-- ── ย้อนชุด 1: คืน cron function เดิม ───────────────────────────────
-- (เวอร์ชันเดิมที่ hardcode temp = 0 — คืนเฉพาะกรณีเวอร์ชันใหม่มีปัญหา)
create or replace function public.check_and_generate_air_commands()
returns void
language plpgsql
as $function$
BEGIN
    -- 1. เช็คเวลา "เปิดแอร์"
    IF EXISTS (
        SELECT 1 FROM air_schedules
        WHERE is_enabled = true
        AND EXTRACT(HOUR FROM start_time) = EXTRACT(HOUR FROM (current_time AT TIME ZONE 'Asia/Bangkok'))
        AND EXTRACT(MINUTE FROM start_time) = EXTRACT(MINUTE FROM (current_time AT TIME ZONE 'Asia/Bangkok'))
    ) THEN
        INSERT INTO air_commands (action, temp, status, from_cron)
        SELECT 'TURN_ON', target_temp, 'pending', true
        FROM air_schedules
        WHERE is_enabled = true
        AND EXTRACT(HOUR FROM start_time) = EXTRACT(HOUR FROM (current_time AT TIME ZONE 'Asia/Bangkok'))
        AND EXTRACT(MINUTE FROM start_time) = EXTRACT(MINUTE FROM (current_time AT TIME ZONE 'Asia/Bangkok'));
    END IF;

    -- 2. เช็คเวลา "ปิดแอร์"
    IF EXISTS (
        SELECT 1 FROM air_schedules
        WHERE is_enabled = true
        AND EXTRACT(HOUR FROM end_time) = EXTRACT(HOUR FROM (current_time AT TIME ZONE 'Asia/Bangkok'))
        AND EXTRACT(MINUTE FROM end_time) = EXTRACT(MINUTE FROM (current_time AT TIME ZONE 'Asia/Bangkok'))
    ) THEN
        INSERT INTO air_commands (action, temp, status, from_cron)
        VALUES ('TURN_OFF', 0, 'pending', true);
    END IF;
END;
$function$;

-- ── ย้อนชุด 3: ถอน default / constraint / index ────────────────────
alter table public.air_commands alter column status drop default;
alter table public.air_commands alter column mode   drop default;

alter table public.air_commands  drop constraint if exists air_commands_temp_range;
alter table public.air_commands  drop constraint if exists air_commands_mode_allowed;
alter table public.air_commands  drop constraint if exists air_commands_action_allowed;
alter table public.air_schedules drop constraint if exists air_schedules_temp_range;
alter table public.air_schedules drop constraint if exists air_schedules_mode_allowed;

drop index if exists public.air_commands_created_at_desc_idx;
drop index if exists public.air_commands_pending_idx;
drop index if exists public.air_schedules_created_at_desc_idx;
