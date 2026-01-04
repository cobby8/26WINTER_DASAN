-- 학원 지점 명칭 정문화: '(복귀)' 제거
UPDATE shuttle_schedules 
SET location_name = REPLACE(location_name, ' (복귀)', '')
WHERE location_name LIKE '% (복귀)%';

-- 필요하다면 shuttle_ops_logs의 기록들도 정리가 필요할 수 있으나,
-- 현재 UI에서는 s.location_name을 스케줄에서 가져오므로 스케줄 테이블만 수정해도 무방합니다.
