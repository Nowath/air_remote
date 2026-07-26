-- ชุด 2: จำกัดสิทธิ์ anon (ตัวสั่งแอร์ต่อด้วย key นี้)
-- เดิม: policy "device update status" มี qual=true, with_check=true
--       → anon แก้ได้ทุกคอลัมน์ ทุกแถว (ยืนยันด้วยการทดสอบ UPDATE แถว id=37 แล้วได้ 200)
--       policy "device read commands" → anon อ่านประวัติได้ทั้งหมด
-- ใหม่: column-level grant ให้เขียนได้เฉพาะ status และเฉพาะแถวที่ยัง pending

-- 1) สิทธิ์ระดับคอลัมน์ — RLS อย่างเดียวจำกัดรายคอลัมน์ไม่ได้
revoke update on public.air_commands from anon;
grant  update (status) on public.air_commands to anon;

-- 2) UPDATE: แตะได้เฉพาะแถวที่รอทำ และปิดจ๊อบได้เท่านั้น
drop policy if exists "device update status" on public.air_commands;
create policy "device marks pending commands"
  on public.air_commands for update to anon
  using (status = 'pending')
  with check (status in ('success', 'error'));

-- 3) SELECT: เห็นเฉพาะคำสั่งที่รอทำ ไม่ใช่ประวัติทั้งหมด
drop policy if exists "device read commands" on public.air_commands;
create policy "device reads pending commands"
  on public.air_commands for select to anon
  using (status = 'pending');
