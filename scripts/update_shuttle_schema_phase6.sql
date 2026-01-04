-- Phase 6: 학원 지점 타입 확장 및 제약 조건 갱신
-- 기존 'return' 타입을 유지하면서 'academy_start', 'academy_end' 정밀 타입을 추가합니다.

DO $$
BEGIN
    -- 기존 제약 조건 삭제
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shuttle_schedules_type_check') THEN
        ALTER TABLE shuttle_schedules DROP CONSTRAINT shuttle_schedules_type_check;
    END IF;
END $$;

-- 'academy_start' (학원 출발), 'academy_end' (학원 도착) 추가
ALTER TABLE shuttle_schedules 
ADD CONSTRAINT shuttle_schedules_type_check 
CHECK (type IN ('boarding', 'dropoff', 'return', 'academy_start', 'academy_end'));

COMMENT ON COLUMN shuttle_schedules.type IS '운행 타입: boarding(등원), dropoff(하원), return(복귀-레거시), academy_start(학원출발), academy_end(학원도착)';
