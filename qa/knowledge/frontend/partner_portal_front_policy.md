# partner-portal-front 프론트엔드 정책서

> 레포: `thefarmersfront/partner-portal-front`
> 앱 구성: **파트너 앱** (공급사용) + **어드민 앱** (컬리 내부 임직원용) + **공유 패키지** (components, utils)
> 분석일: 2026-04-15

---

## 목차
1. [공통/인증/권한 정책](#1-공통인증권한-정책)
2. [발주(purchaseOrder) 정책](#2-발주purchaseorder-정책)
3. [정산(settlement) 정책](#3-정산settlement-정책)
4. [프로모션(promotion) 정책](#4-프로모션promotion-정책)
5. [공급사(supplier) 정책](#5-공급사supplier-정책)

---

## 1. 공통/인증/권한 정책

### 1.1 인증/접근 정책

| 항목 | 정책 내용 | 근거 파일 |
|------|-----------|-----------|
| 인증 실패 처리 | 미인증 사용자 접근 시 "인증되지 않은 사용자입니다." 메시지와 함께 접근 차단 | `admin/src/constants/errorCodes.js` |
| Okta 연동 검증 | Okta에 존재하지 않거나 비활성화된 계정은 등록 불가 | `admin/src/constants/errorCodes.js` |
| 계정 상태 구분 | 활성화 / 비활성화 / 사용안함 3단계 | `admin/src/constants/common.js` |
| 앱 자동 갱신 주기 | 10분(600,000ms)마다 자동 갱신 (파트너/어드민 공통) | `partner/src/constants/common/apps.js` |
| 사용자 권한 구분 | 컬리 내부직원(KURLY) / 공급사 사용자(SUPPLIER) | `admin/src/constants/common.js` |

### 1.2 권한 체계

**권한 리소스 유형 4가지:**

| 유형 | 설명 |
|------|------|
| 기능(ACTION) | 버튼/기능 단위 권한 |
| 대메뉴(PRIMARY_MENU) | 1단계 메뉴 접근 권한 |
| 중메뉴(SECONDARY_MENU) | 2단계 메뉴 접근 권한 |
| 주역할(MAIN_ROLE) | 역할 단위 전체 권한 |

**권한 그룹 구분:**
- 기본권한그룹: 모든 계정에 반드시 부여
- 특수권한그룹: 선택적으로 추가 부여

**도메인별 주요 권한 코드 수:**

| 도메인 | 권한 코드 수 |
|--------|-------------|
| 발주 관리 | 22종 |
| 정산 관리 | 17종 |
| 발주승인 설정 | 12종 |
| 공급사 관리 | 8종 |
| 계정/권한그룹/리소스 관리 | 8종 |

근거: `admin/src/constants/authorizationResources.js`

### 1.3 공통 유효성 검증 규칙

| 항목 | 허용 형식 | 근거 |
|------|-----------|------|
| 이메일 | 영문자/숫자/`.`/`-`/`_`/`()`+`@`+도메인 | `admin/src/constants/common.js` |
| 권한/권한그룹 코드 | 영문 대문자/숫자/`-`/`_`, 공백 없이, 최대 80자 | `admin/src/constants/common.js` |
| 사업자번호 | `######-#######` 형식(하이픈 포함) | `admin/src/constants/supplier/errorMessages.js` |
| 연락처 | `0**-****-****` 형식 | `admin/src/constants/supplier/errorMessages.js` |
| 지급일 | 0~99 정수 | `admin/src/constants/supplier/errorMessages.js` |
| 발주금액 | 1원~999,999,999원 | `admin/src/constants/common.js` |
| 축산물 이력번호 | 숫자 12~24자리 | `partner/src/utils/purchase/validation.js` |
| 입력값 공백 처리 | 모든 문자열 저장 전 앞뒤 공백 자동 제거(trim) | `packages/utils/src/utils/trimAllString.js` |

**권한 등록 필수 항목:** 권한코드, 권한명, 권한구분

**권한그룹 등록 필수 항목:** 그룹코드(등록 후 변경 불가), 그룹명, 사용여부, 그룹구분, 적용권한(최소 1개)

**계정 등록 필수 항목:** 이메일, 이름, 초기 비밀번호, 인증 메일 주소, 기본권한그룹

### 1.4 날짜/시간 처리 정책

| 포맷 | 형식 | 사용처 |
|------|------|--------|
| 기본 날짜 | `YYYY-MM-DD` | 검색 필터, API 요청 |
| 날짜+시간 | `YYYY-MM-DD HH:mm:ss` | 목록 화면 표시 |
| 한글 날짜 | `YYYY년 MM월 DD일` | 사용자 안내 화면 |
| 한글 연월 | `YYYY년 MM월` | 월별 조회 |
| 파일명용 | `YYYYMMDD HHmmss` | 다운로드 파일명 |
| API 요청용 | `YYYY-MM-DDTHH:mm:ss` | ESCM API 요청 |
| 로케일 | 한국어(ko) | 전체 |

근거: `packages/utils/src/constants/dateTime.js`, `partner/src/constants/common/dateTime.js`

### 1.5 페이징/정렬 정책

| 항목 | 정책 |
|------|------|
| 기본 페이지 크기 | 50건/페이지 (파트너/어드민 공통) |
| 발주 일별 상세 페이지 크기 | 500건/페이지 |
| 다중 검색 구분자 | 콤마(`,`) |
| 다중 검색 최대 개수 | 80개 (초과 시 앞 80개만 유지) |

근거: `partner/src/constants/common/values.js`, `packages/utils/src/utils/multiSearch.js`

### 1.6 파일 업로드/다운로드 정책

| 항목 | 정책 |
|------|------|
| 파일 형식 검증 | 허용 확장자 외 선택 시 경고 후 초기화 |
| 파일 크기 검증 | 최대 용량 초과 시 차단 |
| 엑셀 업로드 최대 행 수 | 1,000건 |
| 엑셀 양식 불일치 | 업로드 차단 |
| API 일반 타임아웃 | 60초 |
| 엑셀 업로드 타임아웃 | 3,600초(1시간) |

근거: `packages/utils/src/utils/fileUpload.js`, `packages/components/src/components/common/FileUploader/FileUploader.jsx`

### 1.7 토스트/알림 정책

| 항목 | 정책 |
|------|------|
| 토스트 유형 | 성공(초록), 경고(노랑), 오류(빨강), 정보(파랑) |
| 토스트 위치 | 화면 우측 상단 |
| 토스트 유지 시간 | 3초 후 자동 소멸 |
| 중복 토스트 처리 | 동일 메시지 토스트가 이미 있으면 기존 삭제 후 새 토스트 표시 |
| null 값 표시 | 화면에 `-`로 표시 |

근거: `packages/components/src/components/common/Toast/Toast.jsx`, `packages/utils/src/utils/toast.js`

---

## 2. 발주(purchaseOrder) 정책

### 2.1 발주 상품 상태 전이

```
발주예정(SCHEDULED)
  → 발주생성(CREATED)
  → 일CAPA 확인필요(REQUIRED_CHECK_CAPA)
  → 일CAPA 검사완료(FINISHED_CHECK_CAPA)
  → 과발주 확인필요(REQUIRED_CHECK_EXCESS)
  → 과발주 승인대기(WAITING_APPROVAL_EXCESS)
     → 과발주 반려(REJECT_EXCESS)  [반려 경로]
  → 공급사 승인대기(WAITING_APPROVAL_SUPPLIER)
  → 컬리 승인대기(WAITING_APPROVAL_KURLY)
  → 발주확정(CONFIRMED)
  → 발주확정_명세서생성완료(ISSUED)
  ※ 취소(CANCELED) - 모든 단계에서 전환 가능
```

근거: `admin/src/constants/purchaseOrder/types.js`, `partner/src/constants/purchaseOrder/types.js`

### 2.2 상태별 허용 동작

| 상태 | 일괄수정/엑셀 업로드 | 발주수량 수정 |
|------|---------------------|--------------|
| 발주예정 | 가능 | 가능 |
| 발주생성 | 가능 | 가능 |
| 공급사 승인대기 | 가능 | 가능 |
| 과발주 확인필요 | 가능 | 가능 |
| 과발주 승인대기 | 가능 | 가능 |
| 과발주 반려 | 가능 | 가능 |
| 일CAPA 확인필요 | 가능 | 가능 |
| 일CAPA 검사완료 | 가능 | 가능 |
| **컬리 승인대기** | **불가** | **불가** |
| **발주확정** | 가능 | **불가** |
| **발주확정_명세서생성완료** | **불가** | **불가** |
| **취소** | **불가** | **불가** |

근거: `partner/src/constants/purchaseOrder/types.js` - `DISABLED_BULK_UPDATE_PURCHASE_ORDER_PLAN_GOODS_STATUSES`

### 2.3 발주 등록 필수 입력값

| 필수 항목 | 비고 |
|----------|------|
| 발주수량 | 0 입력 시 확인 팝업 후 허용 |
| 입고예정일 | Invalid Date도 오류 처리 |
| 입고지(fulfillmentCenter) | 필수 선택 |
| 입고지 상세(dock) | 필수 선택 |
| 경유센터(waypoint) | 필수 선택 |
| 판매방법(salesProcess) | 필수 선택 |
| 출고방법(shippingProcess) | 컬리픽업+밀크런픽업 마스터인 경우 미선택 허용 |
| 발주구분 | 필수 선택 |

근거: `admin/src/features/purchaseOrder/purchaseOrderPlanRegistration/PurchaseOrderPlanRegistration.jsx`

### 2.4 중복 발주 판단 기준 (7가지 조건 모두 동일 시)

1. 공급사
2. 마스터코드
3. 발주CC
4. 입고예정일
5. 재고증량제외여부
6. 단가구분 (일반/이벤트/증정품)
7. 증정품여부

※ 취소/반려 상태 건은 제외

근거: `admin/src/features/purchaseOrder/purchaseOrderPlanRegistration/PurchaseOrderPlanRegistration.jsx`, `admin/src/constants/purchaseOrder/messages.js`

### 2.5 출고방법 변경 제약

| 마스터 출고방법 | 변경 가능 범위 |
|--------------|---------------|
| 컬리픽업 | 컬리픽업 / 직배송 / 택배 / 기타 (밀크런픽업 불가) |
| 밀크런픽업 | 밀크런픽업 / 직배송 / 택배 / 기타 (컬리픽업 불가) |
| 컬리픽업+밀크런픽업 | 전체 가능 |
| 택배 / 직배송 / 기타 | 택배 / 직배송 / 기타 (픽업류 불가) |

**추가 규칙:** 경유센터(입고대행)가 있는 발주는 출고방법을 택배로 변경 불가

근거: `admin/src/constants/purchaseOrder/options.js`, `partner/src/constants/purchaseOrder/options.js`

### 2.6 정보 수정 시 상태 자동 변경

| 수정 항목 | 변경되는 상태 |
|----------|-------------|
| 입고예정일 수정 | 발주예정 |
| 입고지 정보 수정 | 발주예정 |
| 출고방법을 택배로 변경 또는 택배에서 다른 방법으로 변경 | 발주예정 |
| 발주구분 변경 | 발주예정 |
| 발주생성 이후 발주수량 감량 | 공급사 승인대기 |

근거: `admin/src/constants/purchaseOrder/messages.js`

### 2.7 발주 저장 마감 시간

| 시점 | 처리 방식 |
|------|-----------|
| 입고예정일 전날 17시 이전 | 전체 수정 저장 |
| 입고예정일 전날 17시 ~ 23시 이전 | 부분 수정 저장 |
| 입고예정일 전날 23시 이후 | 수정 불가 |

근거: `partner/src/features/purchaseOrder/purchaseOrderPlanSchedule/PurchaseOrderPlanScheduleDetail.jsx`

### 2.8 과발주 승인 기준

| 발주구분 | 과발주 판단 기준 |
|----------|--------------|
| 일반/긴급/신상품 외 기본 | 판매예상일수 N일 이상 또는 누적 공급가 합계 기준금액 이상 |
| 행사발주(일특/라방) | 판매예상일수 + 누적 공급가 기준 (공유사항 필수 입력) |
| 행사발주(기획/특가) | 판매예상일수 + 누적 공급가 + 최근 6개월 할인기간 일평균 판매수량 이상 |
| 신상품발주 | 1BOX 또는 10EA 초과 시 |
| MD요청발주 | 판매예상일수 + 누적 공급가 초과 시(품의서 코드 필수) + 기준 미만도 승인 필요 |

**누적 공급가 산정:** 동일 공급사 / 동일 입고예정일 / 동일 발주자 기준 합산. 조회기간 최대 90일

근거: `admin/src/features/purchaseOrder/purchaseOrderPlanApproval/PurchaseOrderPlanExcessApprovalList.jsx`

### 2.9 과발주 승인 요청 입력 제약

| 입력 항목 | 제약 조건 |
|----------|---------|
| SCM 승인자 | 필수 선택 |
| MD 승인자 | 필수 선택 |
| SCM 승인자 = MD 승인자 | 동일인 설정 불가 |
| 공유사항 | 최대 200자, 행사발주(일특/라방) 시 필수 |
| 품의서 코드 | 최대 11자, 숫자와 하이픈만, MD요청발주+누적 공급가 초과 시 필수 |

근거: `admin/src/features/purchaseOrder/purchaseOrderPlanApproval/PurchaseOrderPlanExcessRequestModal.jsx`

### 2.10 과발주 승인/반려 권한

| 역할 | 허용 행동 |
|------|---------|
| 승인자(SCM 또는 MD) | 과발주 승인, 반려 (본인이 승인자로 지정된 건만) |
| 발주자 | 과발주 검사취소 (본인 등록 건만), 과발주 승인요청 (본인 등록 건만) |

근거: `admin/src/features/purchaseOrder/purchaseOrderPlanApproval/PurchaseOrderPlanExcessApprovalList.jsx`

### 2.11 발주 검사 권한

| 규칙 | 내용 |
|------|------|
| 검사 가능 상태 | 발주예정 또는 일CAPA 검사완료 상태만 |
| 검사 가능 사용자 | 발주자 본인만 |
| 발주 불가 상품 | 발주예정 상태 유지 |

근거: `admin/src/constants/purchaseOrder/messages.js`

### 2.12 거래명세서 생성 규칙

| 규칙 | 내용 |
|------|------|
| 생성 조건 | 발주확정 상태인 상품만 |
| 생성 후 | 명세서생성완료 상태에서 소비기한/제조일자, 파렛트 수 등 변경 불가 |
| 수정 필요 시 | 거래명세서 해제 후 변경 가능 (발주확정 유지, 미납 시 패널티) |
| 병합 조건 | 입고지/입고예정일시/발주구분/출고유형/출고방법 5가지 모두 동일 |
| 분리 생성 | 체크박스 선택으로 분리된 명세서 생성 가능 |
| 병합 실패 시 | 실패 상품은 발주확정 유지, 성공 상품만 명세서생성완료로 전환 |

근거: `partner/src/constants/purchaseOrder/guideTexts.js`

### 2.13 택배 입고 제한

| 항목 | 제한 |
|------|------|
| 납품 가능 온도 | 상온만 (냉장/냉동은 사전 합의 없으면 불가) |
| 박스당 중량 | 15KG 초과 시 불가 |
| 박스 내 상품 | 동일 유통기한의 한 상품만 적재 |
| 거래명세서 동봉 | 택배 발송 박스별 필수 |
| 외박스 표기 | 상품명, 입수량, 소비기한/제조일자 필수 |
| 입고 인정 기준 | 파트너포털에서 택배로 등록된 경우에만 인정 |

근거: `partner/src/constants/purchaseOrder/guideTexts.js`

### 2.14 소비기한/제조일자 정책

| 항목 | 정책 |
|------|------|
| 입고 기한 기준 | 직전 입고 기한과 같거나 이후 |
| 발주확정 정보 일치 | 확정 정보의 날짜와 같거나 이후 |
| 비대상 상품 | "9999-12-31"로 기재 |
| LOT 관리 | SKU당 최대 3가지 lot 동시 입고, 각 lot 구분 적재 |
| 파렛트 혼적 | 불가피 시 최대 3 SKU, 소비기한/상품별 세로 구분 적재 |

근거: `partner/src/constants/purchaseOrder/guideTexts.js`

### 2.15 엑셀 업로드 제한

| 항목 | 제한 |
|------|------|
| 최대 업로드 건수 | 1회 200건 |
| 처리 시간 | 최대 10초, 완료 전 브라우저 종료 금지 |
| 양식 변경 금지 | 1행(헤더) 변경 시 업로드 불가 |
| 엑셀 업로드 제외 상태 | 취소, 컬리 승인대기, 명세서생성완료 |

근거: `partner/src/constants/purchaseOrder/guideTexts.js`

### 2.16 발주CC 및 입고지 매핑

| 발주CC | 입고지 |
|--------|-------|
| 김포(WH02) | 김포상온(GGH1) / 김포롱테일(GGH3) / 김포냉동(GGL1) / 김포냉장(GGM1) |
| 평택(WH03) | 평택상온(GPH1) / 평택롱테일(GPH2) / 평택뷰티전처리(GPH3) / 평택냉동(GPL1) / 평택냉장(GPM1) |
| 창원(WH04) | 창원상온(KCH1) / 창원냉동(KCL1) / 창원냉장(KCM1) |
| 1MC(MCWH01) | MC01 |
| 2MC(MCWH02) | MC02 |

근거: `admin/src/constants/purchaseOrder/types.js`

### 2.17 발주구분

| 발주구분 | 설명 |
|---------|------|
| 일반발주 | 정기 일반 발주 |
| 행사발주(일특/라방) | 일일특가, 라이브방송 행사 |
| 행사발주(기획/특가) | 기획전/특가 행사 |
| 긴급발주 | 긴급 재고 보충 |
| 신상품발주 | 신규 상품 최초 발주 |
| MD요청발주 | MD 담당자 요청 |
| 공급사 요청발주 | 공급사 측 요청 |
| 자동발주 | 시스템 자동 생성 |

근거: `admin/src/constants/purchaseOrder/types.js`

### 2.18 파트너 vs 어드민 권한 차이

| 기능 | 파트너(공급사) | 어드민(컬리) |
|------|-------------|-------------|
| 발주계획 등록 | 불가 | 가능 |
| 발주검사(일CAPA/과발주) | 불가 | 가능 (발주자 본인만) |
| 발주 저장 | 가능 (17시/23시 마감) | 가능 (상태별 제한) |
| 공급사 승인 | 가능 (승인대기 건) | 불가 |
| 공급사 승인 취소 | 가능 (컬리 승인대기 건만) | 불가 |
| 과발주 승인/반려 | 불가 | 가능 (승인자 지정 건만) |
| 거래명세서 생성 | 가능 | 가능 |
| 승인 기준 정보 관리 | 불가 | 가능 |

### 2.19 조회기간 제한

| 화면 | 최대 제한 |
|------|----------|
| 과발주 승인 내역 | 90일 |
| 발주계획 내역(입고일) | 90일 |
| 발주(등록)일 검색 | 90일 |
| 기본 조회 기간 | 오늘 ~ 1개월 후 |

### 2.20 금액 계산 정책

| 항목 | 계산식 |
|------|--------|
| 총 발주수량 | 발주수량 x 입수 |
| 공급가 | 발주수량 x 입수 x 공급단가 (증정품이면 0원) |
| GPM% | (컬리판매가 - 공급단가) / 컬리판매가 x 100, 소수점 셋째 자리 반올림 |

근거: `admin/src/utils/purchaseOrder/calculate.js`

---

## 3. 정산(settlement) 정책

### 3.1 조회기간 제한

| 화면 | 최대 조회 기간 |
|------|---------------|
| 대금지급현황 | 12개월 |
| 매입금액 조회 | 6개월 |
| 원천 상계금액 관리 | 6개월 |
| 구매론 관리 | 6개월 |
| 이월 상계금액 조정 (정산월) | 6개월 |
| 마감 후 변경 관리 | 6개월 |
| 매입금액 산출 (기간 검색) | 31일 |
| 이월 상계금액 조정 (기간 검색) | 365일 |
| 대금지급액 계산 (기간 검색) | 31일 |
| 대금지급현황 엑셀 다운로드 | 1개월 |

기본 조회 정산월: 전월(현재 기준 -1개월)

근거: `admin/src/constants/settlement/values.js`, `partner/src/constants/settlement/values.js`

### 3.2 AP 기간(지급 주기)

| 값 | 의미 |
|----|------|
| 10일(월3회) | 한 달에 3번 지급 |
| 30일(월1회) | 한 달에 1번 지급 |
| 기타 | 그 외 |

근거: `admin/src/constants/settlement/options.js`

### 3.3 상계 유형 (13종)

1. 영업양수도
2. 선지급
3. 수정지급
4. 반품/환출
5. 데이터이용료
6. 판매촉진행사비(할인)
7. 판매촉진행사비(쿠폰)
8. 미입고위약금
9. 광고료
10. 성장장려금
11. 폐기비용
12. 기타
13. 넥스트마일 매출채권

근거: `admin/src/constants/settlement/types.js`

### 3.4 이월 구분

| 이월구분 | 의미 |
|---------|------|
| 전월이월 | 전달에서 이월된 상계금액 |
| 당월전회차 | 이번 달 이전 회차 발생 상계금액 |
| 당월당회차 | 이번 달 현재 회차 발생 상계금액 |
| 익월예정 | 다음 달로 넘어갈 예정 상계금액 |

상계 회차: 1회차, 2회차, 3회차 (3단계 고정)

근거: `admin/src/constants/settlement/types.js`, `admin/src/constants/settlement/options.js`

### 3.5 상계 취소 가능 시점

| 구분 | 취소 가능 조건 |
|------|---------------|
| 원천 상계금액 | 정산월 또는 정산월의 익월이 현재 월과 일치 (당월/전월 데이터만) |
| 마감 후 변경 | 정산월 기준 익월 또는 익익월이 현재 월과 일치 (원천보다 1개월 넓음) |

근거: `admin/src/features/settlement/offsetAmountManagement/originalOffsetAmountManagement/OriginalOffsetAmountManagement.jsx`, `postClosingChangeManagement/PostClosingChangeManagement.jsx`

### 3.6 이월 상계금액 조정 상태

| 상태 | 설명 | 수정/차감 버튼 | 입금받은금액 수정 |
|------|------|---------------|-----------------|
| 진행(PROGRESS) | 처리 가능 | 노출 (권한 보유 시) | 조정 내역 없을 때만 가능 |
| 완료(COMPLETED) | 처리 완료 | 미노출 | 불가 |
| 마감(CLOSING) | 마감됨 | 미노출 | 불가 |

근거: `admin/src/features/settlement/offsetAmountManagement/carryoverOffsetAmountAdjustment/CarryoverOffsetAmountAdjustmentDetail.jsx`

### 3.7 입금 요청 등록 유효성 검증

| 필수 항목 | 오류 메시지 |
|----------|------------|
| 공급사 | "공급사를 선택해주세요." |
| 내역(사유) | "금액 조정 상세내역 등 사유를 입력해주세요." |
| 입금요청금액 | "입금요청금액을 입력해주세요." |

금액 처리: 입력한 입금요청금액은 음수(x -1)로 변환하여 서버 전송 (상계 차감 로직)

근거: `admin/src/features/settlement/offsetAmountManagement/carryoverOffsetAmountAdjustment/CarryoverOffsetAmountRegister.jsx`

### 3.8 입금받은 금액 조정 유효성

| 검증 | 오류 메시지 |
|------|------------|
| 입금받은금액 미입력 | "입금받은금액을 입력해주세요." |
| 입금일 미선택 | "입금일을 선택해주세요." |
| 차감한도 초과 | "차감 가능 금액을 초과하였습니다. 재확인해주세요." |

근거: `admin/src/features/settlement/offsetAmountManagement/carryoverOffsetAmountAdjustment/ReceivedAmountAdjustModal.jsx`

### 3.9 대금지급정보 생성 유효성

| 검증 | 내용 |
|------|------|
| 공급사 선택 필수 | "공급사를 선택해 주세요." |
| 최대 선택 수 | 한 번에 최대 50개 공급사 |
| 생성 불가 조건 | 대금지급액 정보가 이미 존재하거나, 유효한 매입금액/상계금액이 있는 경우 |

근거: `admin/src/features/settlement/paymentStatus/PaymentInformationCreateModal.jsx`

### 3.10 산출 작업(JOB) 상태

| 상태 | 취소 가능 |
|------|----------|
| 대기(WAITING) | 가능 (권한 보유 시) |
| 처리중(IN_PROGRESS) | 불가 |
| 처리완료(COMPLETED) | 불가 |
| 취소(CANCELED) | - |
| 실패(FAILED) | 불가 |

근거: `admin/src/constants/settlement/types.js`

### 3.11 구매론 관리

| 항목 | 정책 |
|------|------|
| 등록/수정 방식 | 엑셀 대량 등록/수정만 지원 (단건 직접 입력 없음) |
| 이용 가능 은행 | 하나은행, 산업은행, 우리은행, 신한은행 (4곳) |
| 구매론 여부 | 발행/발행안함으로 대금지급현황 필터링 가능 |

근거: `admin/src/features/settlement/offsetAmountManagement/purchaseLoanManagement/PurchaseLoanManagement.jsx`

### 3.12 파트너 vs 어드민 차이

| 구분 | 파트너 | 어드민 |
|------|--------|--------|
| 조회 | 대금지급현황 목록/상세, 상계 유형별/이월 구분별 상세 | 위 전체 + 산출/생성/취소/다운로드 |
| 데이터 생성/수정/취소 | 불가 (조회 전용) | 가능 (권한에 따라) |
| 공급사 검색 | 없음 (자사 데이터만) | 공급사명/코드 검색 가능 |
| 추가 필터 | AP 기간 | 재확인필요, 구매론 여부, 마감 후 변경 여부 |

### 3.13 금액 표시 정책

| 항목 | 정책 |
|------|------|
| 천 단위 구분 | 콤마(,) 형식 |
| 금액 정렬 | 우측 정렬 |
| 날짜 형식 | 정산월: YYYY-MM, 날짜: YYYY-MM-DD |

### 3.14 정산 권한 코드 (어드민 17종)

| 권한 코드 | 허용 동작 |
|---------|---------|
| CREATE_SINGLE_SUM | 매입금액 산출 요청 |
| SETTLEMENT_CREATE_BULK_SUM_CANCEL | 매입금액 취소 |
| DOWNLOAD_LIST_SINGLE_SUM_ORIGIN | 매입금액 엑셀 다운로드 |
| CREATE_BULK_COST_OFFSET_ORIGIN | 상계금액 엑셀 등록 |
| SETTLEMENT_CREATE_BULK_COST_OFFSET_ORIGIN_CANCEL | 상계금액 취소 |
| DOWNLOAD_LIST_SINGLE_COST_OFFSET_ORIGIN | 원천 상계금액 엑셀 다운로드 |
| CREATE_SINGLE_COST_OFFSET_MODIFY | 입금요청 단건 등록 + 상세 수정 |
| CREATE_BULK_COST_OFFSET_MODIFY | 입금요청 엑셀 대량등록 |
| CREATE_BULK_PAY_MODIFY | 변경지급액 엑셀 등록 |
| SETTLEMENT_CREATE_BULK_PAY_MODIFY_CANCEL | 변경지급액 취소 |
| CREATE_BULK_LOAN | 구매론 등록/수정 |
| CREATE_SINGLE_PAY | 대금지급액 계산 요청 |
| CREATE_SINGLE_PAY_ITEM | 대금지급정보 생성 |
| DOWNLOAD_LIST_SINGLE_PAY_ITEM | 대금지급현황 엑셀 다운로드 |
| DOWNLOAD_LIST_SINGLE_COST_OFFSET | 실상계금액 엑셀 다운로드 |

근거: `admin/src/constants/authorizationResources.js`

---

## 4. 프로모션(promotion) 정책

> 프로모션 기능은 **파트너 앱 전용** (어드민 앱에는 프로모션 기능 없음)

### 4.1 프로모션 유형 분류

**이벤트 타입 (6종)**

| 코드 | 명칭 |
|------|------|
| 기획전 | 주제별 묶음 행사 |
| 특가전 | 한정 기간 할인 행사 |
| 일일특가 | 하루 단위 할인 행사 |
| 라이브 | 라이브 방송 연계 행사 |
| 멤버스특가 | 멤버십 회원 전용 할인 |
| 기타 | 기타 행사 |

**신청 구분 (혜택 타입)**

| 구분 | 운영 상태 |
|------|----------|
| 판매가할인 | 운영 중 |
| 쿠폰 | 운영 중 |
| 증정 | 미오픈 (UI 숨김) |
| 입고가할인 | 미노출 (파참프 엑셀 직접 등록으로 운영) |

**프로모션 영역:** 공통 / 마켓 / 뷰티

**비용 정산 방식:** 매입 정산 금액에서 상계 / 직접 입금

근거: `partner/src/constants/promotion/types.js`

### 4.2 프로모션 신청서 상태 전이

```
신청완료(PROPOSAL_COMPLETED)
  → 합의대기(READY_TO_AGREE)
  → 합의완료(AGREED)
  → 종결(CLOSING)
```

| 상태 | 허용 동작 |
|------|---------|
| 신청완료 | 수정제출, 상품 추가/삭제 |
| 합의대기 | 판촉합의서 날인 (변경 사항 없을 때만), 상품 추가/삭제 |
| 합의완료 | 판촉합의서 확인만, 내용 변경 불가 |
| 종결 | 조회만 |

근거: `partner/src/constants/promotion/types.js`, `partner/src/utils/promotion/validation.js`

### 4.3 프로모션 상품 상태별 허용 동작

| 상품 상태 | 선택 | 신청취소 | 적용중 수정 | 재등록 |
|----------|------|---------|------------|--------|
| 신규제안 | O | O | X | X |
| 검토중 | O | O | X | X |
| 승인완료 | O | O | X | X |
| 합의완료+적용예정 | O | O | X | X |
| 합의완료+적용중 | O | X | O | X |
| 합의완료+완료 | X | X | X | X |
| 신청취소 대기 | X | X | X | X |
| 신청취소 | X | X | X | O |
| 반려 | X | X | X | O |

근거: `partner/src/utils/promotion/validation.js`

### 4.4 프로모션 전체 상태 흐름

```
신청중 → MD 승인중 → OM 승인중 → 프로모션 확정 → 진열 예정 → 진행중 → 종료 / 취소
```

종료된 프로모션: 구분 탭 선택 불가, 모든 수정/추가/삭제 버튼 비활성화, 상품 체크박스 비활성화

### 4.5 판매가할인 입력 제약

| 항목 | 입력 범위 | 비고 |
|------|----------|------|
| 할인금액 | 0 이상 정수, 컬리판매가 초과 불가 | |
| 공급사 분담율 | 0~100 정수 | |
| 최대가능수량 | 1개~999,999개 미만 | 기본값 100,000개 |
| 적용중 수정 시 최대가능수량 | 기존 입력값 이상만 가능 | |

**자동 계산:**
- 할인율 = 할인금액 / 컬리판매가 x 100 (소수점 이하 절삭)
- 할인판매가 = 컬리판매가 - 할인금액
- 최대예상비용 = 할인금액 x (공급사 분담율 / 100) x 최대가능수량 (소수점 이하 절삭)
- 판촉행사비용은 최대예상비용 한도 내에서만 정산

근거: `partner/src/constants/promotion/messages.js`, `partner/src/constants/promotion/values.js`, `partner/src/utils/promotion/calculate.js`

### 4.6 쿠폰 입력 제약

| 항목 | 입력 범위 |
|------|----------|
| 쿠폰 할인율 | 0~100 정수 |
| 공급사 분담율 | 0~100 정수 |
| 최소구매금액 | 0~1,000,000 정수 |
| 최소구매수량 | 1~100 정수 |
| 최대할인금액 | 0~1,000,000 정수 |
| 최대가능수량 | 1~999,999 정수 |

쿠폰 제출 조건: 할인율, 공급사 분담율, 최소구매금액, 최소구매수량, 최대할인금액 모두 입력 필수

근거: `partner/src/constants/promotion/messages.js`

### 4.7 상품 신청 불가 조건

- PB(자체 브랜드) 상품
- 멀티벤더 상품
- 공급사에 미등록된 마스터코드 상품
- 판매 중지 등 신청 불가 상태 상품
- 기간 겹치는 다른 프로모션에 이미 신청된 상품 (중복 불가)
- 이미 등록된 상품 (취소/반려 상태 제외)
- 공급가 정보 없는 상품
- 컬리판매가 정보 없는 상품

**상호 배타 규칙:** 판매가할인과 입고가할인은 동시 신청 불가

근거: `partner/src/constants/promotion/messages.js`, `partner/src/utils/promotion/validation.js`

### 4.8 증정(Giveaway) 규칙 (미오픈)

| 항목 | 규칙 |
|------|------|
| 증정품 최대 | 3개까지 |
| 증정 조건 기준값 | 금액: 0~10,000,000원 / 수량: 0~100개 |
| 증정 조건 방식 | 수량 이상 / 수량 마다 / 금액 이상 / 금액 마다 |
| 공급사 분담율 100이 아닌 경우 | 담당 MD에게 별도 문의 필요 |

근거: `partner/src/constants/promotion/messages.js`, `partner/src/features/promotion/promotionApply/PromotionApplyTargetItemsModal.jsx`

### 4.9 중복 정산 규칙

동일 상품에 기간 겹치는 복수 행사 합의서 체결 시, **할인금액이 높은 합의서 기준으로 정산**

### 4.10 엑셀 대량 업로드

| 항목 | 규칙 |
|------|------|
| 최대 건수 | 1,000건 |
| 양식 불일치 | 업로드 차단 |
| 지정 시트 미확인 | 차단 |
| 파일 내 상품 없음 | 차단 |
| 파일 내 중복 상품 | 차단 |
| 마스터코드 미입력 | 차단 |
| 이미 신청된 상품 중복 | 해당 상품 제외, 나머지만 업로드 |
| 지원 탭 | **판매가할인 탭에서만** (쿠폰/증정 미제공) |

근거: `partner/src/constants/promotion/messages.js`

### 4.11 기간 관련 정책

| 항목 | 정책 |
|------|------|
| 엑셀 다운로드 기간 제한 | 최대 90일 |
| 신청 마감 이후 제출 시 | "신청가능한 기간이 아닙니다." 오류 |

근거: `partner/src/features/promotion/promotionApplyList/PromotionApplyList.jsx`

### 4.12 판촉합의서 정책

| 항목 | 정책 |
|------|------|
| 합의 방법 | 날인 이미지 업로드 또는 합의서 파일(PDF) 업로드 중 택 1 |
| 예상 소요 비용 | 승인완료/합의완료 상태 상품의 최대예상비용 합산 |
| 표시 상품 | 승인완료 또는 합의완료 상태만 |
| 버전 관리 | 프로모션 변경 시 버전 업데이트, 합의 시 버전 일치 검증 |
| 변경 사항 있는 상태에서 합의 시도 | "제출 필요" 상태로 합의서 날인 버튼 비활성화 |

근거: `partner/src/features/promotion/promotionAgreement/PromotionAgreement.jsx`, `partner/src/components/promotion/promotionAgreement/AgreementButtonContainer.jsx`

### 4.13 접근 제어

| 에러 코드 | 처리 |
|----------|------|
| PROMOTION_ACCESS_DENIED | 유효하지 않은 프로모션 → 목록으로 이동 |
| PROMOTION_APPLICATION_ACCESS_DENIED | 유효하지 않은 신청서 → 접근 차단 |
| CAN_NOT_APPLY_PARTNER_PROMOTION | 참여 불가능 프로모션 → 경고 후 목록 이동 |
| PROMOTION_HAS_CHANGED | 정보 변경됨 → 새로고침 후 재시도 안내 |

근거: `partner/src/constants/promotion/errorCodes.js`

---

## 5. 공급사(supplier) 정책

### 5.1 승인 상태 전이

| 상태 | 설명 |
|------|------|
| 임시저장(TEMP) | 최초 작성 중 저장된 미완성 상태 |
| 승인대기(BEFORE_APPROVAL_FA) | 재무팀 사업자정보 확인 및 승인 중 |
| 등록완료(APPROVED) | 상품 생성 가능한 완료 상태 |

**전이 규칙:**
- 사업자번호 확인 완료 → 저장 시 바로 "등록완료" 처리
- 사업자번호 확인 미완료 → 저장 시 "승인대기" 처리
- 임시저장 버튼 → 항상 "임시저장" 상태 (유효성 검증 전부 건너뜀)

근거: `admin/src/features/supplier/supplierManagement/SupplierManagementRegister.jsx`

### 5.2 버튼 노출 조건

| 버튼 | 노출 조건 |
|------|---------|
| 저장 | 상태=임시저장 AND 신규등록 권한 |
| 임시저장 | 저장 버튼과 동일 |
| 임시저장 삭제 | 임시저장 AND 신규등록 권한 AND 공급사ID 존재 |
| 수정 | 공급사ID 존재 AND 임시저장 아님 AND 수정 권한 |
| 승인 | 상태=승인대기 AND 승인 권한 |
| 취소 | 항상 노출 |

근거: `admin/src/features/supplier/supplierManagement/SupplierManagementRegister.jsx`

### 5.3 권한 코드 (어드민 8종)

| 권한 코드 | 설명 |
|---------|------|
| SUPPLIER_CREATE_SINGLE_SUPPLIER | 단건 신규 등록 |
| SUPPLIER_APPROVE_SINGLE_SUPPLIER | 단건 승인 (재무팀) |
| SUPPLIER_MODIFY_SINGLE_SUPPLIER | 단건 수정 |
| SUPPLIER_CREATE_BULK_SUPPLIER | 엑셀 일괄 등록 |
| SUPPLIER_MODIFY_BULK_SUPPLIER | 엑셀 일괄 수정 |
| SUPPLIER_MODIFY_BULK_RECEIVING-TIME | 기본센터 입고시간 일괄 수정 |
| SUPPLIER_MODIFY_BULK_WAY-POINT | 경유센터 입차시간 일괄 수정 |
| SUPPLIER_CREATE_SINGLE_DATA-SERVICE | 파트너 데이터 서비스(멤버십) 설정 |

근거: `admin/src/constants/authorizationResources.js`

### 5.4 등록 필수 입력값

**기본 정보:**
- 사업자번호, 공급사명, 업태, 종목, 대표자명, 대표번호, 지급일, 계산서 수령 메일, 주소, 팝빌 연동 여부

**담당자 정보:**
- 담당 MD, 담당 AMD, 발주담당(CO) 각 1명 이상
- 담당자별: 이메일, 담당자명, 휴대폰 번호, 비밀번호

**상세 정보:**
- 출고방법 (필수)

**임시저장 시 유효성 검증 면제:** 모든 필수값 검증 건너뜀

근거: `admin/src/features/supplier/supplierManagement/SupplierManagementRegister.jsx`, `admin/src/constants/supplier/errorMessages.js`

### 5.5 입력값 형식 제약

| 필드 | 형식 |
|------|------|
| 법인등록번호 | `######-#######` (하이픈 포함 13자리) |
| 지급일 | 0~99 정수 |
| 대표번호/팩스/휴대폰 | `0**-****-****` 형식 |
| 이메일 | 표준 이메일 형식 |
| 최소주문금액/수량 | 숫자만 |
| 종업원 수/차량대수 | 숫자만 |

근거: `admin/src/constants/common.js`, `admin/src/constants/supplier/errorMessages.js`

### 5.6 사업자번호 실시간 검증

- 사업자번호 입력 후 [조회] 버튼으로 외부 API 실시간 확인
- 2인 미만 사업장 또는 API 등록 예정 사업자는 조회 불가 (재무팀 승인 필요)
- 등록완료 상태 조회 시 재확인 없이 유효 처리
- 이미 등록된 로그인 아이디와 중복되면 오류

근거: `admin/src/features/supplier/supplierManagement/SupplierManagementRegister.jsx`

### 5.7 팝빌 연동 정책

- 세금계산서 역발행 자동 승인을 위해 팝빌 회원 가입 필요
- [조회] 버튼으로 실시간 가입 여부 확인
- 상태: 미확인(null) / 가입(true) / 미가입(false)

근거: `admin/src/constants/supplier/tooltipMessages.js`

### 5.8 계산서 발행 방식

| 코드 | 방식 |
|------|------|
| BY_KURLY | 역발행 (컬리가 발행) - 기본값 |
| BY_SUPPLIER | 정발행 (공급사가 발행) |

근거: `admin/src/constants/supplier/types.js`

### 5.9 과세 구분

- 면세사업자: 면세 상품만 등록 가능
- 간이과세자: 공급사 등록 불가

근거: `admin/src/constants/supplier/tooltipMessages.js`

### 5.10 AP 기간(매입 결제 주기)

| 값 | 표시 |
|----|------|
| 3 (기본값) | 10일(월3회) |
| 1 | 30일(월1회) |
| 0 | 기타 |

근거: `admin/src/constants/supplier/options.js`

### 5.11 유통기한 등록 방식

| 값 | 의미 |
|----|------|
| false (기본값) | 공급사가 발주 시 직접 등록 |
| true | 재고팀이 매입 시 등록 |

근거: `admin/src/constants/supplier/options.js`

### 5.12 출고 방법 (6종)

| 코드 | 명칭 |
|------|------|
| KURLY_PICKUP | 컬리픽업 |
| MILKRUN_PICKUP | 밀크런픽업 |
| KURLY_MILKRUN_PICKUP | 컬리픽업+밀크런픽업 |
| PARCEL | 택배 |
| DIRECT_DELIVERY | 직배송 |
| ETC | 기타 |

근거: `admin/src/constants/supplier/types.js`

### 5.13 입고 창고 (17개소)

- **김포:** 상온(GGH1), 롱테일(GGH3), 냉동(GGL1), 냉장(GGM1)
- **평택:** 상온(GPH1), 롱테일(GPH2), 뷰티전처리(GPH3), 냉동(GPL1), 냉장(GPM1)
- **창원:** 상온(KCH1), 냉동(KCL1), 냉장(KCM1)
- **MC센터:** MC01~MC04

클러스터 센터(CC) 3개소: 2CC(김포), 3CC(평택), 4CC(창원)

근거: `admin/src/constants/supplier/types.js`

### 5.14 최소주문금액/수량(MOA/MOQ)

7개 클러스터(2CC, 3CC, 4CC, 1MC, 2MC, 3MC, 4MC) 각각 별도 설정 가능

근거: `admin/src/constants/supplier/parameters.js`

### 5.15 담당자 역할

| 코드 | 역할 |
|------|------|
| SUPPLY | 공급담당 |
| RELEASE | 출고담당 |

신규 등록 시 기본값: 공급담당 + 출고담당 동시 부여

근거: `admin/src/constants/supplier/types.js`

### 5.16 파트너 멤버십(데이터 서비스) 설정

| 필드 | 제약 |
|------|------|
| 등급 | BASIC(베이직) / PREMIUM(프리미엄) 필수 선택 |
| 시작일 | 필수 |
| 종료일 | 필수, 시작일보다 이전이면 오류 |
| 가입 상태 | 미가입/가입 필수 선택 |

근거: `admin/src/features/supplier/supplierManagement/SupplierMembershipModal.jsx`

### 5.17 엑셀 다운로드 보안

**비밀번호 복잡도:**
- 영문+숫자+특수문자 3가지 혼합 8자리 이상, 또는
- 위 중 2가지 혼합 10자리 이상

다운로드 사유 입력 필수

근거: `admin/src/features/supplier/supplierManagement/SupplierInfoExcelDownloadModal.jsx`

### 5.18 변경 감지 및 이탈 방지

- 공급사 상세 페이지에서 값 변경 시 이탈 시 경고 팝업
- 담당자 ID, 담당자명, 휴대폰, 로그인ID, 이메일, 비밀번호, 담당 유형 중 하나라도 변경 시 dirty 상태

근거: `admin/src/features/supplier/supplierManagement/SupplierManagementRegister.jsx`

### 5.19 첨부 파일 (4종)

1. 사업자등록증 사본
2. 영업신고증
3. 통장 사본
4. 공급사계약서

파트너: 다운로드/미리보기만 가능 / 어드민: 등록/수정 가능

근거: `partner/src/components/supplier/SupplierFileContent.jsx`

### 5.20 파트너 vs 어드민 차이

| 기능 | 파트너 | 어드민 |
|------|--------|--------|
| 공급사 조회 | 자기 공급사 정보 읽기 전용 | 전체 공급사 목록 조회 |
| 등록/수정/승인/삭제 | 불가 | 가능 (권한별) |
| 파일 관리 | 다운로드만 | 등록/수정/삭제 |
| MD 기본 필터 | 해당 없음 | MD 역할이면 담당 공급사 자동 필터링 |

### 5.21 목록 검색 기본값

| 항목 | 기본값 |
|------|--------|
| 거래여부 | 거래중(true) |
| 기간 유형 | 등록일(REG) |
| 정렬 | 등록일 최신순 |
| 검색 조건 | 공급사명/공급사코드/사업자번호 중 선택 |

근거: `admin/src/features/supplier/supplierManagement/SupplierManagementList.jsx`

---

## 부록: 주요 에러 메시지 모음

### 정산 에러 메시지

| 에러 상황 | 메시지 |
|----------|--------|
| 공급사 중복 등록 | "이미 등록한 공급사입니다. 재확인해주세요." |
| 차감 한도 초과 | "차감 가능 금액을 초과하였습니다. 재확인해주세요." |
| 취소 불가 매입금액 | "취소할 수 없는 매입금액이 포함되어 있습니다." |
| 취소 불가 원천상계 | "취소할 수 없는 원천상계 정보가 존재합니다." |
| 취소 불가 마감 후 변경 | "취소할 수 없는 마감 후 변경이 존재합니다." |
| 유효하지 않은 공급사 | "유효하지 않은 공급사입니다." |
| 유효하지 않은 정산월 | "유효하지 않은 정산월입니다." |

근거: `admin/src/constants/settlement/messages.js`

### 공통 에러 메시지

| 에러 상황 | 메시지 |
|----------|--------|
| 서버 통신 오류 | "서버와 통신 중 오류가 발생하였습니다." |
| 인증 실패 | "인증되지 않은 사용자입니다." |
| 중복 권한 코드 | "이미 등록된 권한코드 입니다." |
| 중복 계정 | "이미 등록된 계정입니다." |
| 다중검색 초과 | "다중검색은 80개 이내로 조회가능합니다." |

근거: `admin/src/constants/errorCodes.js`, `partner/src/constants/common/messages.js`
