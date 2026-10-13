# TraceNet: Defect & Bug Register
## Defect Tracking and Remediation Log

---

## Defect Summary Matrix

| Bug ID | Title | Severity | Affected Module | Root Cause Category | Status | Verification Test |
|---|---|---|---|---|---|---|
| **BUG-001** | Unhandled Empty / Malformed CSV Crashes Ingestion with 500 | High | Ingestion Service | Backend Defect | **Resolved / Verified** | `test_ingest_empty_csv`, `test_ingest_malformed_csv` |
| **BUG-002** | Transaction Status & Channel Lack Validation Enum Guard | Medium | Ingestion Service | Data-Quality Defect | **Resolved / Verified** | `test_ingest_rejects_invalid_status_and_channel`, `test_ingest_rejects_self_transfers` |
| **BUG-003** | Offset-Naive Datetime Comparison in `R07_DORMANT_SPIKE` | High | Risk Engine | Backend Defect | **Resolved / Verified** | `test_r07_handles_offset_naive_sqlite_datetime` |
| **BUG-004** | Unbounded Cycle Enumeration Risk in NetworkX Traversal | High | Graph Engine | Reliability / Security | **Resolved / Verified** | `test_graph_cycle_limit_on_dense_clique` |
| **BUG-005** | Missing API Endpoint `POST /api/v1/risk/assess` Contract | Medium | API Routing | API Contract Mismatch | **Resolved / Verified** | `test_api_risk_assess_endpoint` |
| **BUG-006** | Missing Alert Link/Unlink Capability on Active Cases | Medium | Case Service | Business-Logic Defect | **Resolved / Verified** | `test_case_alert_linking_and_unlinking` |
| **BUG-007** | Case Closure Permitted Without Required Resolution Rationale | Medium | Case Service | Compliance Defect | **Resolved / Verified** | `test_case_closure_requires_resolution_rationale` |
| **BUG-008** | Missing Ingestion Payload File Size Guard (10MB limit) | Medium | API Security | Security Defect | **Resolved / Verified** | `test_api_upload_file_size_limit` |

---

## Detailed Bug Reports & Resolution Notes

### BUG-001: Unhandled Empty / Malformed CSV Crashes Ingestion with 500
- **Severity**: High
- **Affected Module**: `src/backend/services/ingest_service.py` & `src/backend/main.py`
- **Preconditions**: Uploading an empty 0-byte file or unparseable binary file to `/api/v1/transactions/import`.
- **Reproduction Steps**:
  1. Send `POST /api/v1/transactions/import` with empty file content `b""`.
  2. Observe unhandled `pandas.errors.EmptyDataError` raised.
- **Expected Behaviour**: Return clean itemized `TransactionImportReport` or HTTP 400 Bad Request indicating file is empty or unparseable.
- **Actual Behaviour**: Unhandled exception bubbling up as HTTP 500 Internal Server Error.
- **Root Cause**: `pd.read_csv(io.BytesIO(file_content))` executed without defensive exception handling for `EmptyDataError`, `ParserError`, and unicode decode issues.
- **Resolution Applied**:
  - Wrapped `pd.read_csv` in a defensive try/except block capturing `EmptyDataError`, `ParserError`, and `Exception`.
  - Added early check for empty byte payload returning a structured zero-imported report with `errors=["Uploaded file is empty"]`.
- **Verification**: `tests/test_ingestion_comprehensive.py::test_ingest_empty_csv` and `test_ingest_malformed_csv` PASSED.
- **Status**: **Resolved / Verified**

---

### BUG-002: Transaction Status & Channel Lack Validation Enum Guard
- **Severity**: Medium
- **Affected Module**: `src/backend/services/ingest_service.py`
- **Preconditions**: CSV with arbitrary invalid statuses (e.g. `CORRUPTED`, `BLOCKED`) or self-transfers (`sender == receiver`).
- **Reproduction Steps**: Ingest CSV row with `status="CORRUPTED"`, `channel="WIRE_TRANSFER"`, or `sender_id == receiver_id`.
- **Expected Behaviour**: Reject invalid status/channel or normalize strictly to supported canonical sets (`COMPLETED`, `FAILED`, `PENDING`, `REVERSED`) and channels (`UPI`, `IMPS`, `NEFT`, `RTGS`, `CARD`, `ATM`), and reject self-transfers.
- **Actual Behaviour**: Stored arbitrary strings directly in the database without rejecting invalid status or self-transfers.
- **Root Cause**: Only `.strip().upper()` was applied without canonical enum membership checking or self-transfer guard.
- **Resolution Applied**:
  - Added strict canonical enum validation: `VALID_STATUSES = {"COMPLETED", "FAILED", "PENDING", "REVERSED"}` and `VALID_CHANNELS = {"UPI", "IMPS", "NEFT", "RTGS", "CARD", "ATM"}`.
  - Added self-transfer validation: `if sender_acc == receiver_acc: rejected.append(...)`.
  - Rows failing validation are appended to rejected list with detailed rejection reasons.
- **Verification**: `tests/test_ingestion_comprehensive.py::test_ingest_rejects_invalid_status_and_channel` and `test_ingest_rejects_self_transfers` PASSED.
- **Status**: **Resolved / Verified**

---

### BUG-003: Offset-Naive Datetime Comparison in `R07_DORMANT_SPIKE`
- **Severity**: High
- **Affected Module**: `src/backend/risk_engine.py`
- **Preconditions**: `last_txn` retrieved from SQLite database with timezone-naive timestamp while `txn_time` is timezone-aware UTC.
- **Reproduction Steps**: Execute rule evaluation when previous transaction has SQLite offset-naive datetime.
- **Expected Behaviour**: Datetimes normalized to comparable timezone-aware UTC timestamps.
- **Actual Behaviour**: Python raises `TypeError: can't compare offset-naive and offset-aware datetimes`.
- **Root Cause**: Direct subtraction `(txn_time - last_txn.timestamp)` without ensuring UTC normalization on `last_txn.timestamp`.
- **Resolution Applied**:
  - Implemented `ensure_utc(dt: datetime) -> datetime` helper in `risk_engine.py` (and `graph_engine.py`) that attaches `timezone.utc` if `dt.tzinfo is None`.
  - Normalized both `txn_time` and `last_txn.timestamp` with `ensure_utc()` before computing timedelta.
- **Verification**: `tests/test_graph_and_rules_stress.py::test_r07_handles_offset_naive_sqlite_datetime` PASSED.
- **Status**: **Resolved / Verified**

---

### BUG-004: Unbounded Cycle Enumeration Risk in NetworkX Traversal
- **Severity**: High
- **Affected Module**: `src/backend/graph_engine.py`
- **Preconditions**: Graph contains dense cycles or high-degree accounts (cliques).
- **Reproduction Steps**: Run `detect_subgraph_cycles` on highly connected subgraphs.
- **Expected Behaviour**: Bounded cycle collection capped at safe limit (e.g. 50 cycles) within bounded length without memory spikes or thread locking.
- **Actual Behaviour**: Called `list(nx.simple_cycles(simple_G))` which eagerly materializes all cycles, risking unbounded memory and CPU freezing on dense subgraphs.
- **Root Cause**: Using `list(...)` on the combinatorial generator instead of bounded iteration.
- **Resolution Applied**:
  - Implemented bounded generator traversal:
    ```python
    MAX_DETECTED_CYCLES = 50
    for cycle in nx.simple_cycles(simple_G):
        if 3 <= len(cycle) <= max_length:
            ...
            if len(cycles) >= MAX_DETECTED_CYCLES:
                break
    ```
  - Added explicit string casting `str(node)` for all node IDs in `CyclePath` to ensure strict Pydantic v2 validation.
- **Verification**: `tests/test_graph_and_rules_stress.py::test_graph_cycle_limit_on_dense_clique` PASSED (tested on complete $K_6$ clique).
- **Status**: **Resolved / Verified**

---

### BUG-005: Missing API Endpoint `POST /api/v1/risk/assess` Contract
- **Severity**: Medium
- **Affected Module**: `src/backend/main.py`
- **Preconditions**: Client calls `POST /api/v1/risk/assess` per `ARCHITECTURE.md` documentation.
- **Reproduction Steps**: Request `POST /api/v1/risk/assess`.
- **Expected Behaviour**: HTTP 200 with `RiskAssessmentRead` for provided transaction ID or payload.
- **Actual Behaviour**: HTTP 404 Not Found.
- **Root Cause**: Route was omitted during initial gateway router setup.
- **Resolution Applied**:
  - Added route `POST /api/v1/risk/assess` in `src/backend/main.py` taking `AssessRequest` (or transaction details), fetching or staging transaction, evaluating all 7 rules, and returning `RiskAssessmentRead`.
- **Verification**: `tests/test_graph_and_rules_stress.py::test_api_risk_assess_endpoint` PASSED.
- **Status**: **Resolved / Verified**

---

### BUG-006: Missing Alert Link/Unlink Capability on Active Cases
- **Severity**: Medium
- **Affected Module**: `src/backend/services/case_service.py` & `src/backend/schemas.py`
- **Preconditions**: An investigator wants to attach additional alerts to an existing case or unlink false alerts.
- **Reproduction Steps**: Call `PATCH /api/v1/cases/{case_id}` to attach alerts.
- **Expected Behaviour**: Case updates support `link_alert_ids` and `unlink_alert_ids`.
- **Actual Behaviour**: Only title, status, priority, and rationale could be updated.
- **Root Cause**: Missing parameter handling in `CaseUpdate` schema and `CaseService.update_case`.
- **Resolution Applied**:
  - Added `link_alert_ids: Optional[list[str]] = None` and `unlink_alert_ids: Optional[list[str]] = None` to `CaseUpdate` schema.
  - Implemented linking (associating `alert.case_id = case.id`) and unlinking (setting `alert.case_id = None`) in `CaseService.update_case` with automated audit logging.
- **Verification**: `tests/test_graph_and_rules_stress.py::test_case_alert_linking_and_unlinking` PASSED.
- **Status**: **Resolved / Verified**

---

### BUG-007: Case Closure Permitted Without Required Resolution Rationale
- **Severity**: Medium
- **Affected Module**: `src/backend/services/case_service.py`
- **Preconditions**: Transitioning case to `CLOSED_RESOLVED` or `CLOSED_FALSE_POSITIVE`.
- **Reproduction Steps**: Transition status to `CLOSED_RESOLVED` without providing `resolution_rationale`.
- **Expected Behaviour**: Require non-empty resolution rationale before closing a case for regulatory compliance and audit defensibility.
- **Actual Behaviour**: Case transitions to closed with empty or `None` rationale.
- **Root Cause**: Missing validation guard in `CaseService.update_case`.
- **Resolution Applied**:
  - Enforced validation check in `CaseService.update_case`:
    ```python
    if update_data.status in (CaseStatus.CLOSED_RESOLVED, CaseStatus.CLOSED_FALSE_POSITIVE):
        rationale = (update_data.resolution_rationale or case.resolution_rationale or "").strip()
        if not rationale:
            raise ValueError(f"Resolution rationale is required when transitioning case to {update_data.status.value}")
    ```
- **Verification**: `tests/test_graph_and_rules_stress.py::test_case_closure_requires_resolution_rationale` PASSED.
- **Status**: **Resolved / Verified**

---

### BUG-008: Missing Ingestion Payload File Size Guard
- **Severity**: Medium
- **Affected Module**: `src/backend/main.py`
- **Preconditions**: Uploading very large CSV file (> 10MB).
- **Reproduction Steps**: Attempt uploading file exceeding 10MB to `/api/v1/transactions/import`.
- **Expected Behaviour**: Reject with HTTP 413 Payload Too Large if size exceeds configured threshold.
- **Actual Behaviour**: Unbounded file read into memory via `await file.read()`.
- **Root Cause**: Absence of file size ceiling check in upload endpoint.
- **Resolution Applied**:
  - Added size check in `POST /api/v1/transactions/import`:
    ```python
    MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds maximum permitted limit of 10 MB"
        )
    ```
- **Verification**: `tests/test_ingestion_comprehensive.py::test_api_upload_file_size_limit` PASSED.
- **Status**: **Resolved / Verified**
