-- ชุด 3: default + constraint + index
-- หมายเหตุ: from_cron (air_commands) และ is_enabled (air_schedules) มี default false
-- อยู่แล้ว จึงไม่ต้องแตะ — ตรวจจาก information_schema.columns แล้ว

-- 1) default ที่ยังไม่มี (safety net เผื่อผู้เขียนแถวลืมส่ง)
alter table public.air_commands alter column status set default 'pending';
alter table public.air_commands alter column mode   set default 'cool';

-- 2) CHECK constraint — ตาข่ายกัน temp=0 หลุดเข้ามาอีก
--    ใช้ not valid เพราะแถว id=37 (temp=0) ยังอยู่ ไม่งั้นคำสั่งจะล้มเหลว
alter table public.air_commands
  add constraint air_commands_temp_range
  check (temp is null or temp between 16 and 30) not valid;

alter table public.air_commands
  add constraint air_commands_mode_allowed
  check (mode is null or mode in ('fan', 'dry', 'cool')) not valid;

alter table public.air_commands
  add constraint air_commands_action_allowed
  check (action is null or action in ('TURN_ON', 'TURN_OFF')) not valid;

alter table public.air_schedules
  add constraint air_schedules_temp_range
  check (target_temp is null or target_temp between 16 and 30) not valid;

alter table public.air_schedules
  add constraint air_schedules_mode_allowed
  check (mode is null or mode in ('fan', 'dry', 'cool')) not valid;

-- 3) index — ทุก query เรียงตาม created_at desc
create index if not exists air_commands_created_at_desc_idx
  on public.air_commands (created_at desc);
create index if not exists air_schedules_created_at_desc_idx
  on public.air_schedules (created_at desc);

-- partial index สำหรับ path ที่ device ใช้ (status = 'pending')
create index if not exists air_commands_pending_idx
  on public.air_commands (created_at) where status = 'pending';
