---
doc_type: prd
title: 베이비 비트 천국 (Baby Beat Heaven) — 싱글 HTML 육아 리듬 천국
status: approved
stage: 3
repository: baby-beat-heaven
linked_spec: ./baby-beat-heaven-spec.md
created: 2026-11-25
updated: 2026-11-25
---

# 베이비 비트 천국 (Baby Beat Heaven) — PRD

> **참고**: `/Users/kunkun/PRD` 심볼릭 링크 대상 외장 볼륨(`/Volumes/990PRO`)이 현재 마운트되어 있지 않아, 본 프로젝트 전용 문서 디렉터리 `docs/`에 정본 PRD/Spec 쌍을 작성하고 구현 전 계약을 고정한다. 기존 `shh.vr11.net` (`/Users/kunkun/Projects/shh-rhythm`) 프로젝트와 저장소·배포는 완전히 분리한다.

## 1. 배경 및 목표
- **현재 상태**: 기존 `shh.vr11.net` 분석 리포트(`rhythm_heaven_vs_shh_analysis.md`)에서 확인된 핵심 격차는 ① 단순 비프성 합성 음성 큐 및 결과 무음 ② 정적 포즈 스왑과 템플릿 타이틀카드 ③ 13종 유사 메커닉 및 리믹스·스킬스타·메달 부재 ④ 단층 배경 및 본게임 HUD 과다 노출이다.
- **목표**: 아기와 육아("새벽 2시 육퇴") 코미디 컨셉을 유지하면서도, 《리듬천국》과 현대 명작 리듬게임의 정수를 결합한 **단일 자립형 HTML (`index.html`)** 리듬 게임을 제작하고, 외부에서 즉시 플레이 가능한 **공개 HTTPS URL**로 배포한다.

## 2. 핵심 요구사항 (Functional Requirements)
- **REQ-001 (Zero-Dependency Single HTML & Public URL)**: 외부 런타임 에셋 없이 하나의 `index.html`로 데스크톱/모바일 브라우저에서 즉시 실행 가능하며, `shh.vr11.net`과 완전히 분리된 공개 HTTPS URL(GitHub Pages)로 접속·플레이 가능해야 한다.
- **REQ-002 (Studio WebAudio & Sample-Accurate Timing)**: `AudioContext.currentTime` 기반 Lookahead 스케줄러, 마스터링 체인(컴프레서·새추레이터·리버브·큐 덕킹), 3-포먼트 음성 합성 큐(`우웁/퉤/쫍/꺼억/쉿/까꿍/살금/삐약` 등), 씬별 전용 BGM(타이틀·메뉴·타이틀카드 4박 징글·연습·본편 5곡·결과 랭크별 루프 BGM), 그리고 8박 인터랙티브 오디오 캘리브레이션을 제공한다.
- **REQ-003 (5개 독자 메커닉 스테이지 + 그랜드 리믹스)**:
  1. `쪽쪽이 스나이퍼` (116 BPM): 2박 콜앤리스폰스 + 더블 스핏 + 슬로모 로브(스킬 스타)
  2. `꺼억! 트림 오케스트라` (108 BPM): 3박 토닥 그루브 + 홀드/릴리즈 심포닉 트림 + `쉿~` 쉼표 페이크
  3. `까꿍! 백일 사진관` (122 BPM): 셔터 타이밍 + 3방향 휩팬 연사 + 포즈 콤보 + 졸린 아빠 개그
  4. `새벽 3시! 닌자 육퇴 탈출` (112 BPM): 연속 스텔스 발걸음 + 삐약 프리즈 + **4박 암전 블라인드 박자** + 문고리 스킬 스타
  5. `육퇴 미라클 리믹스` (124 BPM): 4개 스테이지를 박자에 맞춰 스매시 컷으로 엮고 후반부 키 변조(+2반음)와 레인보우 갓레이 피날레로 마무리하는 메들리 스테이지
- **REQ-004 (World-Class Motion Graphics & Camera Rig)**: 7단계 깊이 레이어(하늘/대기 → 갓레이 → 원경 → 중경 소품 → 바닥 접촉 그림자 → 다관절 셀셰이딩 캐릭터 리깅 → 전경 프레이밍 실루엣), 스프링 물리(`Spring`), 가상 시네마 카메라(`CameraRig`: 줌·돌리·휩팬·더치틸트·암전·아이리스·갓레이), Zero-HUD 원칙(플레이어 발밑 `나` 마커 중심, 접근성 시각 보조는 설정 옵션 분리).
- **REQ-005 (Rhythm Heaven 메타 & 연출 루프)**: 박자에 맞춰 움직이는 정보창 걸터앉기 마스코트(`쪽쪽 요정`), 스테이지별 3.2초 전용 시네마틱 타이틀 카드, 무대 일체형 반투명 대화식 연습(`♪` 1문장 호흡 + `X 스킵`), 5단계 결과·에필로그 연출(1.4초 정적 → 화자 소감 → 타자기 한 줄 평 → 집중선 도장 타격 + 에필로그 루프 BGM → 스테이지×랭크별 15종 전용 1컷 만화 일러스트), 메달·스킬 스타·리듬 지수·퍼펙트 도전·해금 광원 플래시.
- **REQ-006 (입력/접근성/모바일 완성도)**: 키보드(`Space`/`Z`/`Enter`/`Arrow`/`X`/`Esc`), 마우스, 모바일 터치(`pointerdown`/`pointerup`, `touch-action: none`) 완벽 지원, 일시정지/재개, `localStorage` 자동 저장(`저장했습니다!` 토스트), 설정(볼륨·오프셋 캘리브레이션·시각 보조 토글·데모 전체 해금).
- **REQ-007 (자동 검증 및 브라우저 시각 QA)**: 차트/타이밍 정합성 자동 검증 스크립트 통과, Chromium(`ego-browser`) 실렌더링·콘솔 무오류·전 씬 스크린샷 시각 검수, 배포된 공개 HTTPS URL 실제 접속 검증.

## 3. 비목표 (Non-Goals)
- 기존 `shh.vr11.net` (`/Users/kunkun/Projects/shh-rhythm`) 코드/배포/LaunchAgent 수정 금지.
- 백엔드 서버, 로그인, DB, 외부 CDN 필수 의존성 금지.

## 4. 가정 및 경쟁 해석 (Stage 2 Critique 반영)
- **검증된 사실**: `gh` CLI가 `kunkunGames` 계정(`repo`, `workflow` 스코프)으로 인증되어 있어 신규 공개 저장소 + GitHub Pages로 즉각 영구 HTTPS URL 배포가 가능하다.
- **트레이드오프 및 결정**:
  - 단일 HTML 파일 제약 속에서 사운드 완성도를 극대화하기 위해 단순 오실레이터 대신 **3-포먼트 보컬 트랙트 합성 + 멀티버스 마스터링 + 프로시저럴 룸 리버브**를 채택한다.
  - 24개 유사 스테이지 대신 **완전히 다른 메커닉·세계관·카메라·음악을 가진 4개 주력 스테이지 + 4종을 통합한 그랜드 리믹스 1종(총 5스테이지)**에 연출 밀도를 집중한다.
  - 유저가 해금 연출도 즐기면서 리믹스도 막힘없이 체험할 수 있도록 1~4스테이지는 기본 개방, 5스테이지(리믹스)는 아무 2스테이지 클리어 시 광원 스윕 해금되며 설정에서 1클릭 전체 해금도 지원한다.

## 5. 단계별 TASK (Implementation-Ready)
- **P0**:
  - `TSK-001`: 모듈 구조(`src/*.js`) + 단일 HTML 번들러(`build.mjs`) 및 차트 검증기(`scripts/verify-charts.mjs`) 구축
  - `TSK-002`: `src/math.js`, `src/camera.js`, `src/audio.js` 핵심 엔진(스프링·파티클·시네마 카메라·마스터링/포먼트/밴드 WebAudio) 구현
  - `TSK-003`: `src/rig.js`, `src/charts.js`, `src/stages.js` 5스테이지 차트·7레이어 무대·다관절 캐릭터·타이틀카드·15종 에필로그 일러스트 구현
  - `TSK-004`: `src/game.js` 게임 상태머신·판정 엔진·마스코트 메뉴·대화식 연습·5단계 결과·캘리브레이션·QA 봇(`?bot=perfect|sloppy`) 구현 및 단일 `index.html` 빌드
  - `TSK-005`: 차트 자동 검증 + `ego-browser` Chromium 전 화면 렌더링·오디오/판정·콘솔 에러 0건·스크린샷 검수 및 폴리싱
  - `TSK-006`: 신규 GitHub 공개 저장소 생성, `index.html` 푸시, GitHub Pages 활성화, 라이브 HTTPS URL 검증 및 Discord 파일 전송

## 6. 검증 계획 (P0 Acceptance Mapping)
- `TEST-001`: `node scripts/verify-charts.mjs` — 5개 스테이지 전체 차트 박자 단조증가, 큐 선행시간, 홀드/릴리즈 쌍, 스킬 스타 1개 보장, 리믹스 subStage 전환 정합성 검증
- `TEST-002`: `node build.mjs` — 단일 `index.html` 생성, 외부 스크립트/에셋 참조 없음 확인, JS 문법 파싱 무오류 확인
- `TEST-003`: Chromium(`ego-browser`) 자동 실행 테스트 — 타이틀 → 메뉴(마스코트) → 설정/캘리브레이션 → 타이틀카드 → 연습/스킵 → 본편(`?bot=perfect` 포함 5스테이지) → 결과(도장+에필로그 만화) 전 구간 JS console/pageerror 0건 및 핵심 씬 스크린샷 육안 검수
- `TEST-004`: 공개 HTTPS URL(`https://kunkungames.github.io/baby-beat-heaven/`) HTTP 200 및 Chromium 라이브 렌더링 확인
