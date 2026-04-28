# 파트너 참여 프로모션 정책서

> 분석일: 2026-04-08
> 출처: escm-contract-silo (계약관리), eSCM-API (파트너포털 API), 다다익선 PRD
> 레포: github.com/thefarmersfront/escm-contract-silo | eSCM-API

---

## 1. 서비스 개요

| 항목 | 내용 |
|------|------|
| 서비스명 | 파트너 참여 프로모션 |
| 목적 | 공급사(파트너사)가 컬리 프로모션에 참여 신청하고, 컬리 MD/OM이 검토·승인 후 양측이 합의하는 프로세스 |
| 사용 주체 | 공급사(파트너사) / 컬리 임직원(MD·OM·PRM) |
| 담당 팀 | @thefarmersfront/fpd-partner |

### 기술 스택

| 항목 | 내용 |
|------|------|
| 언어 | Java 17 |
| 프레임워크 | Spring Boot 3.1.9 |
| DB | JPA + QueryDSL |
| 메시징 | Kafka (Producer/Consumer) |
| 파일저장 | AWS S3 (합의서 PDF) |
| 동시성 제어 | Optimistic Locking (@Version) |

### 모듈 구조

| 모듈 | 역할 |
|------|------|
| escm-contract-domain | 도메인 클래스 (Enum, Helper, Port 인터페이스) |
| escm-contract-store-jpa | 엔티티, JPA Repository, QueryDSL |
| escm-contract-rest-client | 외부 API 호출 |
| escm-contract-kafka-producer | Kafka 메시지 발행 |
| escm-contract-app-web | 웹 애플리케이션 (Controller + Service) |
| escm-contract-app-kafka-consumer | Kafka 컨슈머 |
| escm-contract-app-batch | 배치 처리 |

---

## 2. 프로모션 분류 체계

### 2-1. 이벤트 유형 (PromotionEventType) 및 그룹

| 유형 | 코드 | 그룹 | 상품 중복 지원 |
|------|------|------|------------|
| 기획전 | PROMOTIONAL_EVENT | LONG_TERM (Group A) | ❌ 불가 |
| 연합전 | JOINT_CAMPAIGN | LONG_TERM (Group A) | ❌ 불가 |
| 특가전 | SPECIAL_SALE | LONG_TERM (Group A) | ❌ 불가 |
| 일일특가 | DAILY_SPECIAL_SALE | SHORT_TERM (Group B) | ✅ 가능 |
| 라이브 | LIVE | SHORT_TERM (Group B) | ✅ 가능 |
| 기타 | ETC | SHORT_TERM (Group B) | ✅ 가능 |
| 멤버스 특가 | MEMBERS_SPECIAL_SALE | MEMBERS_TERM (Group C) | ✅ 가능 |

**할인금액 서열**: Group A (가장 낮음) < Group B (중간) ≒ Group C (독립)

### 2-2. 혜택 유형 (PromotionBenefitType)

| 유형 | 코드 | 설명 |
|------|------|------|
| 판매가 할인 | PRICE_DISCOUNT | 컬리 판매가에서 직접 할인 |
| 쿠폰 | COUPON | 쿠폰 발급을 통한 할인 |
| 증정 | GIVEAWAY | 조건 충족 시 상품 증정 |
| 입고가 할인 | INVENTORY_PRICE_DISCOUNT | 공급가(입고가) 기준 할인 |

### 2-3. 할인 종류 (다다익선 도입 후)

| 종류 | 설명 | 조건수량 |
|------|------|---------|
| 일반 | 판매가 할인 (기존) | 없음 (1개 기준) |
| 다다익선 (번들할인) | N개 이상 구매 시 할인 | 2 이상 양의정수 |

- 동일 상품에 **일반 1건 + 다다익선 최대 5건** = 총 6ROW까지 존재 가능
- 신청 완료 후 할인종류/조건수량 **변경 불가** (취소 후 재신청만 가능)

### 2-4. 참여 대상 유형 (PromotionApplierType)

| 유형 | 설명 |
|------|------|
| ALL_SUPPLIERS_1P | 파트너포털 전체 공급사 |
| SPECIFIC_SUPPLIERS_1P | 파트너포털 특정 공급사 |
| NONE | 참여신청 받지 않음 |

### 2-5. 사이트 구분 (PromotionSite)

| 값 | 설명 |
|---|------|
| ALL | 공통 |
| MARKET | 마켓 |
| BEAUTY | 뷰티 |

---

## 3. 상태 전이

### 3-1. 프로모션 검토 상태 (PromotionReviewStatus)

```
신청중 → MD 승인중 → OM 승인중 → 프로모션 확정 → 진열 예정 → 진행중 → 종료
                                                                  → 취소
```

**유효(Active) 상태**: 신청중, MD 승인중, OM 승인중, 프로모션 확정, 진열 예정, 진행중
**최종 상태**: 종료, 취소

### 3-2. 상품 검토 상태 (TargetProductReviewStatus) — 컬리 내부

```
MD 승인대기 ──[MD 승인]──→ MD 승인완료 ──[OM 승인]──→ OM 승인완료
     │                        │                        │
     └──[MD 반려]──→ MD 반려   └──[OM 반려]──→ OM 반려
                                                       │
                                                  ──→ 취소
```

| 상태 | 설명 |
|------|------|
| MD 승인대기 | 최초 제출 상태 |
| MD 승인완료 | MD가 승인 (1차 통과) |
| MD 반려 | MD가 반려 |
| OM 승인대기 | 2차 검토 대기 |
| OM 승인완료 | OM이 최종 승인 |
| OM 반려 | OM이 최종 반려 |
| 취소 | 취소 처리 |

### 3-3. 파트너용 상품 검토 상태 (PartnerProductReviewStatus)

```
신규제안(PROPOSAL) ──[MD 검토]──→ 검토중(IN_PROGRESS)
     │                               │
     │                         [MD/OM 승인]──→ 승인완료(APPROVED)
     │                               │              │
     │                         [MD/OM 반려]    [합의 완료]──→ 합의완료(AGREED)
     │                               ↓
     │                          반려(REJECTED)
     │
     └──[취소]──→ 취소(CANCELLED)
```

**[합의대기] 전환 가능 상태**: 승인완료, 합의완료, 반려, 취소
**[반려]로 변경 대상**: 신규제안, 검토중
**[신규제안]으로 롤백 대상**: 검토중, 승인완료, 합의완료

### 3-4. 신청서 상태 (PromotionApplicationStatus)

```
신청완료(PROPOSAL_COMPLETED) ──[배치]──→ 합의대기(READY_TO_AGREE) ──[합의]──→ 합의완료(AGREED) ──→ 종결(CLOSING)
```

**유효(Active) 상태**: 신청완료, 합의대기, 합의완료

**[합의대기] 전환 조건** (배치 Job):
- 신청서 내 모든 상품 상태가 [승인완료/합의완료/반려/취소] 중 하나
- **반드시 [승인완료] 또는 [합의완료] 상품이 최소 1개 존재**
- 상품 0개인 신청서는 전환 불가

### 3-5. 승인 프로세스 유형 (PromotionApprovalProcessType)

| 유형 | 설명 | 검토 단계 |
|------|------|---------|
| REVIEW_ONE_DEPTH | 1차 검토만 | MD만 |
| REVIEW_TWO_DEPTH | 1차+2차 검토 | MD → OM |

---

## 4. 권한 체계

### 4-1. API 접근 구분

| 구분 | 경로 prefix | 인증 방식 |
|------|-----------|---------|
| 공급사 (SUPPLY) | `/shared/v4/` | JWT UserToken (supplierCode, supplierId, loginId) |
| 컬리 내부 (KURLY) | `/supervisor/v4/` | X-ESCM-CONTRACT-TOKEN 헤더 |

### 4-2. 컬리 역할 (RoleType)

MD, IM, AMD, MASTER, FA, CO, OM, CC, PRM, LC

### 4-3. 기능별 권한

| 기능 | 공급사 | 컬리(MD) | 컬리(OM) |
|------|------|---------|---------|
| 프로모션 조회 | O (참여 가능한 것만) | O | O |
| 상품 지원(신청) | O (본인 공급사만) | X | X |
| 상품 수정 | O (본인 공급사만) | X | X |
| 상품 취소 | O (본인 공급사만) | X | X |
| 1차 검토(승인/반려) | X | O | X |
| 2차 검토(승인/반려) | X | X | O |
| 합의 처리 | O (직인 합의) | O (수동 합의) | X |
| 합의서 다운로드 | O | O | O |
| 신청서 조회 | O (본인) | O | O |

---

## 5. 상품 지원(신청) 정책

### 5-1. 상품 추가 조건

| 항목 | 규칙 | 에러 코드 |
|------|------|---------|
| 상품 상태 | 오픈대기/판매중만 가능 | INVALID_GOODS_STATUS |
| PB 상품 | 불가 | PRIVATE_BRAND_GOODS_ERROR |
| 멀티벤더 상품 | 불가 | MULTI_VENDOR_GOODS_ERROR |
| 공급사 소유 | 본인 공급사 상품만 | NOT_SUPPLIERS_GOODS |

### 5-2. 가격/수량 검증

| 항목 | 규칙 | 에러 코드 |
|------|------|---------|
| 컬리 판매가 | > 0 | INVALID_BASE_PRICE |
| 공급가 | ≥ 0 | INVALID_SUPPLY_PRICE |
| 할인금액 | ≥ 0 | INVALID_DISCOUNT_PRICE |
| 할인금액 vs 판매가 | 할인금액 < 판매가 | OVERFLOW_DISCOUNT_PRICE |
| 할인율 | 0~100 범위 | INVALID_DISCOUNT_RATE |
| 공급사 분담율 | 0~100 정수 | INVALID_SUPPLIER_COST_SHARING_RATE |
| 최대가능수량 | 1~999,999 | INVALID_MAXIMUM_QUANTITY |
| 최소 구매 금액 (쿠폰) | > 0 | INVALID_MINIMUM_BUY_PRICE |
| 최소 구매 수량 (쿠폰) | > 0 | INVALID_MINIMUM_BUY_AMOUNT |

### 5-3. 계산 일치 검증

| 항목 | 계산식 | 에러 코드 |
|------|-------|---------|
| 할인금액 | 판매가 × 할인율 ÷ 100 (**소수점 버림**) | CALC_DISCOUNT_PRICE_ERROR |
| 할인율 | 할인금액 ÷ 판매가 × 100 (**소수점 버림**) | CALC_DISCOUNT_RATE_ERROR |
| 할인 판매가 | 판매가 - 할인금액 | CALC_DISCOUNTED_PRICE_ERROR |
| 최대예상비용 | 할인금액 × 최대수량 × 분담율 ÷ 100 (**소수점 버림**) | CALC_MAXIMUM_EXPECTED_PRICE_ERROR |
| 공급가 할인율 | 공급가 할인금액 ÷ 공급가 × 100 (**소수점 버림**) | CALC_SUPPLY_DISCOUNT_PRICE_ERROR |

### 5-4. 입고가 할인 전용 검증

| 항목 | 규칙 | 에러 코드 |
|------|------|---------|
| 공급가 할인금액 | ≥ 0 | INVALID_SUPPLY_DISCOUNT_PRICE |
| 공급가 할인율 | 0~100 | INVALID_SUPPLY_DISCOUNT_RATE |
| 공급가 할인금액 vs 공급가 | 초과 불가 | OVERFLOW_SUPPLY_DISCOUNT_PRICE |
| 공급가 할인금액 vs 판매가 할인금액 | 초과 불가 | OVERFLOW_SUPPLY_DISCOUNT_PRICE_THAN_DISCOUNT_PRICE |
| 입고가 분담율 | 공급가 할인금액 ÷ 판매가 할인금액 × 100 (소수점 버림) | CALC_SUPPLIER_COST_SHARING_RATE_ERROR |

### 5-5. 증정 전용 검증

| 항목 | 규칙 | 에러 코드 |
|------|------|---------|
| 증정 조건 기준값 | ≥ 0 | INVALID_GIVEAWAY_GOODS_CONDITION_THRESHOLD |
| 증정 최대예상비용 | 공급가 × 최대수량 | CALC_MAXIMUM_EXPECTED_PRICE_ERROR |
| 증정 제공 유형 | EACH(이상) / EVERY(마다) | INVALID_GIVEAWAY_GOODS_PROVISION_TYPE |
| 증정 기준 유형 | PRICE(원/금액) / QUANTITY(개/수량) | INVALID_GIVEAWAY_GOODS_THRESHOLD_TYPE |

### 5-6. 상품 중복 검증

| 항목 | 에러 코드 |
|------|---------|
| 타 프로모션 중복 지원 (Group A 유형은 불가) | DUPLICATE_APPLY |
| 동일 신청서 내 중복 상품 | DUPLICATE_APPLICATION_GOODS_APPLY |
| 동일 프로모션+구분 내 중복 상품 | DUPLICATE_PROMOTION_GOODS_APPLY |
| 판매가 없음 | NOT_FOUND_BASE_PRICE |
| 판매가 불일치 (마스터 vs 입력) | NOT_MATCHED_BASE_PRICE |
| 공급가 없음 | NOT_FOUND_SUPPLY_PRICE |
| 공급가 불일치 | NOT_MATCHED_SUPPLY_PRICE |

---

## 6. 할인금액 교차 검증 (프로모션 유형 간)

동일 기간에 겹치는 진행중 프로모션에 동일 상품이 존재할 때 적용됩니다.

### 6-1. 동일 조건수량이 있는 경우

| 진행중 \ 신규 | 기획전/특가전 (Group A) | 라이브/일특/기타 (Group B) | 멤버스특가 (Group C) |
|------------|-----------------|-------------------|----------------|
| **기획전/특가전 (A)** | `= 동일금액만` | `> 초과만` | `> 초과만` |
| **라이브/일특/기타 (B)** | `< 미만만` | `= 동일금액만` | `무관` |
| **멤버스특가 (C)** | `< 미만만` | `무관` | `= 동일금액만` |

**에러 메시지 패턴**:
- 동일: "할인금액 : {금액}원으로 신청 가능"
- 초과: "할인금액 : {금액}원 초과금액으로 신청 가능"
- 미만: "할인금액 : {금액}원 미만으로 신청 가능"
- 에러 코드: `VIOLATION_ON_DISCOUNT_PRICE_POLICY`

### 6-2. 동일 조건수량이 없는 경우 (다다익선)

**비교 기준**: 입력한 조건수량에 가장 근접한 낮은/높은 조건수량의 **개당 환산 할인금액**

```
근접_낮은 = 진행중에서 신규 조건수량보다 작은 것 중 MAX
근접_높은 = 진행중에서 신규 조건수량보다 큰 것 중 MIN

기준_최소 = (근접_낮은 할인금액 ÷ 근접_낮은 조건수량) × 신규_조건수량
기준_최대 = (근접_높은 할인금액 ÷ 근접_높은 조건수량) × 신규_조건수량
```

| 진행중 \ 신규 | 기획전/특가전 (A) | 라이브/일특/기타 (B) | 멤버스특가 (C) |
|------------|-----------|------------|----------|
| **A** | 최소: `> strict` / 최대: `< strict` | 최소: `> strict` / 최대: `< 또는 ≥ (⚠️팝업)` | 최소: `> strict` / 최대: `< 또는 ≥ (⚠️팝업)` |
| **B** | 최소: `> 또는 ≤ (⚠️팝업)` / 최대: `< strict` | 최소: `> strict` / 최대: `< strict` | **무관** |
| **C** | 최소: `> 또는 ≤ (⚠️팝업)` / 최대: `< strict` | **무관** | 최소: `> strict` / 최대: `< strict` |

**판정 3단계**:
- ✅ PASS: 범위 내 → 제출 가능
- ⚠️ SOFT WARNING: 유연 범위 → 팝업 안내 후 진행 가능
- ❌ HARD BLOCK: 범위 밖 → 제출 차단

### 6-3. 복합 케이스 (진행중 2개 이상)

```
최종 최소금액 = 모든 진행중 프로모션별 계산 결과 중 MAX
최종 최대금액 = 모든 진행중 프로모션별 계산 결과 중 MIN

Soft Warning이 포함된 경계는 Hard Block이 아닌 팝업 안내 후 진행 가능
```

### 6-4. 쿠폰/기간 예외

- **쿠폰 프로모션**: 금액 비교 무관 (스킵)
- **기간 안겹침**: 금액 비교 무관

---

## 7. 합의 처리 정책

### 7-1. 합의 가능 조건

| 조건 | 규칙 | 에러 코드 |
|------|------|---------|
| 신청서 상태 | **합의대기(READY_TO_AGREE)**만 | INVALID_APPLICATION_STATUS |
| 프로모션 버전 | 버전 변경되지 않았어야 함 | PROMOTION_HAS_CHANGED |

### 7-2. 합의 방식

| 방식 | 주체 | 필수 조건 |
|------|------|---------|
| 파일 없이 합의 | 공급사/컬리 | 합의 데이터만 생성 |
| 파일과 함께 합의 | 공급사/컬리 | S3에 합의서 PDF 업로드 |

### 7-3. 합의 후 처리

- 신청서 상태: **합의완료(AGREED)** 전환
- Kafka 이벤트 발행
- Spring 이벤트 발행
- DB replica lag 대비 **최대 5회 재시도 (150ms 간격)**

### 7-4. 합의서 파일 관리

| 항목 | 규칙 |
|------|------|
| 저장소 | AWS S3 |
| 파일명 | `{신청서코드}.{확장자}` |
| 일괄 다운로드 제한 | 최대 100개 (초과 시 에러) |
| 미생성 감지 | 합의서 생성 후 3~4분 경과 시 알림 발송 |

---

## 8. 파트너 프로모션 참여 자격 검증

| 순서 | 조건 | 에러 코드 |
|------|------|---------|
| 1 | 프로모션코드+공급사코드로 파트너프로모션 존재 확인 | CAN_NOT_APPLY_PARTNER_PROMOTION |
| 2 | 프로모션이 취소되지 않았는지 확인 | CAN_NOT_APPLY_PARTNER_PROMOTION |
| 3 | 해당 혜택 유형(benefitType)이 포함되었는지 확인 | CAN_NOT_APPLY_PARTNER_PROMOTION |
| 4 | 신청 마감일(applicationEndDate) 미초과 확인 | END_OF_APPLY |

---

## 9. 정산 유형

| 유형 | 코드 | 설명 |
|------|------|------|
| 상계 | OFFSET | 매입 정산 금액에서 상계 |
| 입금 | DEPOSIT | 직접 입금 |

---

## 10. 알림 발송 정책

### 10-1. 배치 기반 알림

| 배치 Job | 발송 조건 | 수신자 |
|---------|---------|-------|
| 합의대기 전환 알림 | 신청서가 [합의대기]로 전환될 때 | 공급사 담당자 |
| 합의서 파일 미생성 알림 | 합의서 생성 후 3분 이내 PDF 미생성 시 | 공급사 담당자 |
| 시작 전 합의대기 알림 | N일 후 시작 프로모션인데 [합의대기] 상태 | 공급사 담당자 |
| 진행중 합의대기 알림 | 프로모션 진행중인데 [합의대기] 상태 | 공급사 담당자 |

### 10-2. 발송 공통 조건

- 담당자 연락처가 **유효(isValidContactNumber)**한 경우에만 발송
- 담당자가 없거나 연락처가 없으면 **미발송 + 경고 로그 기록**

### 10-3. SMS/알림톡 (eSCM-API 기반)

| 이벤트 | 대상 | 조건 |
|--------|------|------|
| 합의요청 | 공급사 담당자 | 휴대폰번호 존재 + 미삭제 |
| 정정 승인 | 공급사 담당자 전체 | 필터 없음 |
| 정정 반려 | 공급사 담당자 전체 | 필터 없음 |

---

## 11. API 엔드포인트

### 11-1. 공급사용 (`/shared/v4/`)

| HTTP | 경로 | 기능 |
|------|------|------|
| GET | `/partner-promotions` | 파트너 프로모션 목록 조회 |
| GET | `/partner-promotions/{code}` | 파트너 프로모션 상세 조회 |
| GET | `/promotion-applications` | 신청서 목록 조회 |
| POST | `/promotion-applications/download` | 신청서 다운로드 |
| POST | `/price-discount-goods/support` | 판매가 할인 상품 지원 |
| POST | `/price-discount-goods/validate` | 판매가 할인 상품 검증 |
| PUT | `/price-discount-goods/modify` | 판매가 할인 상품 수정 |
| DELETE | `/price-discount-goods/cancel` | 판매가 할인 상품 취소 |
| POST | `/coupon-goods/support` | 쿠폰 상품 지원 |
| POST | `/coupon-goods/validate` | 쿠폰 상품 검증 |
| POST | `/inventory-price-discount-goods/support` | 입고가 할인 상품 지원 |
| POST | `/inventory-price-discount-goods/validate` | 입고가 할인 상품 검증 |
| POST | `/giveaway/support` | 증정 상품 지원 |
| POST | `/promotion-agreements/agree` | 합의 처리 |
| GET | `/promotion-agreements/{id}/download` | 합의서 다운로드 |

### 11-2. 컬리 내부용 (`/supervisor/v4/`)

| HTTP | 경로 | 기능 |
|------|------|------|
| POST | `/promotion-agreements/download` | 합의서 일괄 다운로드 (최대 100개) |
| GET | `/promotion-agreements/{id}/download` | 합의서 개별 다운로드 |

### 11-3. eSCM-API 프로모션 API (`/api/v2/promotions`)

| HTTP | 경로 | 기능 | 권한 |
|------|------|------|------|
| POST | `/` | 등록 | 공급사 |
| PUT | `/{id}` | 수정 | 공급사 (PROPOSAL/IN_PROGRESS만) |
| PUT | `/cancel/{id}` | 제안취소 | 공급사 |
| PUT | `/reject` | 반려 (복수) | 컬리 |
| PUT | `/examine` | 검토/수정 (복수) | 컬리 |
| PUT | `/approve` | 합의요청 (복수) | 컬리 + SMS |
| PUT | `/settle/{id}` | 합의완료 | 공급사 (직인 필수) |
| PUT | `/delegate/{id}` | 수동합의 | 컬리 (합의문서 필수) |
| PUT | `/request/terminate/{id}` | 해지요청 | 공급사 (직인 필수) |
| PUT | `/confirm/terminate/{id}` | 해지승인 | 컬리 |
| PUT | `/reject/terminate/{id}` | 해지거부 | 컬리 |
| PUT | `/terminate/{id}` | 즉시해지 | 컬리 |
| PUT | `/request/correct/{id}` | 정정요청 | 공급사 |
| PUT | `/confirm/correct/{id}` | 정정승인 | 컬리 + SMS |
| PUT | `/reject/correct/{id}` | 정정반려 | 컬리 + SMS |

---

## 12. 동시성 제어

| 대상 엔티티 | 방식 | 충돌 시 처리 |
|---------|------|---------|
| PromotionApplication | Optimistic Locking (@Version) | 배치에서 건너뛰기 + 경고 로그 |
| PartnerPromotion | Optimistic Locking (@Version) | 배치에서 건너뛰기 + 경고 로그 |
| PromotionAgreement | Optimistic Locking (@Version) | 배치에서 건너뛰기 + 경고 로그 |

---

## 13. 정정(Correction) 정책 (eSCM-API)

| 항목 | 규칙 |
|------|------|
| 가능 상태 | AGREED(합의완료)만 |
| 정정 가능 항목 | **종료일, 오프셋(상계) 여부만** |
| 종료일 제한 | 기존 종료일보다 이전 + 시작일보다 이후 |
| 승인 시 | 정정 내용 프로모션 본체에 반영 + SMS 발송 |
| 반려 시 | 원본 데이터 유지 + SMS 발송 |
| 취소 불가 조건 | 이미 승인/반려된 정정 |

---

## 14. 해지(Termination) 정책 (eSCM-API)

| 액션 | 주체 | 필수 조건 | 결과 |
|------|------|---------|------|
| 해지요청 | 공급사 | **해지직인 필수** | REQUEST_TO_TERMINATE |
| 해지승인 | 컬리 | 해지요청 상태 확인 | TERMINATED |
| 해지거부 | 컬리 | - | AGREED 원복 + 해지정보 초기화 |
| 해지취소 | 공급사 | 본인 + 해지요청 상태 | AGREED 원복 |
| 즉시해지 | 컬리 | 사유 + 참조문서 | TERMINATED (요청 생략) |

---

## 15. 다다익선(번들할인) 신규 정책

### 15-1. 조건수량 규칙

| 항목 | 규칙 |
|------|------|
| 입력값 | 2 이상 양의정수만 (텍스트/소수점/음수 차단) |
| 미입력 시 | 자동 '2' 기입 |
| 동일상품 제한 | 동일 마스터코드에 동일 조건수량 입력 불가 |
| 최대 건수 | 일반 1건 + 다다익선 최대 5건 |
| 변경 제한 | 신청 완료 후 할인종류/조건수량 변경 불가 |

### 15-2. 개당 환산 정책

```
개당 환산 할인금액 = 할인금액 ÷ 조건수량
```

- 할인금액 유효성 검사는 **개당 환산** 기준으로 비교
- ⚠️ 소수점 처리 기준(반올림/버림/올림) PRD 미명시

### 15-3. 합의서 비용 계산

```
다다익선 비용 = 할인금액 × (예상수량 ÷ 조건수량) × 공급사 분담률(%)
```

- 동일 상품의 여러 ROW 중 **공급사 분담비용이 가장 높은 ROW** 기준으로 대표 표기

---

## 16. ⚠️ 정책 확인 필요 항목

| # | 항목 | 모호한 점 |
|---|------|---------|
| 1 | 다다익선 개당 환산 소수점 처리 | 반올림/버림/올림 중 어떤 방식인지 미명시 |
| 2 | '신청 완료 후' 정확한 시점 | PROPOSAL 등록 즉시? IN_PROGRESS 이후? |
| 3 | 컬리 프로모션(KurlyPromotion) 매핑 | 다다익선 복수 ROW가 어떻게 매핑되는지 미명시 |
| 4 | 일반 ROW 없이 다다익선만 가능 여부 | PRD에 명확히 기술되지 않음 |
| 5 | 조건수량 상한 | 최대값 제한이 있는지 미명시 |
| 6 | 복합 케이스에서 최소>최대 역전 | 범위 역전 시 처리 방법 미정의 |
| 7 | MD 검토 시 다다익선 ROW 수정 범위 | ROW별 개별 수정? 상품 단위? |
| 8 | 정정에서 다다익선 조건 변경 | 합의 후 조건수량/할인금액 정정 불가 → 해지→재등록만 가능? |
| 9 | 입고가 할인 + 다다익선 적용 여부 | 다다익선이 판매가 할인에만 적용되는지 |
| 10 | 양쪽 동일 거리 근접 조건수량 | 조건수량 2와 6 사이 4 입력 시 어느 쪽 기준인지 |
