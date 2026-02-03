
# 🧹 프로젝트 정리 및 감사 보고서 (Project Cleanup & Audit Report)

**일자**: 2026-02-03
**상태**: 정리 승인 대기 중

본 보고서는 최근 집중 디버깅 과정에서 생성된 임시 파일, 스크립트, 그리고 코드 변경 사항을 정리한 내역입니다.

## 1. 임시 스크립트 (`scripts/`)
일회성 디버깅이나 검증을 위해 생성되었으며, 운영 환경에 더 이상 필요하지 않은 파일들입니다:

### 디버그 및 검증 스크립트 (삭제 권장)
- `check_*.ts` (예: `check_class_status.ts`, `check_dates.ts` 등) - 상태 확인용.
- `debug_*.ts` (예: `debug_shuttle_v2.ts`, `debug_sheet_write.ts` 등) - 심층 분석용.
- `verify_*.ts` (예: `verify_specific_rows.ts`, `verify_sheet_simple.ts`) - 데이터 대조용.
- `count_*.ts` / `list_*.ts` - 단순 카운트 및 목록 확인용.
- `test_*.ts` - 테스트용.
- `scan_*.ts` / `peek_*.ts` / `dump_*.ts` - 내부 데이터 조회용.

### 복구용 스크립트 (비상용으로 보존 권장)
- `force_restore_all_feb.ts` - **보존 권장** (검증된 강좌 복구 도구).
- `nuclear_shuttle_reset.ts` - **보존 권장** (셔틀 데이터 전체 초기화 도구).
- `import_shuttle_rebuild.ts` - **보존 권장** (핵심 셔틀 연동 스크립트).
- `sync_winter_shuttle_v2.ts` / `sync_2nd_enrollments_v2.ts` - **보존 권장** (참고용 구현체).

## 2. 임시 로그 및 출력 파일 (루트 디렉토리)
다음 파일들은 루트 디렉토리를 어지럽히고 있으므로 삭제를 권장합니다:
- `debug_shuttle.txt`
- `debug_shuttle_output.json`
- `sync_debug.log`
- `check_results.txt`
- 기타 `*.log` / `*.txt` 출력 파일들.

## 3. 코드 변경 사항 확인 (원상복구/정리됨)
### `src/lib/syncService.ts`
- **디버그 로깅 제거됨**: `syncData` 함수 내에 삽입했던 파일 로깅 코드(`fs.appendFileSync`)는 안전하게 제거되었습니다.
- **주석 처리된 로직**: "고아 데이터 자동 삭제(Soft Delete Orphans)" 로직은 주석 처리된 상태로 유지 중입니다. (안전 장치)

### `src/app/actions/shuttle-ops-actions.ts`
- **주석 로직**: "Phase 6 필터" 관련 로직은 비활성화 상태(주석)로 유지 중입니다.

## 4. 권장 조치 계획 (Action Plan)

1.  **임시 로그 삭제**: `del *.log *.txt *.json` (필수 설정 파일 제외)
2.  **스크립트 정리**: 디버그용 스크립트들을 삭제하거나 `scripts/archive/` 폴더로 이동.

**위 내용대로 정리를 진행하시겠습니까?**
