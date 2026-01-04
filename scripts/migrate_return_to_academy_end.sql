-- Phase 5: 레거시 'return' 타입을 'academy_end'로 마이그레이션
UPDATE shuttle_schedules 
SET type = 'academy_end' 
WHERE type = 'return';

-- 제약 조건에서 'return' 제거 (이미 academy_start/end가 추가된 상태라고 가정)
-- phase6 스크립트에서 이미 academy_start/end를 추가했으므로, 
-- 이제 'return'을 허용 목록에서 뺍니다.

DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shuttle_schedules_type_check') THEN 
        ALTER TABLE shuttle_schedules DROP CONSTRAINT shuttle_schedules_type_check; 
    END IF; 
END $$;

ALTER TABLE shuttle_schedules ADD CONSTRAINT shuttle_schedules_type_check 
CHECK (type IN ('boarding', 'dropoff', 'academy_start', 'academy_end'));

COMMENT ON COLUMN shuttle_schedules.type IS '정류장 타입: boarding(등원), dropoff(하원), academy_start(학원출발), academy_end(학원도착)';
