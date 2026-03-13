# SAIV Module Integration Guide

This guide explains how the 4 SAIV modules communicate and integrate with each other.

---

## Architecture Overview

```
                    ┌─────────────────────┐
                    │   Student Browser   │
                    └──────────┬──────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                    Module 1: Frontend                        │
│                    (Next.js PWA)                             │
│                    http://localhost:3000                     │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTP/REST
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    Module 2: Backend API                      │
│                    (FastAPI)                                  │
│                    http://localhost:8000                      │
├──────────────────────────┬───────────────────────────────────┤
│                          │ HTTP/REST                          │
│                          ▼                                    │
│  ┌───────────────────────────────────────────────────────┐   │
│  │              Module 3: Face Recognition                │   │
│  │              (FastAPI + MediaPipe)                     │   │
│  │              http://localhost:8001                     │   │
│  └───────────────────────────────────────────────────────┘   │
│                          │                                    │
└──────────────────────────┼───────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │PostgreSQL│    │  Redis   │    │Prometheus│
    │  :5434   │    │  :6380   │    │  :9090   │
    └──────────┘    └──────────┘    └──────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                 Module 4: Dashboard                           │
│                 (Streamlit)                                   │
│                 http://localhost:8501                         │
└──────────────────────────────────────────────────────────────┘
```

---

## Module 1: Frontend → Module 2: Backend

### Base URL
```
http://localhost:8000/api/v1
```

### Authentication Flow

1. **Registration**
```javascript
const response = await fetch('/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'student@example.com',
    password: 'securepass123',
    full_name: 'John Doe',
    role: 'student'
  })
});
```

2. **Login**
```javascript
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'student@example.com',
    password: 'securepass123'
  })
});
const { access_token, refresh_token } = await response.json();
// Store tokens securely (localStorage or secure cookie)
```

3. **Authenticated Requests**
```javascript
const response = await fetch('/api/v1/users/me', {
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  }
});
```

4. **Token Refresh**
```javascript
const response = await fetch('/api/v1/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refresh_token })
});
const { access_token: newToken } = await response.json();
```

### Check-in Flow

1. **Get Active Sessions**
```javascript
const sessions = await fetch('/api/v1/sessions/active', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());
```

2. **Capture User Data**
```javascript
// Camera (with user consent)
const stream = await navigator.mediaDevices.getUserMedia({ video: true });
const imageData = captureFrame(stream); // Your capture logic

// Geolocation (with user consent)
const position = await new Promise((resolve, reject) => {
  navigator.geolocation.getCurrentPosition(resolve, reject);
});

// Device fingerprint
const fingerprint = await generateDeviceFingerprint();
```

3. **Submit Check-in**
```javascript
const response = await fetch('/api/v1/checkins/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    session_id: selectedSession.id,
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    location_accuracy_meters: position.coords.accuracy,
    device_fingerprint: fingerprint,
    liveness_challenge_response: imageData // base64 encoded
  })
});
```

### Error Handling

```javascript
try {
  const response = await fetch('/api/v1/endpoint', options);

  if (response.status === 401) {
    // Token expired - try refresh
    await refreshToken();
    return retry(endpoint, options);
  }

  if (response.status === 429) {
    // Rate limited - show user message
    const retryAfter = response.headers.get('Retry-After');
    showRateLimitMessage(retryAfter);
    return;
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Request failed');
  }

  return response.json();
} catch (error) {
  // Network error or other failure
  handleError(error);
}
```

---

## Module 2: Backend → Module 3: Face Recognition

### Internal Service Call

The Backend API calls the Face Recognition service internally (no authentication required between services).

```python
import httpx
from typing import Optional

FACE_SERVICE_URL = os.getenv("FACE_SERVICE_URL", "http://localhost:8001")

async def check_liveness(image_base64: str, challenge_type: str = "blink") -> dict:
    """Call face recognition service for liveness check."""
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            response = await client.post(
                f"{FACE_SERVICE_URL}/liveness/check",
                json={
                    "challenge_response": image_base64,
                    "challenge_type": challenge_type
                }
            )
            response.raise_for_status()
            return response.json()
        except httpx.TimeoutException:
            # Service timeout - proceed without liveness
            return {"liveness_passed": None, "liveness_score": 0.0}
        except httpx.HTTPError as e:
            # Log error and proceed without liveness
            logger.warning(f"Face service error: {e}")
            return {"liveness_passed": None, "liveness_score": 0.0}
```

### Integration in Check-in Endpoint

```python
@router.post("/checkins/")
async def create_checkin(
    checkin_data: CheckinCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validate session and enrollment
    session = get_session(db, checkin_data.session_id)
    if not session or session.status != "active":
        raise HTTPException(400, "Invalid or inactive session")

    # 2. Check for duplicate check-in
    existing = get_checkin(db, session.id, current_user.id)
    if existing:
        raise HTTPException(400, "Already checked in")

    # 3. Call face recognition if image provided
    liveness_result = {"liveness_passed": None, "liveness_score": 0.0}
    if checkin_data.liveness_challenge_response:
        liveness_result = await check_liveness(
            checkin_data.liveness_challenge_response
        )

    # 4. Calculate geofence distance
    distance = calculate_haversine_distance(
        checkin_data.latitude, checkin_data.longitude,
        session.venue_latitude, session.venue_longitude
    )

    # 5. Compute risk score
    risk_score = compute_risk_score(
        liveness_score=liveness_result.get("liveness_score", 0.0),
        distance_meters=distance,
        device_trusted=device.is_trusted if device else False
    )

    # 6. Determine status based on risk
    status = "approved" if risk_score < session.risk_threshold else "flagged"

    # 7. Create check-in record
    checkin = create_checkin_record(db, checkin_data, current_user, status, risk_score)

    # 8. Create audit log
    create_audit_log(db, "checkin_attempted", current_user.id, checkin.id)

    return checkin
```

---

## Module 4: Dashboard → Module 2: Backend

### Authentication

Dashboard uses the same JWT authentication as the frontend:

```python
import streamlit as st
import requests

API_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

def login(email: str, password: str) -> Optional[str]:
    """Login and return access token."""
    response = requests.post(
        f"{API_URL}/api/v1/auth/login",
        json={"email": email, "password": password}
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    return None

def get_auth_headers(token: str) -> dict:
    """Get authorization headers."""
    return {"Authorization": f"Bearer {token}"}
```

### Fetching Data

```python
def get_sessions(token: str) -> list:
    """Get all sessions (instructor view)."""
    response = requests.get(
        f"{API_URL}/api/v1/sessions/",
        headers=get_auth_headers(token)
    )
    return response.json() if response.ok else []

def get_session_checkins(token: str, session_id: str) -> list:
    """Get check-ins for a session."""
    response = requests.get(
        f"{API_URL}/api/v1/checkins/session/{session_id}",
        headers=get_auth_headers(token)
    )
    return response.json() if response.ok else []
```

---

## Module 4: Dashboard → Prometheus

### Metrics Queries

```python
import requests

PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://localhost:9090")

def query_prometheus(query: str) -> dict:
    """Execute PromQL query."""
    response = requests.get(
        f"{PROMETHEUS_URL}/api/v1/query",
        params={"query": query}
    )
    return response.json() if response.ok else {}

def get_request_latency_p95() -> float:
    """Get p95 request latency in milliseconds."""
    result = query_prometheus(
        'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))'
    )
    try:
        return float(result["data"]["result"][0]["value"][1]) * 1000
    except (KeyError, IndexError):
        return 0.0

def get_checkin_success_rate() -> float:
    """Get check-in success rate percentage."""
    result = query_prometheus(
        'sum(rate(checkin_success_total[5m])) / sum(rate(checkin_attempts_total[5m])) * 100'
    )
    try:
        return float(result["data"]["result"][0]["value"][1])
    except (KeyError, IndexError):
        return 0.0
```

---

## Database Access Patterns

### From Backend (ORM)

```python
from sqlalchemy.orm import Session
from app.models import User, CheckIn, Course

def get_user_checkins(db: Session, user_id: str) -> list:
    """Get all check-ins for a user."""
    return db.query(CheckIn).filter(
        CheckIn.student_id == user_id
    ).order_by(CheckIn.checked_in_at.desc()).all()

def get_session_attendance(db: Session, session_id: str) -> dict:
    """Get attendance summary for a session."""
    checkins = db.query(CheckIn).filter(
        CheckIn.session_id == session_id
    ).all()
    return {
        "total": len(checkins),
        "approved": len([c for c in checkins if c.status == "approved"]),
        "flagged": len([c for c in checkins if c.status == "flagged"]),
        "rejected": len([c for c in checkins if c.status == "rejected"])
    }
```

### From Dashboard (Direct DB - Read Only)

```python
from sqlalchemy import create_engine
import pandas as pd

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def get_attendance_dataframe(session_id: str) -> pd.DataFrame:
    """Get attendance data as DataFrame for export."""
    query = """
    SELECT
        u.email, u.full_name,
        c.checked_in_at, c.status, c.risk_score,
        c.latitude, c.longitude
    FROM checkins c
    JOIN users u ON c.student_id = u.id
    WHERE c.session_id = %s
    ORDER BY c.checked_in_at
    """
    return pd.read_sql(query, engine, params=(session_id,))
```

---

## Service Communication Summary

| Source | Destination | Protocol | Auth | Timeout |
|--------|-------------|----------|------|---------|
| Frontend | Backend | HTTP/REST | JWT Bearer | 30s |
| Backend | Face Service | HTTP/REST | None (internal) | 5s |
| Backend | PostgreSQL | TCP | Connection string | 10s |
| Backend | Redis | TCP | Connection string | 2s |
| Dashboard | Backend | HTTP/REST | JWT Bearer | 30s |
| Dashboard | PostgreSQL | TCP | Connection string | 10s |
| Dashboard | Prometheus | HTTP | None | 5s |

---

## Environment Variables Summary

### Backend (Module 2)
```bash
DATABASE_URL=postgresql://user:pass@localhost:5434/saiv
REDIS_URL=redis://localhost:6380/0
SECRET_KEY=your-secret-key-here
FACE_SERVICE_URL=http://localhost:8001
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### Frontend (Module 1)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_FACE_SERVICE_URL=http://localhost:8001
```

### Dashboard (Module 4)
```bash
DATABASE_URL=postgresql://user:pass@localhost:5434/saiv
BACKEND_URL=http://localhost:8000
PROMETHEUS_URL=http://localhost:9090
```

### Face Recognition (Module 3)
```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

---

## Health Checks

All services should expose `/health` endpoints:

```python
# Backend/Face Service
@app.get("/health")
def health():
    return {"status": "healthy", "service": "backend"}

# Check all services
async def check_all_services():
    services = {
        "backend": "http://localhost:8000/health",
        "face": "http://localhost:8001/health",
        "frontend": "http://localhost:3000",
        "dashboard": "http://localhost:8501"
    }
    results = {}
    async with httpx.AsyncClient(timeout=5.0) as client:
        for name, url in services.items():
            try:
                r = await client.get(url)
                results[name] = "healthy" if r.status_code == 200 else "unhealthy"
            except:
                results[name] = "unreachable"
    return results
```
