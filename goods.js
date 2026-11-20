// ═══════════ 상품 등록 탭 (STG 전용, 화면 조작 없이 API로만) ═══════════
// 컬리옵스: 토큰 확인 → 상품 엑셀 업로드 → 공급 정보 엑셀 업로드 → 승인 → 활성화
// 파트너포털: 공급사 로그인 → 견적서 등록 → 담당 MD 로그인 → 견적 승인 → 발주 가능 확인
// 엑셀은 브라우저에서 만든다(index.html 의 zipStore 사용). 진행 상태는 이 브라우저(localStorage)에만 남는다.
(function () {
  var ESCM = "https://api.escm.stg.kurly.com";
  var ADMIN = "https://escm-api-admin.stg.kurly.services";
  var OPS_GW = "https://kurly-ops-gateway.stg.kurly.services/api-lip";
  var STATE_KEY = "goodsRegState", FORM_KEY = "goodsRegForm";

  var STEPS = [["register", "상품 등록", "1. 컬리옵스 상품 등록"], ["supply", "공급 정보", "2. 컬리옵스 공급 정보 등록"], ["activate", "승인·활성화", "3. 컬리옵스 상품 승인·활성화"],
    ["estimate", "견적 등록", "4. 파트너포털 견적서 등록(공급사)"], ["approve", "MD 승인", "5. 견적 승인(담당 MD)"], ["verify", "발주 가능", "6. 컬리옵스 발주 가능 확인"]];
  var STEP_NAME = {}; STEPS.forEach(function (s) { STEP_NAME[s[0]] = s[2]; }); STEP_NAME.check = "시작 전 계정 확인";
  var DAYS = "월화수목금토일";
  var KNOWN_EMAIL = { "qa_md1": "qa_md1@kurlycorp.com", "장세희": "seahui.jang@kurlycorp.com" };
  var TAXES = ["과세", "면세", "영세"];
  var HEADER_WORDS = /^(상품\s*코드|상품명|과세\s*구분|공급가|no|#)$/i;

  // ---------- 엑셀 양식 (컬리옵스 '상품 일괄 등록'·'공급 정보 일괄 등록' 1행 머리) ----------
  var PRODUCT_HEADERS = ["공급사 코드 (필수)", "상품 코드(마스터) (필수)", "상품명 (필수)", "대분류 (필수)", "중분류 (필수)", "소분류 (필수)", "세분류", "과세 구분 (필수)", "소싱 유형 (필수)", "보관 유형 (필수)", "상온냉장합포 여부 (필수)", "일판매 여부 (필수)", "판매 방법 (필수)", "기한 정책 (필수)", "유통기한(소비기한) 일수 (필수)", "판매가능일수 (필수)", "판매마감일수 (필수)", "유리포함(필수)", "눌림주의(필수)", "컬리냉매제(필수)", "정방향 여부 (필수)", "뷰티포장 (필수)", "배송 배차 유형(필수)", "샛별오더유형 (필수)", "택배오더유형 (필수)", "대량오더유형 (필수)", "단위 (필수)", "박스당 입수 (필수)", "개당 순중량(g) (필수)", "개당 총중량(g) (필수)", "개당 길이(mm) (필수)", "개당 폭(mm) (필수)", "개당 높이(mm) (필수)", "박스당 순중량(g) (필수)", "박스당 총중량(g) (필수)", "박스당 길이(mm) (필수)", "박스당 폭(mm) (필수)", "박스당 높이(mm) (필수)", "상품 운영 종류 (필수)", "상품 바코드 (본품만 필수)", "센터 상품명", "출하 코드 (대품만 필수)", "검품 대상 여부 (필수)", "안전재고일수"];
  var SUPPLY_HEADERS = ["상품 코드(마스터) (필수)", "공급사 코드 (필수)", "담당 MD (필수)", "담당 AMD (필수)", "발주 담당 (필수)", "출고 방법 (필수)", "출고 주소(컬리픽업)", "출고 상세 주소(컬리픽업)", "출고지 연락처(컬리픽업)", "출고 주소(밀크런픽업)", "출고 상세 주소(밀크런픽업)", "출고지 연락처(밀크런픽업)", "발주 유형", "경유 센터 (필수)", "입고 여부 (필수)", "리드 타임 (필수)", "최소 발주 수량 (필수)", "새벽입고 여부 (필수)", "공급사 최대 생산 capa (필수)", "발주 월", "발주 화", "발주 수", "발주 목", "발주 금", "납품 월", "납품 화", "납품 수", "납품 목", "납품 금", "납품 토", "납품 일", "비고"];
  var TAX_CODE = { "과세": "TAXED", "면세": "EXEMPTED", "영세": "ZERO" };
  // 보관 유형 → [보관 코드, 샛별, 택배, 대량 오더유형]
  var STORAGE = { "냉장": [1, 210, 270, 280], "냉동": [2, 220, 271, 281], "상온": [3, 225, 272, 282] };
  var SHIPPING = { "직배송": "DIRECT_DELIVERY", "택배": "PARCEL", "컬리픽업": "KURLY_PICKUP", "밀크런픽업": "MILKRUN_PICKUP", "컬리+밀크런픽업": "KURLY_MILKRUN_PICKUP", "기타": "ETC" };
  // 기준 상품(QA1113SH0001)과 같은 값: 과일/견과 > 견과/건과 > 건과, NB, 후판매, 소비기한, EA 입수 10
  var DEFAULT_PRODUCT = {
    "대분류 (필수)": "FI_00000015", "중분류 (필수)": "SE_00000121", "소분류 (필수)": "TH_00000565",
    "소싱 유형 (필수)": "NB", "상온냉장합포 여부 (필수)": "N", "일판매 여부 (필수)": "N", "판매 방법 (필수)": "STORE_FIRST",
    "기한 정책 (필수)": "USE_DATE", "유리포함(필수)": "N", "눌림주의(필수)": "N", "컬리냉매제(필수)": "Y",
    "정방향 여부 (필수)": "IRRELEVANT", "뷰티포장 (필수)": "N", "배송 배차 유형(필수)": "NORMAL",
    "단위 (필수)": "EA", "박스당 입수 (필수)": 10,
    "개당 순중량(g) (필수)": 1000, "개당 총중량(g) (필수)": 1100, "개당 길이(mm) (필수)": 200, "개당 폭(mm) (필수)": 150, "개당 높이(mm) (필수)": 100,
    "박스당 순중량(g) (필수)": 10000, "박스당 총중량(g) (필수)": 11000, "박스당 길이(mm) (필수)": 600, "박스당 폭(mm) (필수)": 400, "박스당 높이(mm) (필수)": 300,
    "상품 운영 종류 (필수)": "ORIGINAL", "검품 대상 여부 (필수)": "N"
  };

  function colName(i) { var s = ""; i++; while (i) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function xcell(v, ref) {
    if (v === undefined || v === null || v === "") return "";
    if (typeof v === "number") return '<c r="' + ref + '"><v>' + v + "</v></c>";
    return '<c r="' + ref + '" t="inlineStr"><is><t>' + xmlEsc(v) + "</t></is></c>";
  }
  // 머리줄 + 행(객체) → xlsx Blob. 시트 이름은 컬리옵스 양식과 같게 '업로드양식'
  function sheetXlsx(headers, objs) {
    var rows = [headers].concat(objs.map(function (o) { return headers.map(function (h) { return o[h]; }); }));
    var xml = rows.map(function (r, ri) { return '<row r="' + (ri + 1) + '">' + r.map(function (v, ci) { return xcell(v, colName(ci) + (ri + 1)); }).join("") + "</row>"; }).join("");
    return zipStore([
      { name: "[Content_Types].xml", content: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>' },
      { name: "_rels/.rels", content: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: "xl/workbook.xml", content: '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="업로드양식" sheetId="1" r:id="rId1"/></sheets></workbook>' },
      { name: "xl/_rels/workbook.xml.rels", content: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>' },
      { name: "xl/worksheets/sheet1.xml", content: '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + xml + "</sheetData></worksheet>" }
    ]);
  }
  function productRows(items, cfg) {
    return items.map(function (it) {
      var st = STORAGE[cfg.storageType] || STORAGE["냉장"];
      var o = Object.assign({}, DEFAULT_PRODUCT);
      o["공급사 코드 (필수)"] = cfg.supplierCode; o["상품 코드(마스터) (필수)"] = it.code; o["상품명 (필수)"] = it.name;
      o["과세 구분 (필수)"] = TAX_CODE[it.taxType] || "TAXED"; o["보관 유형 (필수)"] = st[0];
      o["유통기한(소비기한) 일수 (필수)"] = cfg.expirationDays; o["판매가능일수 (필수)"] = cfg.sellAvailableDays; o["판매마감일수 (필수)"] = cfg.sellDeadlineDays;
      o["샛별오더유형 (필수)"] = st[1]; o["택배오더유형 (필수)"] = st[2]; o["대량오더유형 (필수)"] = st[3];
      o["상품 바코드 (본품만 필수)"] = it.barcode; o["센터 상품명"] = it.name;
      return o;
    });
  }
  function supplyRows(items, cfg) {
    return items.map(function (it) {
      var o = {
        "상품 코드(마스터) (필수)": it.code, "공급사 코드 (필수)": cfg.supplierCode,
        "담당 MD (필수)": cfg.mdCode, "담당 AMD (필수)": cfg.amdCode || cfg.mdCode, "발주 담당 (필수)": cfg.poCode || cfg.mdCode,
        "출고 방법 (필수)": SHIPPING[cfg.shippingMethod] || "DIRECT_DELIVERY", "발주 유형": "REGULAR",
        "경유 센터 (필수)": "경유안함", "입고 여부 (필수)": "Y",
        "리드 타임 (필수)": cfg.leadTime, "최소 발주 수량 (필수)": cfg.minOrderQty,
        "새벽입고 여부 (필수)": "NORMAL", "공급사 최대 생산 capa (필수)": cfg.maxCapa
      };
      DAYS.slice(0, 5).split("").forEach(function (d) { o["발주 " + d] = cfg.orderDays.indexOf(d) >= 0 ? "Y" : "N"; });
      DAYS.split("").forEach(function (d) { o["납품 " + d] = cfg.deliveryDays.indexOf(d) >= 0 ? "Y" : "N"; });
      return o;
    });
  }

  // ---------- API ----------
  function decodeJwt(t) {
    try { var b = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(decodeURIComponent(escape(atob(b)))); } catch (e) { return {}; }
  }
  async function call(url, opt) {
    opt = opt || {};
    var headers = { accept: "application/json" };
    if (opt.body) headers["content-type"] = "application/json;charset=UTF-8";
    if (opt.token) headers.authorization = opt.bearer ? "Bearer " + opt.token : opt.token;
    var res = await fetch(url, { method: opt.method || "GET", headers: headers, body: opt.body ? JSON.stringify(opt.body) : undefined });
    var text = await res.text(), data;
    try { data = JSON.parse(text); } catch (e) { data = { _raw: text.slice(0, 200) }; }
    return { status: res.status, data: data };
  }
  var api = {
    supplierLogin: async function (loginId, password) {
      var r = await call(ESCM + "/api/v2/user/login", { method: "POST", body: { loginId: loginId, password: password } });
      if (!r.data || !r.data.token) throw new Error("공급사 로그인 실패(" + loginId + "): " + ((r.data && (r.data.errorMessage || r.data.message)) || r.status));
      var j = decodeJwt(r.data.token);
      return { token: r.data.token, supplierId: j.supplierId, supplierCode: j.supplierCode };
    },
    staffLogin: async function (email) {
      var r = await call(ADMIN + "/api-authorization/supervisor/v1/employee/fake-signin/email/" + encodeURIComponent(email));
      if (!r.data || !r.data.token) throw new Error("임직원 로그인 실패(" + email + "): " + ((r.data && (r.data.errorMessage || r.data.message)) || r.status));
      return { token: r.data.token, name: decodeJwt(r.data.token).name };
    },
    supplierInfo: async function (sup) {
      var d = await call(ESCM + "/api/v2/suppliers/" + sup.supplierId, { token: sup.token });
      var m = await call(ESCM + "/api/v2/suppliers/" + sup.supplierId + "/kurlyManagers", { token: sup.token });
      if (!Array.isArray(m.data)) throw new Error("담당자 조회 실패: " + m.status);
      var pick = function (type) { return m.data.filter(function (x) { return x.kurlyManagerType === type && !x.del; }).map(function (x) { return { name: x.userName, email: x.userId || x.userEmail, code: x.employeeCode }; }); };
      return { supplierId: sup.supplierId, supplierCode: sup.supplierCode, supplierName: (d.data && ((d.data.result && d.data.result.supplierName) || d.data.supplierName)) || "", md: pick("MD"), amd: pick("SUPPORT"), po: pick("CO") };
    },
    supplierGoods: async function (token, code) {
      var r = await call(ESCM + "/api/v3/goods?searchField=goodsCode&searchWord=" + encodeURIComponent(code) + "&currentPage=1&limit=5", { token: token, bearer: true });
      return Array.isArray(r.data) ? (r.data.find(function (x) { return x.goodsCode === code; }) || null) : null;
    },
    createEstimate: async function (token, supplierId, estimateName, lines) {
      var kst = function (d) { return new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 19); };
      var from = kst(new Date());
      var body = {
        estimateId: 0, supplierId: supplierId, estimateName: estimateName, estimateCode: "", estimateCodeSupplier: "",
        requestDate: from, priceFromDate: from, priceToDate: "9999" + from.slice(4), del: false,
        goodsEstimateDTOList: lines.map(function (l) {
          var g = l.goods, p = Number(l.price), tax = g.taxation === "TAXED" ? Math.round(p * 0.1) : 0;
          return {
            goodsEstimateId: 0, estimateId: 0, goodsId: g.goodsId, goodsName: g.goodsName, goodsCode: g.goodsCode,
            unit: g.unit, boxPerQnty: g.boxPerQnty != null ? g.boxPerQnty : g.boxPerQuantity, price: String(p), taxPrice: tax, totalPrice: p + tax,
            applicatedPrice: 0, currentPrice: 0, currentEventPrice: 0, remarks: "", approvalStatus: "TEMP",
            priceChangeReason: null, disabledPriceChangeReason: true, estimateType: "NORMAL", taxation: g.taxation,
            netWeight: g.boxNetWeight != null ? g.boxNetWeight : g.netWeight, grossWeight: g.boxGrossWeight != null ? g.boxGrossWeight : g.grossWeight, // 화면은 박스 중량을 보낸다
            kurlyManagerMd: g.kurlyManagerMd, kurlyManagerSupport: g.kurlyManagerSupport
          };
        }),
        approvalDTOList: [], estimateType: "NORMAL", approvalStatus: "BEFORE_APPROVAL_MD"
      };
      var r = await call(ESCM + "/api/v2/estimates", { method: "POST", token: token, bearer: true, body: body });
      if (r.status !== 200 && r.status !== 201) throw new Error("견적서 등록 실패: " + r.status + " " + JSON.stringify(r.data).slice(0, 300));
      return r.data;
    },
    findEstimate: async function (token, q) {
      var r = await call(ESCM + "/api/v2/estimates?" + q + "&currentPage=1&limit=5", { token: token, bearer: true });
      return Array.isArray(r.data) ? r.data : [];
    },
    // 화면 [승인]과 같은 요청: 견적 상세의 상품 목록을 함께 보낸다
    approveEstimate: async function (token, estimateId) {
      var d = await call(ESCM + "/api/v2/estimates/" + estimateId, { token: token, bearer: true });
      var list = d.data && d.data.goodsEstimateDTOList;
      if (!Array.isArray(list) || !list.length) throw new Error("견적 상세의 상품 목록을 읽지 못했습니다: " + d.status);
      var r = await call(ESCM + "/api/v2/estimates/status", { method: "PUT", token: token, bearer: true, body: { approvalType: "ESTIMATE", targetId: estimateId, approvalStatus: "APPROVED", goodsEstimateDTOs: list } });
      if (r.status !== 200 || (r.data && r.data.approvalStatus && r.data.approvalStatus !== "APPROVED")) throw new Error("견적 승인 실패: " + r.status + " " + JSON.stringify(r.data).slice(0, 150));
    },
    ops: async function (token, url, opt) {
      opt = opt || {};
      var headers = { accept: "application/json", authorization: "Bearer " + token };
      if (opt.body) headers["content-type"] = "application/json";
      var res = await fetch(OPS_GW + url, { method: opt.method || "GET", headers: headers, body: opt.form || (opt.body ? JSON.stringify(opt.body) : undefined) });
      var text = await res.text(), data;
      try { data = JSON.parse(text); } catch (e) { data = { _raw: text.slice(0, 300) }; }
      if (res.status === 401) throw new Error("컬리옵스 토큰이 만료됐거나 다른 곳에서 같은 계정으로 다시 로그인했습니다(401). 컬리옵스 탭에서 토큰을 다시 복사해 넣으세요");
      return { status: res.status, data: data };
    },
    opsUpload: async function (token, url, blob, fileName) {
      var form = new FormData();
      form.append("file", blob, fileName);
      var r = await api.ops(token, url, { method: "POST", form: form });
      if (r.status !== 200) throw new Error("엑셀 업로드 실패: " + r.status + " " + JSON.stringify(r.data).slice(0, 300));
      if (r.data && r.data.error) throw new Error("엑셀 업로드 오류: " + JSON.stringify(r.data.error).slice(0, 300));
      return (r.data && r.data.data) || {};
    },
    opsFindSku: async function (token, code) {
      var r = await api.ops(token, "/v1/ops/skus?skuPartyType=1PL&keyWord=SKU_CODE&keyWordValue=" + encodeURIComponent(code) + "&cursor=0&limit=20");
      return ((r.data && r.data.data) || []).find(function (x) { return x.skuCode === code; }) || null;
    },
    opsFindSupplies: async function (token, code) {
      var r = await api.ops(token, "/v1/ops/sku-suppliers?skuSupplierKeyword=SKU_CODE&skuSupplierKeywordValue=" + encodeURIComponent(code) + "&cursor=0&limit=20");
      return ((r.data && r.data.data) || []).filter(function (x) { return x.skuCode === code; });
    },
    opsPut: async function (token, what, skuIds) {
      var r = await api.ops(token, "/v1/ops/skus/" + what, { method: "PUT", body: { skuIds: skuIds } });
      if (r.status !== 200 || (r.data && r.data.error)) throw new Error("상품 " + (what === "approve" ? "승인" : "활성화") + " 실패: " + r.status + " " + JSON.stringify(r.data).slice(0, 300));
    }
  };

  // ---------- 공통 ----------
  var el = function (id) { return document.getElementById(id); };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var supplyCode = function (r) { return (r && r.supplyStatus && r.supplyStatus.code) || (r && r.supplyStatus); }; // {code, name} 으로 온다
  function Stop(msg) { this.message = msg; }
  var stopRequested = false;
  // 조건이 맞을 때까지 기다린다(고정 대기 금지)
  async function until(fn, timeout, every) {
    var end = Date.now() + timeout;
    for (;;) {
      if (stopRequested) throw new Stop("중지했습니다");
      var v = null; try { v = await fn(); } catch (e) { v = null; }
      if (v) return v;
      if (Date.now() > end) return null;
      await sleep(every);
    }
  }
  // 여러 건을 10개씩 나눠 동시에 조회한다
  async function mapLimit(list, fn) {
    var out = [];
    for (var i = 0; i < list.length; i += 10) out = out.concat(await Promise.all(list.slice(i, i + 10).map(fn)));
    return out;
  }
  function glog(msg, type) {
    el("gdLogArea").style.display = "block";
    var li = document.createElement("li");
    li.className = type || "info";
    li.textContent = "[" + new Date().toLocaleTimeString("ko-KR", { hour12: false }) + "] " + msg;
    el("gdLog").appendChild(li);
    li.scrollIntoView({ block: "nearest" });
  }
  var esc = function (v) { return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); };
  var today = function () { var t = new Date(); return String(t.getMonth() + 1).padStart(2, "0") + String(t.getDate()).padStart(2, "0"); };
  function loadJson(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function saveJson(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  // 컬리옵스 토큰: 따옴표·Bearer 를 떼고, JWT 면 사용자·만료 시각을 읽는다
  function cleanToken(v) { return String(v || "").trim().replace(/^"|"$/g, "").replace(/^Bearer\s+/i, ""); }
  function tokenWho(t) { var j = decodeJwt(t); return j.name || j.userName || j.loginId || j.id || j.sub || ""; }
  function tokenExp(t) { var j = decodeJwt(t); return j.exp ? j.exp * 1000 : 0; }

  // ---------- 화면: 공급사 조회 ----------
  var lookup = null, emailByName = {};
  function fillSelect(sel, list, keep, placeholder) {
    sel.innerHTML = "";
    if (placeholder) sel.add(new Option(placeholder, ""));
    list.forEach(function (x) { sel.add(new Option(x.name, x.name)); });
    sel.disabled = !list.length;
    if (keep && list.some(function (x) { return x.name === keep; })) sel.value = keep;
  }
  async function doLookup() {
    var id = el("gdSupId").value.trim(), pw = el("gdSupPw").value;
    if (!id || !pw) { el("gdLookupMsg").textContent = "공급사 아이디와 비밀번호를 넣으세요"; return; }
    el("gdLookupBtn").disabled = true; el("gdLookupMsg").textContent = "조회 중…";
    try {
      var sup = await api.supplierLogin(id, pw);
      lookup = await api.supplierInfo(sup);
      lookup.loginId = id;
      emailByName = {};
      // 이메일 형식이 아닌 값(STG 데이터 오류)은 쓰지 않는다
      lookup.md.concat(lookup.amd, lookup.po).forEach(function (x) { if (/^[a-z0-9._-]+@[a-z0-9.-]+$/i.test(x.email || "")) emailByName[x.name] = x.email; });
      el("gdSupCard").classList.add("show");
      el("gdSupName").textContent = (lookup.supplierName || "-") + " (" + lookup.supplierCode + ")";
      var names = function (l) { return l.map(function (x) { return x.name; }).join(", ") || "-"; };
      el("gdSupSub").textContent = "담당MD " + names(lookup.md) + " · 담당AMD " + names(lookup.amd) + " · 발주담당 " + names(lookup.po);
      var saved = loadJson(FORM_KEY) || {};
      fillSelect(el("gdMd"), lookup.md, saved.mdName);
      fillSelect(el("gdAmd"), lookup.amd, saved.amdName, "담당 MD와 같게");
      fillSelect(el("gdPo"), lookup.po, saved.poName, "담당 MD와 같게");
      el("gdLookupMsg").textContent = lookup.md.length ? "조회 완료. 아래에서 담당 MD를 고르세요." : "이 공급사에 매핑된 담당 MD가 없습니다. 공급사 관리에서 담당자를 먼저 등록하세요.";
      onMdChange();
    } catch (e) {
      lookup = null; el("gdSupCard").classList.remove("show");
      el("gdLookupMsg").textContent = e.message;
    }
    el("gdLookupBtn").disabled = false;
    validate();
  }
  function onMdChange() {
    var n = el("gdMd").value, email = emailByName[n] || KNOWN_EMAIL[n] || "";
    if (email || n) el("gdMdEmail").value = email;
    validate();
  }

  // ---------- 화면: 상품 목록 표 ----------
  var manualRows = null;
  function autoRows() {
    var n = Math.min(Number(el("gdCount").value) || 0, 100);
    var m = el("gdStart").value.trim().match(/^(.*?)(\d+)$/);
    if (!m || !n) return [];
    return Array.from({ length: n }, function (_, i) { return { code: m[1] + String(Number(m[2]) + i).padStart(m[2].length, "0"), name: "", tax: "", price: "" }; });
  }
  function rows() { return (manualRows || autoRows()).filter(function (r) { return r.code; }); }
  function namePrefix() { return el("gdPrefix").value.trim() || "QA_대량_" + today() + "_"; }
  function renderGrid() {
    var list = manualRows || autoRows(), codes = list.map(function (r) { return r.code; });
    var defTax = el("gdTax").value, defPrice = el("gdPrice").value, prefix = namePrefix();
    el("gdGridMode").textContent = manualRows ? "직접 입력" : "자동";
    el("gdGridMode").className = "gd-mode" + (manualRows ? " manual" : "");
    el("gdGridReset").style.display = manualRows ? "" : "none";
    ["gdCount", "gdStart"].forEach(function (id) { el(id).disabled = !!manualRows; el(id).closest(".field").style.opacity = manualRows ? .45 : 1; });
    el("gdGridBody").innerHTML = list.map(function (r, i) {
      var badCode = r.code && (!/^[A-Z0-9]{12}$/.test(r.code) || codes.indexOf(r.code) !== i);
      var badTax = r.tax && TAXES.indexOf(r.tax) < 0, badPrice = r.price && !/^\d[\d,]*$/.test(r.price);
      return '<tr class="' + (manualRows ? "" : "auto") + '" data-i="' + i + '"><td class="no">' + (i + 1) + "</td>"
        + '<td class="c-code"><input class="mono' + (badCode ? " bad" : "") + '" data-k="code" data-c="0" maxlength="12" value="' + esc(r.code) + '"></td>'
        + '<td><input class="' + ((r.name || "").length > 40 ? "bad" : "") + '" data-k="name" data-c="1" maxlength="40" value="' + esc(r.name) + '" placeholder="' + esc(prefix + (r.code || "")) + '"></td>'
        + '<td class="c-tax"><select class="' + (badTax ? "bad" : "") + '" data-k="tax" data-c="2"><option value="">' + esc(defTax) + "(기본)</option>"
        + TAXES.map(function (t) { return "<option" + (t === r.tax ? " selected" : "") + ">" + t + "</option>"; }).join("") + (badTax ? "<option selected>" + esc(r.tax) + "</option>" : "") + "</select></td>"
        + '<td class="c-price"><input class="mono' + (badPrice ? " bad" : "") + '" data-k="price" data-c="3" value="' + esc(r.price) + '" placeholder="' + esc(defPrice || "공급가") + '"></td>'
        + '<td class="c-del"><button class="del" type="button" data-del="' + i + '" title="행 삭제">✕</button></td></tr>';
    }).join("") || '<tr><td colspan="6" class="empty">위에 개수·시작 코드를 넣거나, 엑셀에서 복사한 표를 여기에 붙여 넣으세요</td></tr>';
    el("gdGridHint").innerHTML = manualRows
      ? "직접 입력한 목록으로 등록합니다. 상품명·과세구분·공급가를 비우면 기본값을 씁니다."
      : "개수·시작 코드로 만든 목록입니다. 엑셀에서 <b>상품코드 · 상품명 · 과세구분 · 공급가</b> 순서로 복사해 표를 클릭하고 붙여 넣으면(⌘V) 그 목록으로 바뀝니다. 칸을 고쳐도 직접 입력으로 바뀝니다.";
  }
  function toManual() { if (!manualRows) manualRows = autoRows().map(function (r) { return Object.assign({}, r); }); }

  // ---------- 검증 ----------
  function daysVal(key) { return Array.prototype.map.call(document.querySelectorAll("#gd-" + key + " .chip.active"), function (b) { return b.dataset.d; }).join(""); }
  var running = false;
  function validate() {
    var msgs = [];
    var e = el("gdExp"), a = el("gdAvail"), d = el("gdDead"), ev = e.value.trim(), av = a.value.trim(), dv = d.value.trim();
    [e, a, d].forEach(function (x) { x.classList.remove("bad"); });
    if (!ev || !av || !dv) { msgs.push("소비기한·판매가능·판매마감 일수를 모두 입력하세요"); el("gdDaysMsg").style.color = "var(--red)"; el("gdDaysMsg").textContent = "세 값을 모두 입력하세요"; }
    else if (Number(ev) !== Number(av) + Number(dv)) {
      [e, a, d].forEach(function (x) { x.classList.add("bad"); });
      el("gdDaysMsg").style.color = "var(--red)";
      el("gdDaysMsg").textContent = "유통/소비기한일수는 판매가능일수 + 판매마감일수와 같아야 합니다. (" + ev + " ≠ " + av + " + " + dv + " = " + (Number(av) + Number(dv)) + ")";
      msgs.push("기한 일수 규칙이 맞지 않습니다");
    } else { el("gdDaysMsg").style.color = "var(--green)"; el("gdDaysMsg").textContent = "소비기한일수 " + ev + " = 판매가능 " + av + " + 판매마감 " + dv + " ✓"; }
    if (!lookup) msgs.push("공급사를 먼저 조회하세요");
    else if (!el("gdMd").value) msgs.push("담당 MD를 고르세요");
    var items = rows(), codes = items.map(function (x) { return x.code; });
    if (!manualRows && !/^[A-Z0-9]{12}$/.test(el("gdStart").value.trim())) msgs.push("시작 상품 코드는 영문 대문자·숫자 12자");
    if (!items.length) msgs.push("등록할 상품이 없습니다");
    if (items.length > 100) msgs.push("최대 100개 (지금 " + items.length + "개)");
    if (manualRows && manualRows.some(function (r) { return !r.code && (r.name || r.tax || r.price); })) msgs.push("상품코드가 빈 행이 있습니다");
    var bad = items.filter(function (x) { return !/^[A-Z0-9]{12}$/.test(x.code); }).map(function (x) { return x.code; });
    if (bad.length) msgs.push("상품코드는 영문 대문자·숫자 12자: " + bad.slice(0, 3).join(", "));
    var dup = codes.filter(function (c, i) { return codes.indexOf(c) !== i; });
    if (dup.length) msgs.push("겹치는 코드: " + dup.slice(0, 5).join(", "));
    var badTax = items.filter(function (x) { return x.tax && TAXES.indexOf(x.tax) < 0; }).map(function (x) { return x.code; });
    if (badTax.length) msgs.push("과세구분은 과세·면세·영세만: " + badTax.slice(0, 3).join(", "));
    var badPrice = items.filter(function (x) { return x.price && !/^\d[\d,]*$/.test(x.price); }).map(function (x) { return x.code; });
    if (badPrice.length) msgs.push("공급가는 숫자만: " + badPrice.slice(0, 3).join(", "));
    if (!(Number(el("gdPrice").value) > 0) && items.some(function (x) { return !x.price; })) msgs.push("기본 공급가를 입력하세요");
    el("gdCountMsg").textContent = items.length ? items.length + "개: " + codes[0] + (items.length > 1 ? " ~ " + codes[codes.length - 1] : "") + (manualRows ? " (직접 입력 목록)" : "") : "";
    if (!/@/.test(el("gdMdEmail").value)) msgs.push("담당 MD 파트너포털 이메일을 입력하세요");
    var tok = cleanToken(el("gdOpsToken").value), exp = tokenExp(tok);
    if (!tok) msgs.push("컬리옵스 로그인 토큰을 붙여 넣으세요");
    else if (exp && exp < Date.now()) msgs.push("컬리옵스 토큰이 만료됐습니다. 다시 복사해 넣으세요");
    el("gdTokenInfo").textContent = tok ? "토큰: " + (tokenWho(tok) || "확인 불가") + (exp ? " · 만료 " + new Date(exp).toLocaleTimeString("ko-KR", { hour12: false }) : "") : "";
    if (!daysVal("orderDays") || !daysVal("deliveryDays")) msgs.push("발주 가능 요일·납품 요일을 하나 이상 고르세요");
    el("gdBlockMsg").textContent = msgs.length ? "실행 전 확인: " + msgs.join(" · ") : "";
    el("gdRunBtn").disabled = running || msgs.length > 0;
    el("gdResumeBtn").disabled = running || msgs.length > 0 || !(loadJson(STATE_KEY) || {}).items;
    return msgs.length === 0;
  }

  // ---------- 실행 ----------
  function readCfg() {
    var codeOf = function (list, name) { var x = (list || []).find(function (y) { return y.name === name; }); return x && x.code; };
    var c = {
      supplierLoginId: el("gdSupId").value.trim(), supplierPassword: el("gdSupPw").value, supplierCode: lookup.supplierCode,
      mdName: el("gdMd").value, amdName: el("gdAmd").value, poName: el("gdPo").value, mdEmail: el("gdMdEmail").value.trim(),
      shippingMethod: el("gdShip").value, leadTime: Number(el("gdLead").value), minOrderQty: Number(el("gdMoq").value), maxCapa: Number(el("gdCapa").value),
      orderDays: daysVal("orderDays"), deliveryDays: daysVal("deliveryDays"),
      taxType: el("gdTax").value, storageType: el("gdStorage").value || "냉장",
      expirationDays: Number(el("gdExp").value), sellAvailableDays: Number(el("gdAvail").value), sellDeadlineDays: Number(el("gdDead").value),
      price: Number(el("gdPrice").value), proposalName: el("gdProposal").value.trim(), opsToken: cleanToken(el("gdOpsToken").value)
    };
    c.mdCode = codeOf(lookup.md, c.mdName);
    c.amdCode = codeOf(lookup.amd, c.amdName) || c.mdCode;
    c.poCode = codeOf(lookup.po, c.poName) || c.mdCode;
    return c;
  }
  function saveForm() {
    var f = {};
    ["gdSupId", "gdCount", "gdPrefix", "gdTax", "gdStorage", "gdExp", "gdAvail", "gdDead", "gdShip", "gdLead", "gdMoq", "gdCapa", "gdPrice", "gdMdEmail"].forEach(function (id) { f[id] = el(id).value; });
    f.mdName = el("gdMd").value; f.amdName = el("gdAmd").value; f.poName = el("gdPo").value;
    f.orderDays = daysVal("orderDays"); f.deliveryDays = daysVal("deliveryDays");
    saveJson(FORM_KEY, f);
  }
  function setStep(k, cls) { var s = document.querySelector('#gdFlow .flow-step[data-k="' + k + '"]'); if (s) s.className = "flow-step " + cls; }

  async function run(resume) {
    if (!validate()) return;
    var cfg = readCfg();
    if (!cfg.mdCode) { alert("담당 MD 사번을 찾지 못했습니다. 공급사를 다시 조회하세요"); return; }
    saveForm();
    var from = STEPS.findIndex(function (s) { return s[0] === el("gdFrom").value; });
    var to = STEPS.findIndex(function (s) { return s[0] === el("gdTo").value; });
    var state = resume ? loadJson(STATE_KEY) : null;
    if (!state || !state.items || !state.items.length) {
      var base = Date.now(), prefix = namePrefix();
      state = {
        done: [], failedItems: [],
        items: rows().map(function (r, i) {
          return { code: r.code, name: r.name || prefix + r.code, taxType: r.tax || cfg.taxType, price: Number(String(r.price || "").replace(/,/g, "")) || cfg.price, barcode: "88099" + String(base + i * 37).slice(-8) };
        })
      };
      state.proposalName = (cfg.proposalName || (state.items.length > 1 ? prefix + "견적" : state.items[0].code + "_견적")).slice(0, 20);
      resume = false;
    }
    var save = function () { saveJson(STATE_KEY, state); };
    var codes = function () { return state.items.map(function (x) { return x.code; }); };
    running = true; stopRequested = false; validate();
    el("gdRunBtn").innerHTML = '<span class="spinner"></span> 실행 중'; el("gdStopBtn").disabled = false;
    el("gdResult").className = "result-card"; el("gdLog").innerHTML = "";
    STEPS.forEach(function (s) { setStep(s[0], resume && state.done.indexOf(s[0]) >= 0 ? "done" : ""); });

    // 컬리옵스 로그인 API는 이 페이지 주소(origin)를 막아 두어서, 컬리옵스 화면에서 복사한 토큰을 쓴다
    var opsChecked = false;
    var ops = async function () {
      if (!opsChecked) {
        var r = await api.ops(cfg.opsToken, "/v1/ops/skus?skuPartyType=1PL&cursor=0&limit=1");
        if (r.status !== 200) throw new Error("컬리옵스 토큰을 쓸 수 없습니다(" + r.status + "). 다시 복사해 넣으세요");
        glog("컬리옵스 토큰 확인: " + (tokenWho(cfg.opsToken) || "OK"));
        opsChecked = true;
      }
      return cfg.opsToken;
    };
    var ready = async function (token, x, okStatus) {
      return (await api.opsFindSupplies(token, x.code)).find(function (r) { return r.supplierCode === cfg.supplierCode && (!okStatus || okStatus.indexOf(supplyCode(r)) >= 0); });
    };
    var addFailed = function (list) { state.failedItems = Array.from(new Set((state.failedItems || []).concat(list))); };

    var steps = {
      register: async function () {
        var token = await ops();
        var exist = (await mapLimit(codes(), async function (c) { return (await api.opsFindSku(token, c)) ? c : null; })).filter(Boolean);
        if (exist.length) {
          glog("이미 컬리옵스에 있는 코드 " + exist.length + "건은 빼고 진행: " + exist.slice(0, 10).join(", ") + (exist.length > 10 ? " …" : ""), "warn");
          state.items = state.items.filter(function (x) { return exist.indexOf(x.code) < 0; });
          if (!state.items.length) throw new Stop("등록할 새 상품이 없습니다(모두 이미 있는 코드). 시작 코드를 바꾸세요");
        }
        glog("상품 엑셀 업로드: " + state.items.length + "건");
        var res = await api.opsUpload(token, "/v1/ops/skus/1pl-excel-upload", sheetXlsx(PRODUCT_HEADERS, productRows(state.items, cfg)), "1PL상품_일괄등록.xlsx");
        var sum = res.summary || {};
        glog("업로드 결과: 요청 " + sum.totalRequests + " / 성공 " + sum.successRequests + " / 실패 " + sum.failedRequests, sum.failedRequests ? "warn" : "info");
        (res.saveExcelFailures || []).slice(0, 10).forEach(function (f) { glog("실패: " + (f.skuCode || "") + " " + (f.errorMessage || f.message || JSON.stringify(f).slice(0, 150)), "sub"); });
        var found = await mapLimit(state.items, async function (x) { return { x: x, sku: await until(function () { return api.opsFindSku(token, x.code); }, 30000, 2000) }; });
        var missing = found.filter(function (r) { return !r.sku; }).map(function (r) { return r.x.code; });
        if (missing.length === found.length) throw new Stop("등록된 상품이 없습니다");
        state.items = found.filter(function (r) { return r.sku; }).map(function (r) { return Object.assign({}, r.x, { skuId: r.sku.id }); });
        addFailed(missing);
        glog("상품 등록 확인: " + state.items.length + "건" + (missing.length ? " — 누락 " + missing.join(", ") : ""), "ok");
      },
      supply: async function () {
        var token = await ops();
        // 상품을 올리면 공급사 줄이 '상품 생성(ENROLLED)'으로 먼저 생긴다. 그 다음 상태(다시 실행한 경우)만 올리지 않는다
        var before = await mapLimit(state.items, async function (x) { var r = await ready(token, x); return { x: x, s: r && supplyCode(r) !== "ENROLLED" ? r : null }; });
        var todo = before.filter(function (r) { return !r.s; }).map(function (r) { return r.x; });
        if (todo.length) {
          glog("공급 정보 엑셀 업로드: " + todo.length + "건" + (before.length > todo.length ? " (이미 있는 " + (before.length - todo.length) + "건 제외)" : ""));
          var res = await api.opsUpload(token, "/v1/ops/sku-suppliers/excel-register-upload", sheetXlsx(SUPPLY_HEADERS, supplyRows(todo, cfg)), "1PL상품공급정보_일괄등록.xlsx");
          var sum = res.summary || {};
          glog("업로드 결과: 요청 " + sum.totalRequests + " / 성공 " + sum.successRequests + " / 실패 " + sum.failedRequests, sum.failedRequests ? "warn" : "info");
          (res.saveExcelFailures || []).slice(0, 10).forEach(function (f) { glog("실패: " + (f.skuCode || "") + " " + (f.errorMessage || f.message || JSON.stringify(f).slice(0, 150)), "sub"); });
        } else glog("공급 정보가 이미 모두 등록돼 있어 업로드를 건너뜀");
        var ok = await mapLimit(state.items, async function (x) { return (await until(function () { return ready(token, x, ["BEFORE_ESTIMATE", "ORDER"]); }, 30000, 2000)) ? x : null; });
        var good = ok.filter(Boolean), badList = state.items.filter(function (x) { return good.indexOf(x) < 0; }).map(function (x) { return x.code; });
        glog("공급 정보 확인(견적서 대기): " + good.length + "건" + (badList.length ? " — 안 됨 " + badList.join(", ") : ""), "ok");
        if (!good.length) throw new Stop("공급 정보가 등록된 상품이 없습니다");
        state.items = good; addFailed(badList);
      },
      activate: async function () {
        var token = await ops();
        var status = function () { return mapLimit(state.items, async function (x) { var k = await api.opsFindSku(token, x.code); return { x: Object.assign({}, x, { skuId: k ? k.id : x.skuId }), s: k && k.status }; }); };
        var uniq = function (st) { return Array.from(new Set(st.map(function (r) { return r.s; }))).join(", "); };
        var st = await status();
        glog("현재 상태: " + uniq(st));
        var pending = st.filter(function (r) { return r.s === "PENDING"; }).map(function (r) { return r.x.skuId; });
        if (pending.length) { await api.opsPut(token, "approve", pending); glog("상품 승인: " + pending.length + "건"); }
        st = (await until(async function () { var s = await status(); return s.every(function (r) { return r.s !== "PENDING"; }) ? s : null; }, 60000, 2000)) || (await status());
        var approved = st.filter(function (r) { return r.s === "APPROVED"; }).map(function (r) { return r.x.skuId; });
        if (approved.length) { await api.opsPut(token, "activate", approved); glog("상품 활성화: " + approved.length + "건"); }
        st = (await until(async function () { var s = await status(); return s.every(function (r) { return r.s === "ACTIVE"; }) ? s : null; }, 60000, 2000)) || (await status());
        var active = st.filter(function (r) { return r.s === "ACTIVE"; });
        glog("상품 상태 ACTIVE: " + active.length + "/" + st.length + "건", "ok");
        if (!active.length) throw new Stop("활성화된 상품이 없습니다: " + uniq(st));
        state.items = active.map(function (r) { return r.x; });
      },
      estimate: async function () {
        var sup = await api.supplierLogin(cfg.supplierLoginId, cfg.supplierPassword);
        glog("공급사 로그인: " + cfg.supplierLoginId);
        glog("파트너포털로 상품이 넘어오기를 기다립니다(최대 3분)");
        var goods = await mapLimit(state.items, async function (x) { return { x: x, g: await until(function () { return api.supplierGoods(sup.token, x.code); }, 180000, 5000) }; });
        var miss = goods.filter(function (r) { return !r.g; }).map(function (r) { return r.x.code; });
        if (miss.length) glog("3분 안에 파트너포털로 안 넘어온 상품은 빼고 진행: " + miss.join(", "), "warn");
        var lines = goods.filter(function (r) { return r.g; }).map(function (r) { return { goods: r.g, price: r.x.price || cfg.price }; });
        if (!lines.length) throw new Stop("파트너포털에 넘어온 상품이 없습니다");
        var est = await api.createEstimate(sup.token, sup.supplierId, state.proposalName, lines);
        state.estimateCode = est && est.estimateCode;
        if (!state.estimateCode) {
          var emp = await api.staffLogin(cfg.mdEmail);
          var hit = await until(async function () { return (await api.findEstimate(emp.token, "estimateName=" + encodeURIComponent(state.proposalName))).find(function (e) { return e.estimateName === state.proposalName; }); }, 30000, 2000);
          state.estimateCode = hit && hit.estimateCode;
        }
        if (!state.estimateCode) throw new Stop("등록한 견적서 코드를 찾지 못했습니다");
        glog("견적서 등록: " + state.estimateCode + " — " + lines.length + "건, MD 승인대기", "ok");
      },
      approve: async function () {
        var emp = await api.staffLogin(cfg.mdEmail);
        glog("담당 MD 로그인: " + cfg.mdEmail + (emp.name ? " (" + emp.name + ")" : ""));
        var find = async function () { return (await api.findEstimate(emp.token, "estimateCode=" + encodeURIComponent(state.estimateCode))).find(function (e) { return e.estimateCode === state.estimateCode; }); };
        var est = await until(find, 30000, 2000);
        if (!est) throw new Stop(cfg.mdEmail + " 계정으로 견적서 " + state.estimateCode + "를 찾지 못했습니다");
        if (est.approvalStatus !== "APPROVED") {
          if (est.approvalStatus !== "BEFORE_APPROVAL_MD") throw new Stop("견적 상태가 MD 승인대기가 아닙니다(" + est.approvalStatus + ")");
          await api.approveEstimate(emp.token, est.estimateId);
        }
        var after = await until(async function () { var e = await find(); return e && e.approvalStatus === "APPROVED" ? e : null; }, 30000, 2000);
        if (!after) throw new Stop("견적 상태가 '등록완료'로 바뀌지 않았습니다");
        glog("견적 승인: " + state.estimateCode + " → 등록완료", "ok");
      },
      verify: async function () {
        var token = await ops();
        var res = await mapLimit(state.items, async function (x) { return { x: x, ok: await until(function () { return ready(token, x, ["ORDER"]); }, 90000, 3000) }; });
        var badList = res.filter(function (r) { return !r.ok; }).map(function (r) { return r.x.code; });
        glog("컬리옵스 공급 상태 '발주 가능': " + (res.length - badList.length) + "/" + res.length + "건" + (badList.length ? " — 아님 " + badList.join(", ") : ""), badList.length ? "warn" : "ok");
        if (badList.length === res.length) throw new Stop("발주 가능으로 바뀐 상품이 없습니다");
      }
    };

    var failed = null;
    glog("대상: " + state.items.length + "건 (" + codes()[0] + (state.items.length > 1 ? " ~ " + codes()[state.items.length - 1] : "") + ")");
    try {
      // 시작 전 계정 확인
      await api.supplierLogin(cfg.supplierLoginId, cfg.supplierPassword);
      await api.staffLogin(cfg.mdEmail);
      if (STEPS.slice(from, to + 1).some(function (s) { return ["register", "supply", "activate", "verify"].indexOf(s[0]) >= 0; })) await ops();
    } catch (e) { failed = { step: "check", message: e.message }; glog("■ 중단: 계정 확인 — " + e.message, "err"); }
    for (var i = from; !failed && i <= to; i++) {
      var k = STEPS[i][0];
      if (stopRequested) { failed = { step: k, message: "중지했습니다" }; glog("■ 중지: " + STEP_NAME[k] + " 전에 멈췄습니다", "warn"); break; }
      if (resume && state.done.indexOf(k) >= 0) { glog(STEP_NAME[k] + " — 이미 완료"); continue; }
      glog("▶ " + STEP_NAME[k]); setStep(k, "active");
      try {
        await steps[k]();
        state.done = Array.from(new Set(state.done.concat([k]))); save(); setStep(k, "done");
      } catch (e) {
        failed = { step: k, message: e.message || String(e) };
        glog("■ 중단: " + STEP_NAME[k] + " — " + failed.message, "err"); setStep(k, "fail"); save();
      }
    }
    save();
    var n = state.items.length;
    var kv = [["결과", failed ? "중단 (" + STEP_NAME[failed.step] + ") — " + failed.message : "완료"],
      ["상품", n + "건 (" + (codes()[0] || "-") + (n > 1 ? " ~ " + codes()[n - 1] : "") + ")" + (state.failedItems.length ? " / 실패 " + state.failedItems.join(", ") : "")],
      ["공급사", cfg.supplierCode + " / 담당 MD " + cfg.mdName + " (" + cfg.mdEmail + ")"],
      ["견적서", state.estimateCode || "-"]];
    el("gdResultTitle").textContent = failed ? "중단됐습니다. 원인을 고친 뒤 [멈춘 단계부터 이어서]를 누르세요" : "완료: 컬리옵스 '발주 가능'까지 끝났습니다";
    el("gdResultKv").innerHTML = kv.map(function (x) { return "<dt>" + x[0] + "</dt><dd>" + esc(x[1]) + "</dd>"; }).join("");
    el("gdResult").className = "result-card " + (failed ? "err" : "ok");
    // 다음 시작 코드: 이번 목록의 마지막 다음 번호
    if (!failed && !manualRows) {
      var last = rows().slice(-1)[0], m = last && last.code.match(/^(.*?)(\d+)$/);
      if (m) { el("gdStart").value = m[1] + String(Number(m[2]) + 1).padStart(m[2].length, "0"); saveJson("goodsRegLastCode", last.code); renderGrid(); }
    }
    running = false; el("gdRunBtn").textContent = "실행"; el("gdStopBtn").disabled = true;
    el("gdLastState").textContent = "마지막 실행 " + (codes()[0] || "-") + " · " + state.done.length + "/6단계 완료";
    validate();
  }

  // ---------- 초기화 ----------
  function init() {
    el("gdFlow").innerHTML = STEPS.map(function (s, i) { return '<div class="flow-step" data-k="' + s[0] + '"><div class="dot">' + (i + 1) + "</div>" + s[1] + "</div>"; }).join('<div class="flow-arrow">›</div>');
    STEPS.forEach(function (s) { el("gdFrom").add(new Option(s[2], s[0])); el("gdTo").add(new Option(s[2], s[0])); });
    el("gdTo").value = "verify";
    ["orderDays", "deliveryDays"].forEach(function (key) {
      var box = el("gd-" + key);
      box.innerHTML = DAYS.split("").map(function (d) { return '<div class="chip sm" data-d="' + d + '">' + d + "요일</div>"; }).join("");
      box.addEventListener("click", function (e) { if (e.target.dataset.d) { e.target.classList.toggle("active"); validate(); } });
    });
    var f = loadJson(FORM_KEY) || {};
    Object.keys(f).forEach(function (id) { if (/^gd/.test(id) && el(id)) el(id).value = f[id]; });
    var setDays = function (key, v) { document.querySelectorAll("#gd-" + key + " .chip").forEach(function (b) { b.classList.toggle("active", v.indexOf(b.dataset.d) >= 0); }); };
    setDays("orderDays", f.orderDays || "월화수목금"); setDays("deliveryDays", f.deliveryDays || DAYS);
    // 시작 코드 기본값: 오늘 마지막으로 등록한 코드 다음 번호(없으면 QA<월일>BK0001)
    var last = loadJson("goodsRegLastCode"), mm = today();
    var m = last && last.indexOf("QA" + mm) === 0 && last.match(/^(.*?)(\d+)$/);
    el("gdStart").value = m ? m[1] + String(Number(m[2]) + 1).padStart(m[2].length, "0") : "QA" + mm + "BK0001";
    var st = loadJson(STATE_KEY);
    if (st && st.items) el("gdLastState").textContent = "마지막 실행 " + (st.items[0] ? st.items[0].code : "-") + " · " + st.done.length + "/6단계 완료";

    el("gdLookupBtn").addEventListener("click", doLookup);
    // 북마크릿: 컬리옵스 탭에서 access_token 을 클립보드로 복사
    el("gdBookmarklet").href = "javascript:(function(){var t=localStorage.getItem('access_token');try{t=JSON.parse(t)}catch(e){}if(!t){alert('컬리옵스에 로그인한 탭에서 눌러 주세요');return}var d=function(){var a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove();alert('컬리옵스 토큰을 복사했습니다. 상품 등록 탭에 붙여 넣으세요')};navigator.clipboard?navigator.clipboard.writeText(t).then(function(){alert('컬리옵스 토큰을 복사했습니다. 상품 등록 탭에 붙여 넣으세요')},d):d()})()";
    el("gdBookmarklet").addEventListener("click", function (e) { e.preventDefault(); alert("이 버튼은 북마크바로 끌어다 놓고, 컬리옵스 탭에서 누르세요"); });
    try { el("gdOpsToken").value = sessionStorage.getItem("goodsRegOpsToken") || ""; } catch (e) {}
    el("gdOpsToken").addEventListener("input", function () { try { sessionStorage.setItem("goodsRegOpsToken", cleanToken(el("gdOpsToken").value)); } catch (e) {} });
    el("gdMd").addEventListener("change", onMdChange);
    el("gdGridBody").addEventListener("change", function (e) {
      var k = e.target.dataset.k; if (!k) return;
      toManual();
      manualRows[+e.target.closest("tr").dataset.i][k] = k === "code" ? e.target.value.trim().toUpperCase() : e.target.value.trim();
      renderGrid(); validate();
    });
    el("gdGridBody").addEventListener("click", function (e) {
      if (e.target.dataset.del === undefined) return;
      toManual(); manualRows.splice(+e.target.dataset.del, 1); renderGrid(); validate();
    });
    el("gdGridAdd").addEventListener("click", function () { toManual(); manualRows.push({ code: "", name: "", tax: "", price: "" }); renderGrid(); validate(); });
    el("gdGridReset").addEventListener("click", function () { manualRows = null; renderGrid(); validate(); });
    // 엑셀 붙여 넣기: 붙인 칸(없으면 첫 칸)부터 오른쪽·아래로 채운다. 머리줄은 건너뛴다
    el("gdGridWrap").addEventListener("paste", function (e) {
      var text = (e.clipboardData || window.clipboardData).getData("text");
      if (!/[\t\n]/.test(text.trim()) && e.target.matches("input")) return; // 한 칸 값은 그 칸에만
      e.preventDefault();
      var lines = text.replace(/\r/g, "").split("\n").filter(function (l) { return l.trim(); }).map(function (l) { return l.split("\t").map(function (x) { return x.trim(); }); })
        .filter(function (c) { return !c.some(function (x) { return HEADER_WORDS.test(x); }); });
      var tr = e.target.closest && e.target.closest("tr[data-i]");
      var r0 = tr ? +tr.dataset.i : 0, c0 = e.target.dataset && e.target.dataset.c ? +e.target.dataset.c : 0;
      if (!tr) manualRows = []; else toManual();
      var keys = ["code", "name", "tax", "price"];
      lines.forEach(function (cells, j) {
        var row = manualRows[r0 + j] || (manualRows[r0 + j] = { code: "", name: "", tax: "", price: "" });
        cells.forEach(function (v, k) { var key = keys[c0 + k]; if (key) row[key] = key === "code" ? v.toUpperCase() : key === "price" ? v.replace(/[^\d]/g, "") : v; });
      });
      renderGrid(); validate();
    });
    ["gdCount", "gdStart", "gdPrefix"].forEach(function (id) { el(id).addEventListener("input", function () { if (!manualRows || id === "gdPrefix") renderGrid(); validate(); }); });
    ["gdTax", "gdPrice"].forEach(function (id) { el(id).addEventListener("input", renderGrid); el(id).addEventListener("change", renderGrid); });
    el("page-goods").addEventListener("input", validate);
    el("page-goods").addEventListener("change", validate);
    el("gdRunBtn").addEventListener("click", function () { run(false); });
    el("gdResumeBtn").addEventListener("click", function () { run(true); });
    el("gdStopBtn").addEventListener("click", function () { stopRequested = true; glog("중지 요청: 지금 기다리는 조회가 끝나면 멈춥니다", "warn"); });
    el("gdLogClear").addEventListener("click", function () { el("gdLog").innerHTML = ""; el("gdLogArea").style.display = "none"; });
    renderGrid(); validate();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
