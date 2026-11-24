---
doc_type: spec-source
schema_version: 2
traceability_mode: req-task-test
title: 베이비 비트 천국 (Baby Beat Heaven) — Spec Source
status: approved
stage: 3
repository: baby-beat-heaven
linked_prd: ./baby-beat-heaven-prd.md
updated: 2026-11-25
---

# Baby Beat Heaven — Execution Spec Source

## Requirement Registry
- `REQ-001`: 단일 자립형 `index.html` 빌드 및 `shh.vr11.net`과 분리된 공개 HTTPS URL 배포
- `REQ-002`: `AudioContext.currentTime` 기반 Lookahead 스케줄러, 마스터링 체인, 3-포먼트 보컬 큐, 씬별 전용 BGM, 8박 캘리브레이션
- `REQ-003`: 4개 독자 메커닉 스테이지(쪽쪽이/트림/사진관/닌자탈출) + 4종 통합 그랜드 리믹스(총 5스테이지)
- `REQ-004`: 7레이어 시각 깊이, 셀셰이딩 다관절 캐릭터 리깅, 스프링 물리, 시네마틱 `CameraRig`, Zero-HUD 기본 모드
- `REQ-005`: 걸터앉은 마스코트 메뉴, 3.2초 전용 타이틀카드, 무대 일체형 대화식 연습, 5단계 결과+에필로그 루프 BGM+15종 전용 1컷 일러스트, 메달·스킬스타·리듬지수·퍼펙트 도전
- `REQ-006`: 키보드/마우스/모바일 터치 대응, 일시정지, `localStorage` 저장, 접근성/해금 설정
- `REQ-007`: 차트 자동 검증, Chromium 실렌더링·무오류·스크린샷 검수, 라이브 URL 검증

## Task Registry
- `TSK-001`: 프로젝트 골격, `build.mjs` 단일 HTML 번들러, `scripts/verify-charts.mjs` 검증기 구축
- `TSK-002`: `src/math.js`, `src/camera.js`, `src/audio.js` 구현
- `TSK-003`: `src/rig.js`, `src/charts.js`, `src/stages.js` 구현
- `TSK-004`: `src/game.js`, `src/template.html` 구현 및 단일 `index.html` 생성
- `TSK-005`: 차트 자동 검증 + Chromium(`ego-browser`) 전 구간 플레이/시각 QA 및 폴리싱
- `TSK-006`: `kunkunGames/baby-beat-heaven` GitHub Pages 공개 배포, 라이브 URL 검증, Discord 파일 전송

## Test Registry
- `TEST-001`: `node scripts/verify-charts.mjs` 차트/이벤트/홀드쌍/스킬스타/리믹스 전환 무결성 테스트
- `TEST-002`: `node build.mjs` 단일 HTML 생성 및 JS 구문 검사 (`node --check`)
- `TEST-003`: `ego-browser` Chromium E2E 렌더링, 콘솔 에러 0건, `?bot=perfect` 완주 및 스크린샷 시각 검증
- `TEST-004`: 공개 HTTPS URL 응답(200 OK) 및 외부 라이브 렌더링 검증

## Traceability
| Requirement | Tasks | Tests |
|---|---|---|
| REQ-001 | TSK-001, TSK-004, TSK-006 | TEST-002, TEST-004 |
| REQ-002 | TSK-002, TSK-004 | TEST-001, TEST-003 |
| REQ-003 | TSK-003, TSK-004 | TEST-001, TEST-003 |
| REQ-004 | TSK-002, TSK-003 | TEST-003 |
| REQ-005 | TSK-003, TSK-004 | TEST-003 |
| REQ-006 | TSK-004 | TEST-003 |
| REQ-007 | TSK-001, TSK-005, TSK-006 | TEST-001, TEST-002, TEST-003, TEST-004 |
