# 프로모션 도메인 정책서
## eSCM-Front 코드 분석 기반 | 2026-04-15

---

## 1. 상태 체계

### 1-1. 파트너 프로모션 상태 (PromotionStatus)

| 상태값 | 화면 표시명 | 설명 |
|--------|------------|------|
| PROPOSAL | 신규제안 | 공급사가 제안서를 최초 등록한 상태 |
| IN_PROGRESS | 검토중 | 컬리 담당자가 검토사항 저장 후 검토 중인 상태 |
| READY_TO_AGREE | 합의대기 | 컬리가 승인 완료하여 공급사의 기명날인을 기다리는 상태 |
| AGREED | 합의완료 | 공급사가 기명날인하여 합의가 완료된 상태 |
| CANCELLED | 제안취소 | 공급사가 제안을 직접 취소한 상태 |
| REJECTION | 반려 | 컬리 담당자가 제안을 반려한 상태 |
| REQUEST_TO_CORRECT | 정정요청 | 합의완료 후 공급사가 내용 정정을 요청한 상태 |
| REQUEST_TO_TERMINATE | 해지요청 | 합의완료 후 계약해지 요청이 접수된 상태 |
| TERMINATED | 계약해지 | 계약해지가 최종 승인된 상태 |

**코드 근거**: `src/types/enums/PromotionStatus.ts`

---

### 1-2. 컬리 프로모션 상태 (KurlyPromotionStatus)

| 상태값 | 화면 표시명 | 설명 |
|--------|------------|------|
| READY | 진행예정 | 프로모션이 아직 시작되지 않은 상태 |
| IN_PROGRESS | 진행중 | 프로모션이 현재 진행 중인 상태 |
| CLOSE | 종료 | 프로모션이 종료된 상태 |

**코드 근거**: `src/types/enums/KurlyPromotionStatus.ts`

---

### 1-3. 합의 정정 상태 (PromotionCorrectionStatus)

| 상태값 | 설명 |
|--------|------|
| CANCELED | 정정 합의 취소 |
| REJECTION | 정정 합의 반려 |
| IN_PROGRESS | 정정 합의 진행중 |
| COMPLETED | 정정 합의 완료 |

**코드 근거**: `src/types/enums/PromotionCorrectionStatus.ts`

---

## 2. 상태 전이 규칙

### 2-1. 파트너 프로모션 상태 전이 흐름

```
[공급사 제안 등록]
      │
      ▼
  PROPOSAL (신규제안)
      │
      ├─ 공급사: 제안취소 가능 → CANCELLED
      ├─ 컬리: 반려 가능 → REJECTION
      │
      ▼
  IN_PROGRESS (검토중)
      │  [컬리 검토사항 저장]
      │
      ├─ 컬리: 반려 가능 (단, hasBeenRevised=true이면 반려 불가)
      │
      ▼
  READY_TO_AGREE (합의대기)
      │  [컬리 승인]
      │
      ├─ 컬리: 반려 가능 (합의서 화면에서)
      ├─ 컬리: 수동합의 가능 (MD 권한)
      │
      ▼
  AGREED (합의완료)
      │  [공급사 기명날인 + 합의완료 클릭]
      │
      ├─ 공급사: 정정요청 가능 (프로모션 종료일 이전만) → REQUEST_TO_CORRECT
      └─ 공급사/MD: 계약해지 요청 가능 (프로모션 종료일 이전, 날인O + 첨부파일X)
            │
            ▼
      REQUEST_TO_TERMINATE → TERMINATED
```

**핵심 제약 규칙**:
- `제안수정 Y(hasBeenRevised=true)` 상태의 제안서는 일괄승인/일괄반려 불가
- `제안수정 Y` 상태에서는 개별 반려도 불가 (단건 상세에서도 차단)
- 반려(REJECTION) 후 복구 불가 (안내 메시지 명시)
- 제안취소(CANCELLED) 후 복구 불가 (안내 메시지 명시)

**코드 근거**: `PromotionDetailView.vue`, `PromotionListView.vue`, `SupplierPromotionDetailView.vue`

---

## 3. 입력값 검증 규칙

### 3-1. 공급사 프로모션 제안 등록 시 필수 입력 항목

| 항목 | 검증 규칙 | 오류 메시지 |
|------|-----------|------------|
| 프로모션 제목 | 필수 입력 | '필수항목을 입력해주세요.' |
| 분담률 (shareRatio) | 필수 입력 | '필수항목을 입력해주세요.' |
| 프로모션 시작일 | 필수 입력 | '필수항목을 입력해주세요.' |
| 프로모션 종료일 | 필수 입력 | '필수항목을 입력해주세요.' |
| 제안 상품 | 최소 1개 이상 | '제안상품을 추가해주세요.' |
| 할인금액 (discountPrice) | 각 상품 필수 | '최대가능수량을 모두 입력해주세요.' |
| 최대가능수량 | 각 상품 필수, 0 불가 | '최대가능수량을 모두 입력해주세요.' |

**코드 근거**: `SupplierPromotionProposalView.vue > checkData()`

---

### 3-2. 할인금액 및 할인율 제약

| 규칙 | 내용 | 코드 근거 |
|------|------|---------|
| 할인금액 상한 | 판매가(salesPrice)를 초과할 수 없음 (초과 시 0으로 초기화) | `SupplierPromotionDetailList.vue > onDataChange()` |
| 할인율 계산 | `Math.floor(할인금액 / 판매가 * 100)`으로 자동 계산 (소수점 버림) | `PromotionDetailView.vue` |
| 할인율 경고 표시 | 할인율 50% 이상 시 빨간색 표시 (차단은 아님) | `SupplierPromotionDetailList.vue` |
| 최대예상비용 상한 | 상품당 20억 원(2,000,000,000원) 미만 | `SupplierPromotionDetailList.vue` |
| 최대예상비용 초과 시 | 최대가능수량을 null로 초기화하여 재입력 유도 | `SupplierPromotionDetailList.vue > onDataChange()` |

---

### 3-3. 분담률(shareRatio) 제약

| 규칙 | 내용 |
|------|------|
| 최대값 | 100% 이하 (초과 시 오류: '분담률은 100 이하로 조정해주시기 바랍니다.') |
| PB/NPB 상품 | 분담률 0%로만 제안 가능 (분담률 > 0이면 오류 차단) |
| 오류 메시지 | 'PB 또는 NPB 상품은 분담률 0% 로만 제안 가능합니다. 제안불가 마스터코드: [코드목록]' |

**코드 근거**: `SupplierPromotionProposalView.vue > checkData()`

---

### 3-4. 프로모션 기간 제약

| 규칙 | 내용 |
|------|------|
| 시작일/종료일 순서 | 시작일이 종료일보다 하루 이상 이후이면 오류: '제안 시작일과 종료일을 확인해주세요.' |
| 중복 제안 금지 | 동일 상품이 프로모션 시작일~종료일 하루라도 겹치면 제안 불가 |
| 기간 여유 권고 | 제안일로부터 여유 있는 일자 기입 권고 (유의사항 안내 문구) |
| 초기 날짜 설정 | 제안 화면 진입 시 시작일 = 오늘 +21일, 종료일 = 오늘 +27일로 자동 세팅 |

**코드 근거**: `SupplierPromotionProposalView.vue`

---

### 3-5. 수정 가능 기간

| 상태 | 공급사 수정 가능 여부 |
|------|---------------------|
| PROPOSAL (신규제안) | 수정 가능 (제안변경 버튼 노출) |
| IN_PROGRESS (검토중) | 수정 가능 (제안변경 버튼 노출) |
| READY_TO_AGREE 이후 | 수정 불가 (버튼 비노출) |

**코드 근거**: `SupplierPromotionDetailView.vue > isEditable = (status === PROPOSAL || status === IN_PROGRESS)`

---

## 4. 상태별 UI 제어 (버튼 활성화 조건)

### 4-1. 임직원용 상세 화면 버튼 조건

| 버튼 | 표시 조건 | 권한 코드 |
|------|----------|----------|
| 검토사항 저장 | 상태 = PROPOSAL | `PROMOTION_IN-PROGRESS_SINGLE_PROMOTION` |
| 승인 | 상태 = IN_PROGRESS AND hasBeenRevised = false | `PROMOTION_APPROVE_SINGLE_PROMOTION` |
| 변경사항 저장 | 상태 = IN_PROGRESS | `PROMOTION_MODIFY_SINGLE_PROMOTION` |
| 수동합의 | 상태 = READY_TO_AGREE | `PROMOTION_AGREE-BY-MD_SINGLE_PROMOTION` |
| 합의서 (이동) | 상태 = READY_TO_AGREE | - |
| 반려 | 상태 = PROPOSAL 또는 IN_PROGRESS 또는 READY_TO_AGREE | `PROMOTION_REJECT_SINGLE_PROMOTION` |
| 취소 | 상태 = PROPOSAL | - |
| 닫기 | 상태 ≠ PROPOSAL | - |

**코드 근거**: `PromotionDetailView.vue`

---

### 4-2. 임직원용 목록 화면 일괄 버튼 조건

| 버튼 | 표시/실행 조건 |
|------|--------------|
| 일괄승인 | 선택된 모든 항목의 상태가 IN_PROGRESS여야 함, hasBeenRevised=true 포함 시 차단 |
| 일괄검토 | 선택된 항목 중 READY_TO_AGREE 이후 상태가 있으면 차단 |
| 일괄반려 | hasBeenRevised=true 포함 시 차단 |

**오류 메시지**:
- 일괄승인: '검토중 상태인 상품만 일괄승인이 가능합니다.'
- 일괄반려: '제안수정 Y인 제안서는 일괄승인/반려가 불가능합니다.'
- 일괄검토: '합의대기 상태인 상품은 일괄검토할 수 없습니다.'

**코드 근거**: `PromotionListView.vue`

---

### 4-3. 공급사용 상세 화면 버튼 조건

| 버튼 | 표시 조건 |
|------|----------|
| 제안변경 | isEditable = true (PROPOSAL 또는 IN_PROGRESS 상태) |
| 제안취소 | isEditable = true |
| 합의서 기명날인 | 상태 = READY_TO_AGREE |
| 정정요청 취소 | 상태 = REQUEST_TO_CORRECT |
| 날인 및 서명 (정정합의) | editableToCorrect = true |
| 합의서 (조회) | 상태 = AGREED, REQUEST_TO_TERMINATE, REQUEST_TO_CORRECT, TERMINATED (정정 중이 아닐 때) |

**코드 근거**: `SupplierPromotionDetailView.vue`

---

### 4-4. 합의서 화면 버튼 조건 (공급사)

| 버튼 | 활성화 조건 |
|------|-----------|
| 합의완료 | 상태 = READY_TO_AGREE (enableToAgree = true) |
| 합의정정 요청 | 상태 = AGREED AND 프로모션 종료일 이전 |
| 계약해지 | 상태 = AGREED AND 프로모션 종료일 이전 AND 기명날인O (supplierSeal≠null) AND 첨부파일X (supplierReference=null) |
| 계약해지 요청취소 | 상태 = REQUEST_TO_TERMINATE AND 프로모션 종료일 이전 AND 기명날인O AND 첨부파일X |

**코드 근거**: `SupplierPromotionAgreedView.vue > findPromotionInfo()`

---

### 4-5. 합의서 화면 버튼 조건 (임직원)

| 버튼 | 활성화 조건 | 권한 코드 |
|------|-----------|----------|
| 합의서 다운로드 | 항상 표시 | `PROMOTION_DOWNLOAD-FILE_SINGLE_AGREEMENT-PROMOTION` |
| 첨부 합의서 다운로드 | supplierReference 있음 AND 상태 = READY_TO_AGREE, AGREED, REQUEST_TO_TERMINATE, REQUEST_TO_CORRECT, TERMINATED | `PROMOTION_DOWNLOAD-FILE_SINGLE_AGREEMENT-BY-MD-PROMOTION` |
| 첨부 정정 합의서 다운로드 | correctionReference 있음 또는 진행중 정정건의 첨부파일 있음 | `PROMOTION_DOWNLOAD-COLLECTION_SINGLE_PROMOTION` |
| 첨부 계약해지 합의서 다운로드 | 상태 = TERMINATED AND terminationReference 있음 | `PROMOTION_DOWNLOAD-FILE_SINGLE_TERMINATION-PROMOTION` |
| 계약해지 요청 | 상태 = AGREED AND isCorrected | `PROMOTION_TERMINATE-SINGLE_PROMOTION` |
| 계약해지 요청 승인 | 상태 = REQUEST_TO_TERMINATE | `PROMOTION_APPROVE-TERMINATION_SINGLE_PROMOTION` |
| 계약해지 요청 반려 | 상태 = REQUEST_TO_TERMINATE | `PROMOTION_REJECT-TERMINATION_SINGLE_PROMOTION` |
| 합의정정 요청 승인 | 상태 = REQUEST_TO_CORRECT | `PROMOTION_APPROVE-CORRECTION_SINGLE_PROMOTION` |
| 합의정정 요청 반려 | 상태 = REQUEST_TO_CORRECT | `PROMOTION_REJECT-CORRECTION_SINGLE_PROMOTION` |

**코드 근거**: `PromotionAgreedView.vue`

---

## 5. 동의서(합의서) 정책

### 5-1. 합의서 템플릿 버전

| 버전 | 파일 경로 | 적용 시점 |
|------|----------|---------|
| V1 | `promotionAgreementTemplateV1/` | 구버전 합의서 조회 |
| V2 | `promotionAgreementTemplateV2/` | 구버전 합의서 조회 |
| V3 | `promotionAgreementTemplateV3/` | 현재 신규 합의서 적용 (Constants.PROMOTION_TEMPLATE_VERSION = 3) |

**버전 선택 규칙**:
- 기본: 프로모션에 저장된 `agreedTemplateVersion` 사용
- agreedTemplateVersion 없으면: 현재 최신 버전(V3) 사용
- 정정요청 상태 + 진행중 정정건 있음: `inProgressPromotionCorrections.promotionCorrectionTemplateVersion` 사용
- 정정완료 상태 + 완료된 정정건 있음: `completedPromotionCorrections.promotionCorrectionTemplateVersion` 사용
- 해지요청/해지완료 상태 + terminateTemplateVersion 있음: `terminateTemplateVersion` 사용

**코드 근거**: `PromotionAgreedView.vue > templateComponent getter`, `Constants.PROMOTION_TEMPLATE_VERSION = 3`

---

### 5-2. 합의(기명날인) 가능 조건

| 조건 | 규칙 |
|------|------|
| 합의완료 실행 가능 조건 | 반드시 기명날인(서명) 먼저 완료 후 합의완료 클릭 가능 |
| 날인 없이 합의완료 시도 | 오류: '기명날인 후 합의완료 해주시기 바랍니다.' |
| 중복 날인 방지 | 이미 기명날인 된 합의서에 재시도 시: '이미 기명날인 된 합의서 입니다.' (HTTP 304 응답) |
| 합의 가능 상태 | 상태 = READY_TO_AGREE 일 때만 합의완료 버튼 활성화 |

**코드 근거**: `SupplierPromotionAgreedView.vue > onAgree()`

---

### 5-3. 합의 정정 요청 조건 (공급사)

| 조건 | 규칙 |
|------|------|
| 정정 요청 가능 상태 | AGREED 이고 프로모션 종료일 이전 |
| 정정 가능 범위 | 프로모션 종료일을 기존 종료일 이전으로만 변경 가능 (연장 불가) |
| 종료일 최솟값 | 시작일보다 이전일 수 없음 |
| 첨부파일 | 서면 날인한 합의서 PDF 1개 첨부 필수 (PDF 형식만 허용) |
| 정정 철회 | 정정요청 취소 가능, 단 이미 승인/반려된 경우 취소 불가 |
| 오류 메시지 | '이미 정정요청이 승인/반려 처리되어 요청 취소가 불가합니다.' |

**코드 근거**: `SupplierPromotionDetailView.vue`, `SupplierPromotionAgreedView.vue`

---

### 5-4. 합의 정정 승인 시 안내사항 (임직원)

합의정정 요청 승인 시 아래 두 가지 사항 확인 후 처리:
1. 이미 기 체결된 프로모션은 분담률이 변경되거나 공급사 부담금액이 증가하는 방향으로 정정 불가
2. 진행 중인 컬리 프로모션에 지원되어 있는 경우, 동일 상품으로 신규 합의하더라도 추가 지원 불가

**코드 근거**: `PromotionAgreedView.vue > handleApproveRequstToCorrectClick()`

---

## 6. 수정 위임 정책

### 6-1. 위임 합의서 첨부 (정정 위임)

| 항목 | 규칙 |
|------|------|
| 첨부 파일 형식 | PDF만 허용 (accept="pdf") |
| 첨부 파일 개수 | 1개만 첨부 가능 |
| 위임 첨부 후 변경 불가 | 파일 첨부 후 확인 클릭 시 변경 불가 (안내 문구 표시) |

**코드 근거**: `PromotionCorrectionDelegateRequestModalView.vue`

---

## 7. 상품 추가/제외 규칙 (파트너 프로모션)

### 7-1. 제안 상품 추가

| 규칙 | 내용 |
|------|------|
| 추가 가능 시점 | 상태 = PROPOSAL 또는 IN_PROGRESS (isEditable=true일 때) |
| 추가 불가 조건 1 | 영구중단된 상품 제안 불가 (서버 검증 결과 isAvailableUseStatus=false) |
| 추가 불가 조건 2 | 다른 프로모션과 날짜가 하루라도 겹치는 상품 제안 불가 (duplicate=true) |
| 오류 처리 | 영구중단: '[상품명]은 영구중단된 상품으로 제안할 수 없습니다.' |
| | 중복: '상품 N건은 다른 프로모션에 제안된 상품입니다. 해당 상품 제외 후 제안 가능합니다.' |
| 최대가능수량 기본값 | 새 상품 추가 시 50,000개로 자동 설정 |

**코드 근거**: `SupplierPromotionProposalView.vue > onAddItems()`, `onRegisterPromotion()`

---

### 7-2. 제안 상품 제외 (삭제)

| 규칙 | 내용 |
|------|------|
| 삭제 가능 시점 | 상태 = PROPOSAL 또는 IN_PROGRESS (isEditable=true일 때) |
| 검토중 단계 제안수정 상품 삭제 | hasBeenRevised=true인 경우 adaptiveItems에서 삭제 |
| 일반 상품 삭제 | goodsId 기준으로 목록에서 제거 |

**코드 근거**: `SupplierPromotionDetailView.vue > onDeleteItems()`

---

## 8. 파트너 프로모션 vs 컬리 프로모션 차이

### 8-1. 도메인 역할 비교

| 항목 | 파트너 프로모션 (promotions) | 컬리 프로모션 (kurlyPromotions) |
|------|---------------------------|-------------------------------|
| 주체 | 공급사가 제안 → 컬리가 검토/승인 | 컬리(PRM)가 생성 → MD가 파트너사 지원 관리 |
| 상태 수 | 9개 (PROPOSAL~REQUEST_TO_CORRECT) | 3개 (READY, IN_PROGRESS, CLOSE) |
| 합의서 | 공급사 기명날인 + 첨부 합의서 PDF | 별도 합의서 없음 |
| 수정 주체 | 공급사 (제안, 검토중 단계) + 컬리 | PRM 역할 (READY 상태에서만) |
| 기간 제어 | 프로모션 시작일/종료일 (일 단위) | 시작일시/종료일시 (시분 단위) |
| 지원 마감 | 없음 | 지원 마감일시(dueDate) 별도 설정 |
| 일괄등록 | 없음 (단건 제안만) | 엑셀 일괄등록 지원 (최대 500건) |
| 정산 방식 | 상계처리 / 일반 정산 선택 | 별도 정산 방식 없음 |
| 카테고리(태그) | 없음 | 소카테고리 태그 최대 10개 |

---

### 8-2. 컬리 프로모션 편집 권한

| 역할 | 편집 가능 조건 |
|------|--------------|
| PRM 역할 | 상태 = READY (진행예정)일 때만 수정 가능 |
| MD 역할 | 상태 = READY AND 지원 마감일시가 현재 시각 이전일 때만 수정 가능 |
| CO / COQA 역할 | 읽기 전용 (수정 불가, 닫기 버튼만 표시) |

**코드 근거**: `KurlyPromotionDetailView.vue > isEditablePRM`, `isEditableMD`

---

## 9. 공급사 화면 vs 임직원 화면 차이

### 9-1. 기능 접근 범위 비교

| 기능 | 공급사 화면 | 임직원 화면 |
|------|-----------|-----------|
| 프로모션 제안 등록 | 가능 (유의사항 확인 및 제안) | 불가 |
| 제안 취소 | 가능 (PROPOSAL/IN_PROGRESS) | 불가 (반려 처리) |
| 검토사항 저장 | 불가 | 가능 (PROPOSAL → IN_PROGRESS) |
| 승인 (합의대기 전환) | 불가 | 가능 (IN_PROGRESS 상태) |
| 일괄승인/반려/검토 | 불가 | 가능 (권한 있는 역할) |
| 수동합의 | 불가 | 가능 (MD 권한) |
| 합의정정 요청 | 가능 (AGREED 상태, 종료일 이전) | 불가 (정정 요청 승인/반려만 가능) |
| 계약해지 요청 | 가능 (AGREED, 날인O, 첨부X) | 가능 (AGREED, isCorrected=true, MD 권한) |
| 제안내역 다운로드 | 불가 | 가능 (권한 코드: `PROMOTION_DOWNLOAD-LIST_SINGLE_PROMOTION`) |

---

### 9-2. 검색 기본값 차이

| 항목 | 공급사 목록 | 임직원 목록 |
|------|-----------|-----------|
| 기본 검색 필드 | 상품명 (goodsName) | 공급사명 (supplierName) |
| MD 역할 로그인 시 | - | 담당 MD 자동 필터링 |
| AMD 역할 로그인 시 | - | 담당 지원MD 자동 필터링 |

---

## 10. 다운로드 정책

### 10-1. 제안/합의내역 다운로드 제한

| 규칙 | 내용 |
|------|------|
| 조회 기간 제한 | 최대 31일 이내 기간만 다운로드 가능 |
| 오류 메시지 | '조회 기간을 31일 이내로 설정하여 검색하신 후, 지원내역 다운로드 받으시기 바랍니다.' |
| 선택 다운로드 | 목록에서 항목 선택 시 선택 항목만 다운로드, 미선택 시 조회 결과 전체 다운로드 |

**코드 근거**: `Promotions.ts > handlePromotionListExcelDownload()`, `Constants.PROMOTION_DOWNLOAD_RESTRICTED_DATE = 31`

---

## 11. 일괄등록 규칙 (컬리 프로모션)

### 11-1. 일괄등록 파일 형식

- 파일 형식: `.xlsx` (Excel)
- 시트 구성: '상품업로드양식' + '담당PRM' 시트 필수 포함
- 필수 컬럼: 프로모션 명, 프로모션 시작일시, 프로모션 종료일시, 지원 마감일시, 담당PRM1~3, 카테고리1~10, 일정계획

### 11-2. 일괄등록 건수 제한

| 항목 | 제한 |
|------|------|
| 최대 등록 건수 | 500건 (초과 시 차단) |
| 오류 메시지 | '최대 500건 까지 일괄등록 가능합니다. 초과한 프로모션(행)을 제거 후 업로드하시기 바랍니다.' |

### 11-3. 필드별 검증 규칙

| 필드 | 검증 규칙 |
|------|----------|
| 프로모션 명 | 필수 입력, 최대 40자 |
| 프로모션 시작일시 | 필수, YYYY-MM-DD HH:MM 형식, 현재 날짜 다음날 이후만 허용 |
| 프로모션 종료일시 | 필수, YYYY-MM-DD HH:MM 형식, 현재 날짜 다음날 이후만 허용 |
| 지원 마감일시 | 필수, YYYY-MM-DD HH:MM 형식, 현재 날짜 이후 AND 프로모션 시작일시 이전 |
| 시작/종료 기간 | 시작일시가 종료일시보다 이전이어야 함 |
| 담당PRM 코드 | 필수 (최소 1명), 숫자+대문자영문만 허용, 시스템에 등록된 코드만 허용 |
| 카테고리 | 필수 (최소 1개), 최대 20자, 한글/영문 대소문자/숫자/밑줄(_)만 허용 |
| 중복 PRM/카테고리 | 동일 코드/태그 중복 시 하나로 합산 처리 |

**코드 근거**: `KurlyPromotionBatchRegistrationView.vue > validationCheck()`

---

## 12. 프로모션 코드 검색 규칙

| 규칙 | 내용 |
|------|------|
| 프로모션 제안코드 길이 | 정확히 19자리여야 함 |
| 허용 문자 | 숫자, 대문자 영문, 밑줄(_)만 허용 |
| 복수 코드 검색 | 쉼표(,) 또는 공백으로 구분 (공백 입력 시 자동으로 쉼표로 변환) |
| 최대 검색 건수 | 500개 |

**코드 근거**: `PromotionListView.vue > search()`, `SupplierPromotionListView.vue > search()`

---

## 13. 정산 방식 (공급사 프로모션)

| 방식 | 설명 |
|------|------|
| 상계처리 정산 (offSet=true) | 기본값, 월 정산에서 상계 처리 |
| 일반 정산 (offSet=false) | 컬리에 별도 입금하는 방식, 담당자와 협의 후 선택 |

**안내 문구**: '일반 정산은 월 정산 시, 컬리에 별도 입금하시는 정산 방식입니다.'
**주의사항**: 프로모션 예상비용은 세금계산서 발행 불가 거래 (안내 문구 명시)

**코드 근거**: `SupplierPromotionProposalView.vue`

---

## 14. 예상판매수량 입력 정책

| 규칙 | 내용 |
|------|------|
| 검토사항 저장 시 | 모든 상품의 예상판매수량 필수 입력 |
| 승인 시 | 모든 상품의 예상판매수량 필수 입력 (0 또는 공란 불가) |
| 예상판매수량 > 최대가능수량 | 저장은 가능하나 경고 안내: '예상판매수량이 최대가능수량보다 더 큰 상품이 포함되어 있습니다.' |
| 경고 후 조치 | 저장은 되었으나 공급사와 조율하여 수정 권고 (차단은 아님) |
| 임직원 화면 표시 | 예상판매수량 > 최대가능수량 시 빨간색 굵은 텍스트로 표시 |
| 최대 입력값 제한 | 최대가능수량 초과 입력 시 자동으로 최대가능수량으로 보정 |

**코드 근거**: `PromotionDetailView.vue > onSaveExamine()`, `PromotionDetailList.vue > onDataChange()`

---

## 15. 승인 전 제안 정보 변경 감지 정책

승인/검토사항 저장 직전에 제안 정보 변경 여부를 서버에서 확인합니다.

| 상황 | 처리 |
|------|------|
| 변경 없음 (isChanged=false) | 정상적으로 승인/저장 진행 |
| 변경 있음 (isChanged=true) | 처리 차단 후 화면 새로고침 강제, 다시 확인 요청 |
| 안내 메시지 | '제안 정보가 변경된 상품이 있습니다. 페이지가 새로고침 되며, 다시 확인하시기 바랍니다.' |

**코드 근거**: `PromotionDetailView.vue > onSaveExamine()`, `onAprovePromotion()`

---

## 16. ⚠️ 정책 확인 필요 항목

| 항목 | 내용 |
|------|------|
| PromotionApprovalAuthIdList | Constants에 특정 이메일 계정 목록이 하드코딩되어 있음. 특수 권한 계정 범위 및 목적 확인 필요 |
| 할인율 50% 경고 | 50% 이상 시 빨간색 표시만 하고 차단은 없음. 추가 승인 프로세스 여부 확인 필요 |
| 최대가능수량 기본값 50,000 | 상품 추가 시 자동 50,000개 설정. 업종·상품별 기본값 변경 정책 여부 확인 필요 |
| 검토중 단계 hasBeenRevised | IN_PROGRESS 상태에서 hasBeenRevised=true 전환 트리거 조건 확인 필요 (프론트 코드에서 확인 불가) |
| 수동합의 범위 | 수동합의(PROMOTION_AGREE-BY-MD) 사용 시 공급사 합의 절차 생략 여부 확인 필요 |
| 컬리 프로모션 지원 취소 | MD 역할이 '지원 취소하기' 클릭 시 즉시 삭제됨. 복구 방법 확인 필요 |
| 일괄등록 엑셀 양식 시트명 | '상품업로드양식' 시트명 불일치 시 일괄 오류. 파일 양식 버전 관리 정책 확인 필요 |
