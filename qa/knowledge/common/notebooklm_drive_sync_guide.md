# NotebookLM + Google Drive 정책서 동기화 가이드

> 로컬 QA 정책서(`qa/knowledge/`)를 `[SQE] SCM/주문이행 AI 백과사전 (베타)` NotebookLM 노트북과 `[AI] 물류 QA 백과사전` Google Drive 폴더에 동시 동기화하는 방법.

---

## 1. 연동 구조

```
┌─────────────────────────┐       ┌────────────────────────────┐       ┌──────────────────────┐
│ 로컬 (원본)             │       │ Google Drive (소스 저장소) │       │ NotebookLM (지식베이스)│
│ qa/knowledge/*/*.md     │  ───▶ │ [AI] 물류 QA 백과사전      │  ───▶ │ [SQE] SCM/주문이행    │
│                         │ rclone│                            │ nlm   │ AI 백과사전 (베타)    │
└─────────────────────────┘       └────────────────────────────┘       └──────────────────────┘
           세희님 수정 지점                    공유 폴더 (유현주님 소유)            노트북 (SQE팀 공용)
```

- **로컬**: QA 정책서 원본 편집 위치
- **Drive 폴더**: NotebookLM이 참조하는 공유 스토리지 (여러 사람이 볼 수 있음)
- **NotebookLM**: 정책서 기반 Q&A / RAG용 노트북 — Drive 소스와 별개로 자체 인덱싱

> **핵심 규칙**: 정책 변경 시 Drive와 NotebookLM 둘 다 업데이트해야 정보 불일치가 안 생긴다.

---

## 2. 사전 준비 (최초 1회)

### 2-1. rclone 설치 및 설정

```bash
# 설치
brew install rclone

# Google Drive remote 설정 (대화형)
rclone config
# → n (new remote)
# → name: gdrive
# → Storage: drive
# → client_id / client_secret: (빈 칸 엔터, 기본값 사용)
# → scope: 1 (drive - Full access)
# → Use auto config: y → 브라우저 열림 → kurlycorp 계정으로 로그인
# → Configure as Shared Drive: n
# → 완료
```

설정 확인:

```bash
rclone lsd "gdrive:" --drive-shared-with-me | grep 백과
# 출력: [AI] 물류 QA 백과사전 가 보여야 함
```

설정 파일 위치: `/Users/jangsehui/.config/rclone/rclone.conf`

### 2-2. nlm CLI 설치 및 로그인

```bash
# 설치 (pipx 권장)
pipx install notebooklm-cli

# 설치 확인
nlm --version

# 로그인 (쿠키 기반 — 최초 1회)
nlm login
# → 브라우저에서 notebooklm.google.com 로그인 후 쿠키 자동 추출
```

로그인 상태 확인:

```bash
nlm notebook list | head -5
# 출력: 노트북 목록이 보여야 함
```

### 2-3. 폴더 · 노트북 식별자

| 리소스 | ID | 용도 |
|--------|-----|------|
| Drive 폴더 `[AI] 물류 QA 백과사전` | `1cPG0622frqGhUzl5z5OwH3hF5cBVrrmV` | 소스 원본 저장 |
| NotebookLM 노트북 `[SQE] SCM/주문이행 AI 백과사전 (베타)` | `a72e08b3-7786-49ff-a024-6d689557488d` | Q&A 백과사전 |
| 폴더 소유자 | hyunju.you_b@kurlycorp.com (유현주님) | 권한 요청 창구 |
| 폴더 URL | https://drive.google.com/drive/folders/1cPG0622frqGhUzl5z5OwH3hF5cBVrrmV |
| 노트북 URL | https://notebooklm.google.com/notebook/a72e08b3-7786-49ff-a024-6d689557488d |

> Drive 폴더는 유현주님 소유 공유 폴더다. 세희님은 편집 권한을 받아야 쓰기 가능 (2026-04-22 확보 완료). 권한이 없을 경우 유현주님께 편집자 권한 요청 필요.

---

## 3. 동기화 워크플로우

### 3-1. 신규 정책서 추가

```bash
# 1) 로컬 수정
#    qa/knowledge/<도메인>/<파일>.md 작성

# 2) 접두어 붙여서 스테이징
mkdir -p /tmp/policy_upload
cp qa/knowledge/<도메인>/<파일>.md "/tmp/policy_upload/[파트너포털] <파일>.md"

# 3) Drive 업로드
rclone copy /tmp/policy_upload "gdrive:[AI] 물류 QA 백과사전" --drive-shared-with-me --progress

# 4) NotebookLM 소스 추가
nlm source add a72e08b3-7786-49ff-a024-6d689557488d \
  --file "/tmp/policy_upload/[파트너포털] <파일>.md" \
  --title "[파트너포털] <파일>" \
  --wait

# 5) 정리
rm -rf /tmp/policy_upload
```

### 3-2. 기존 정책서 수정

```bash
# 1) 로컬 수정 완료 후

# 2) Drive 덮어쓰기 (rclone copy는 같은 이름이면 교체됨)
cp qa/knowledge/<도메인>/<파일>.md "/tmp/[파트너포털] <파일>.md"
rclone copy "/tmp/[파트너포털] <파일>.md" "gdrive:[AI] 물류 QA 백과사전" --drive-shared-with-me

# 3) NotebookLM 기존 소스 삭제 후 재등록
#    3-1) 소스 ID 조회
nlm source list a72e08b3-7786-49ff-a024-6d689557488d | grep "<파일>"
#    3-2) 삭제
nlm source delete <소스ID>
#    3-3) 재등록
nlm source add a72e08b3-7786-49ff-a024-6d689557488d \
  --file "/tmp/[파트너포털] <파일>.md" \
  --title "[파트너포털] <파일>" \
  --wait

# 4) 정리
rm "/tmp/[파트너포털] <파일>.md"
```

### 3-3. 전체 재동기화 (8개 도메인 정책서 일괄)

```bash
# 스테이징
mkdir -p /tmp/kurly_policy_upload && cd /tmp/kurly_policy_upload
cp /Users/jangsehui/qa/knowledge/goods/goods_policy.md "[파트너포털] goods_policy.md"
cp /Users/jangsehui/qa/knowledge/purchase/purchase_policy.md "[파트너포털] purchase_policy.md"
cp /Users/jangsehui/qa/knowledge/inbound/inbound_policy.md "[파트너포털] inbound_policy.md"
cp /Users/jangsehui/qa/knowledge/settlement/settlement_policy.md "[파트너포털] settlement_policy.md"
cp /Users/jangsehui/qa/knowledge/return/return_policy.md "[파트너포털] return_policy.md"
cp /Users/jangsehui/qa/knowledge/supplier/supplier_policy.md "[파트너포털] supplier_policy.md"
cp /Users/jangsehui/qa/knowledge/promotion/promotion_policy.md "[파트너포털] promotion_policy.md"
cp /Users/jangsehui/qa/knowledge/promotion/partner_promotion_policy.md "[파트너포털] partner_promotion_policy.md"

# Drive 업로드 (덮어쓰기)
rclone copy /tmp/kurly_policy_upload "gdrive:[AI] 물류 QA 백과사전" --drive-shared-with-me --progress

# NotebookLM 기존 8개 삭제 → 재등록 (세희님 확인 후 Claude에 "전체 재동기화" 요청)
```

---

## 4. 업로드 규칙

- **접두어**: 도메인 정책서는 `[파트너포털] ` 접두어 붙임 (기존 비파트너 문서와 구분용)
- **파일 포맷**: Markdown(`.md`) 원본 그대로 업로드 (NotebookLM은 md 파싱 지원)
- **공통 지식 제외**: `qa/knowledge/common/*.md` 및 `frontend/*` 는 업로드 안 함 (Claude Code CLAUDE.md에 이미 자동 로드됨)
- **대상 8개 도메인**: goods, purchase, inbound, settlement, return, supplier, promotion, partner_promotion

---

## 5. 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `error: directory not found` | 폴더 이름 변경됨 or 공유 해제 | `rclone lsd "gdrive:" --drive-shared-with-me`로 현재 폴더명 확인 |
| `403 forbidden` / `permission denied` | Drive 편집 권한 없음 | 유현주님께 편집자 권한 재요청 |
| `nlm source add` 토큰 만료 | NotebookLM 세션 만료 | `nlm login` 재실행 |
| rclone 토큰 만료 | 60분 지남 | `rclone config reconnect gdrive:` |
| 업로드했는데 NotebookLM에 안 보임 | Drive 소스 vs 직접 추가 혼동 | NotebookLM은 `nlm source add`로 별도 등록 필요 (Drive 자동 연동 아님) |

---

## 6. 참고 리소스

- rclone 공식 문서: https://rclone.org/drive/
- notebooklm-cli: https://github.com/parthshr370/notebooklm-cli
- 정책 원본 위치: `/Users/jangsehui/qa/knowledge/`
- rclone 설정: `/Users/jangsehui/.config/rclone/rclone.conf`
- 동기화 이력 메모리: `/Users/jangsehui/.claude/projects/-Users-jangsehui/memory/feedback_policy_sync_workflow.md`
