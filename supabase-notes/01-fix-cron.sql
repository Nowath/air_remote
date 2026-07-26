-- ชุด 1: แก้ cron function
-- เดิม: branch TURN_OFF hardcode VALUES ('TURN_OFF', 0, 'pending', true)
--       → temp = 0 เสมอ (ต้นตอ status='error') และไม่ใส่ mode ทั้งสอง branch
-- ใหม่: ดึง target_temp + mode จาก schedule จริงทั้งสอง branch
-- signature เดิม: returns void, plpgsql, security invoker (ตรวจจาก pg_proc แล้ว)

create or replace function public.check_and_generate_air_commands()
returns void
language plpgsql
as $function$
declare
  v_now time := (current_time at time zone 'Asia/Bangkok');
begin
  -- 1. เช็คเวลา "เปิดแอร์"
  insert into air_commands (action, temp, mode, status, from_cron)
  select 'TURN_ON', target_temp, coalesce(mode, 'cool'), 'pending', true
  from air_schedules
  where is_enabled
    and extract(hour   from start_time) = extract(hour   from v_now)
    and extract(minute from start_time) = extract(minute from v_now);

  -- 2. เช็คเวลา "ปิดแอร์" — ใช้ target_temp/mode จาก schedule แทน temp = 0
  --    limit 1 เพื่อคงพฤติกรรมเดิม (ออกคำสั่งปิดครั้งเดียวแม้มีหลาย schedule)
  insert into air_commands (action, temp, mode, status, from_cron)
  select 'TURN_OFF', target_temp, coalesce(mode, 'cool'), 'pending', true
  from air_schedules
  where is_enabled
    and extract(hour   from end_time) = extract(hour   from v_now)
    and extract(minute from end_time) = extract(minute from v_now)
  order by id
  limit 1;
end;
$function$;
