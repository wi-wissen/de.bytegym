# eGym API Reference

This document describes all API endpoints used by the eGym Data Exporter, including request parameters and response schemas. It is intended as a reference for programmatic use.

## Base URLs

| Constant | URL | Purpose |
|---|---|---|
| `NP_GATEWAY` | `https://one.netpulse.com` | Studio resolution, login, brand API |
| `MOBILE_API` | `https://mobile-api.int.api.egym.com` | Measurements, analysis, workouts |

## Required Headers

All requests must include the following headers:

```
x-np-user-agent:  clientType=MOBILE_DEVICE; devicePlatform=ANDROID; deviceUid=; applicationName=EGYM Fitness; applicationVersion=3.24; applicationVersionCode=930; containerName=NetpulseFitness
user-agent:       okhttp/4.12.0
x-np-app-version: 3.24
x-np-api-version: 1.5
Accept:           application/json
```

Authenticated endpoints additionally require a `Cookie` header with the session cookies obtained from the login response.

---

## Authentication

### Guest Login

Authenticates as an anonymous guest user — no account or password required. Grants access to public studio data and the gym feed.

```
POST {brand_api_url}/np/exerciser/loginAsGuest
Content-Length: 0
```

No request body required.

**Response body:**
```json
{
  "uuid": "string (uuid)",              // guest user_id — usable in some endpoints
  "firstName": "Guest",
  "lastName": "User",
  "verified": true,
  "emailVerified": true,
  "homeClubUuid": "string (uuid)",
  "homeClubName": "string",
  "chainUuid": "string (uuid)",
  "chainName": "string",
  "timezone": "string",
  "timezoneOffset": "integer",
  "profileCompleted": false,
  "membershipType": null,
  "barcode": null,
  "email": null,
  "measurementUnit": "string",          // e.g. "M" (metric)
  "guestPassUser": false,
  "egymAccountId": null,
  "externalAuthToken": null,
  "externalRefreshToken": null,
  "newUserSecret": null,
  "customInfo": null,
  "hasMessages": null
}
```

Session cookie (`JSESSIONID`) is returned via `Set-Cookie` and is valid for **3 hours**. After expiry, a new `loginAsGuest` call is required.

#### Endpoints available as guest

| Endpoint | Notes |
|---|---|
| `GET /feed/api/v1.0/gym-locations/{gymId}/feed` | Full gym feed with workout details |
| `GET /feed/api/v1.0/gym-locations/{gymId}/feed/brief` | Simplified feed (see note below) |
| `GET /feed/api/v1.0/gym-locations/{gymId}/optimal-feed-range` | Returns `{"days": 1}` |
| `GET {brand_api_url}/np/company/children?responseType=detail` | Studio info, address, hours |
| `GET {brand_api_url}/np/brand/description` | Brand config, features |
| `GET /measurements/api/v1.0/exercisers/{guestUuid}/exercises` | Full exercise catalogue (not studio-specific) |

#### Endpoints NOT available as guest

| Endpoint | Result |
|---|---|
| Course schedules (`/schedule`, `/classes`) | HTTP 500 |
| Single location by UUID via brand API | HTTP 404 |
| Active challenges | HTTP 404 |
| User-specific data (bio age, strength, body metrics) | Requires real account |
| Ranking | Returns all `null` values |

#### Feed limit behaviour

The `/feed` endpoint has a hard cap of **506 items** regardless of the requested date range. Beyond ~30 days of studio activity, `startDate` is effectively ignored.

| Date range | Items returned |
|---|---|
| 7 days | ~131 |
| 14 days | ~244 |
| 30 days | ~506 (cap reached) |
| 60–365 days | 506 (identical result) |

> **Recommendation for widgets:** Use the full `/feed` endpoint (not `/feed/brief`). A 7–14 day window is sufficient for current activity. The `size` parameter on `/feed/brief` is ignored by the API — it always returns the same small set of recent entries regardless of the value passed.

---

### Logout

Invalidates the current session. The server responds with an empty body and clears the `JSESSIONID` cookie by setting it to an expired date.

```
POST {brand_api_url}/np/logout
Content-Length: 0
```

No request body required. The session cookie must be present in the request.

**Response:**
- Status: `200 OK`
- Body: empty
- `Set-Cookie: JSESSIONID=; Max-Age=0; Expires=Thu, 1 Jan 1970 00:00:00 GMT` (session invalidated)
- `x-csrf-token`: a new CSRF token is returned in the response headers (can be ignored after logout)

---

### Resolve Studio

```
GET {NP_GATEWAY}/np/nfa/resolveContainer?keyword={studio_keyword}&containerAppVersion={app_version}
```

**Response** — saved as `studio_resolve_container.json`:
```json
{
  "brandIdentifier": "string",
  "resourceType": "string"   // e.g. "prod"
}
```

---

### Fetch NFA Config

```
GET {NP_GATEWAY}/np/nfa/config?brandIdentifier={brandIdentifier}&resourceType={resourceType}
```

**Response** — saved as `studio_nfa_config.json`. Contains a `resources` array with URLs keyed by `key` (e.g. `res/values/config.xml`, `res/values/colors.xml`).

---

### Fetch Brand Description

```
GET {brand_api_url}/np/brand/description?appVersion={app_version}
```

**Response** — saved as `studio_brand_description.json`:
```json
{
  "chainAlias": "string",
  "productBundle": "string",
  "locale": "string",
  "uuid": "string (uuid)",
  "feedbackEmail": "string (email)",
  "supportEmail": "string (email)",
  "defaultMeasurementUnit": "string",
  "flow": "string",
  "passwordPolicy": {
    "minimumPasswordLength": "integer",
    "maximumPasswordLength": "integer",
    "requireUppercase": "boolean",
    "requireLowercase": "boolean",
    "requireNumber": "boolean",
    "requireSpecialChar": "boolean",
    "allowedSpecialChars": "string"
  },
  "features": {
    "[featureName]": "boolean"
    // e.g. egym, challenges, fitnessAssessment, appleHealth, healthConnect, ...
  },
  "featurePreferences": { ... }
}
```

---

### Login

```
POST {brand_api_url}/np/exerciser/login
Content-Type: application/x-www-form-urlencoded

username={username}&password={password}&relogin=false
```

**Response body**:
```json
{
  "uuid": "string (uuid)"   // user_id for all subsequent requests
}
```

Session cookies are returned in the `Set-Cookie` response header and must be passed in all authenticated requests.

---

## Analysis Endpoints

All analysis endpoints are authenticated and use the base path:
`{MOBILE_API}/analysis/api/v1.0/exercisers/{user_id}/`

---

### Activity Level

```
GET .../activitylevels
```

**Response** — `activity_level.json`:
```json
{
  "points": "integer",
  "daysLeft": "integer",
  "level": "string",          // e.g. "silver"
  "goal": "integer",
  "maintainPoints": "integer"
}
```

---

### Activity Level Definitions

```
GET .../activitylevels/definitions
```

**Response** — `activity_level_definitions.json`:
```json
{
  "definitions": [
    {
      "level": "integer",
      "levelType": "string",
      "minPoints": "integer",
      "maxPoints": "integer"
    }
  ]
}
```

---

### Bio Age (Current)

```
GET .../bioage
```

**Response** — `bio_age.json`:
```json
{
  "totalDetails": {
    "totalBioAge": {
      "value": "integer",
      "progress": "string",        // "up" | "down" | null
      "percentageDiff": "number",
      "amountDiff": "integer",
      "createdAt": "string (ISO datetime)",
      "timezone": "string"
    },
    "quote": { "text": "string", "id": "string" }
  },
  "muscleDetails": {
    "upperBodyAge":  { /* same as totalBioAge + "musclesState": "IMBALANCED"|"NONE" */ },
    "coreAge":       { /* same */ },
    "lowerBodyAge":  { /* same */ },
    "muscleBioAge":  { /* same as totalBioAge */ },
    "quote": { "text": "string", "id": "string" }
  },
  "metabolicDetails": {
    "metabolicAge": { /* same as totalBioAge */ },
    "bodyFat":      { "value": "number", "progress": null, "percentageDiff": null, "amountDiff": null, "createdAt": "string (ISO datetime)", "timezone": "string" },
    "bmi":          { /* same as bodyFat */ },
    "waistToHipRatio": { /* same as bodyFat */ },
    "quote": { "text": "string", "id": "string" }
  },
  "cardioDetails": {
    "cardioAge":        { /* same as totalBioAge */ },
    "restingHeartRate": { /* same as bodyFat */ },
    "systolicPressure": { /* same as bodyFat */ },
    "diastolicPressure":{ /* same as bodyFat */ },
    "vo2max": null,
    "quote": { "text": "string", "id": "string" }
  },
  "flexibilityDetails": null
}
```

---

### Bio Age Latest Metrics

```
GET .../bioage/latest-metrics
```

**Response** — `bioage_latest_metrics.json`:
```json
[
  {
    "type": "string",    // "TOTAL" | "MUSCLE" | "METABOLIC" | "CARDIO" | "FLEXIBILITY"
    "value": "integer",
    "createdAt": "string (ISO datetime)"
  }
]
```

---

### Bio Age Summary

```
GET .../bioage/summary/monthly?startDate={ISO datetime}&endDate={ISO datetime}
GET .../bioage/summary/yearly?startDate={ISO datetime}&endDate={ISO datetime}
```

**Response** — `bioage_summary_monthly.json` / `bioage_summary_yearly.json`:
```json
{
  "rangeStart": "string (date)",
  "rangeEnd": "string (date)",
  "current": {
    "totalBioAge":    { "value": "integer", "progress": "string", "percentageDiff": "number", "amountDiff": "integer", "createdAt": "string (ISO datetime)", "timezone": "string" },
    "muscleBioAge":   { /* same */ },
    "metabolicBioAge":{ /* same */ },
    "cardioBioAge":   { /* same */ },
    "flexibilityBioAge": null
  },
  "totalBioAge":     [ { "date": "string (date)", "value": "integer" } ],
  "muscleBioAge":    [ { "date": "string (date)", "value": "integer" } ],
  "metabolicBioAge": [ { "date": "string (date)", "value": "integer" } ],
  "cardioBioAge":    [ { "date": "string (date)", "value": "integer" } ],
  "flexibilityBioAge": []
}
```

---

### Bio Age History

```
GET .../bioage/history
  ?startDate={YYYY-MM-DD}
  &endDate={YYYY-MM-DD}
  &types=TOTAL&types=MUSCLE&types=METABOLIC&types=CARDIO&types=FLEXIBILITY
  &granularity={ONE_ITEM_PER_DAY|ONE_ITEM_PER_MONTH}
  &timezone=Europe/Berlin
```

**Response** — `bioage_history_day.json` / `bioage_history_month.json`:
```json
[
  {
    "type": "string",   // "TOTAL" | "MUSCLE" | "METABOLIC" | "CARDIO" | "FLEXIBILITY"
    "history": [
      { "value": "integer", "date": "string (date)" }
    ]
  }
]
```

---

### Muscle Imbalances

```
GET .../muscleimbalances
```

**Response** — `muscle_imbalances.json`:
```json
{
  "muscleImbalances": [
    {
      "calculatedAt": "string (ISO datetime)",
      "timezone": "string",
      "agonistMuscle": "string",
      "antagonistMuscle": "string",
      "position": "number",
      "optimalRangeStartPosition": "number",
      "optimalRangeEndPosition": "number",
      "rangeSize": "number",
      "bodyRegion": "string",   // "UPPER" | "CORE" | "LOWER"
      "agonistStrengthValue": "integer",
      "antagonistStrengthValue": "integer",
      "agonistExerciseCode": "string",
      "antagonistExerciseCode": "string",
      "agonistRatio": "integer",
      "antagonistRatio": "integer"
    }
  ]
}
```

---

### Ranking

```
GET .../ranking
```

**Response** — `ranking.json`:
```json
{
  "exerciserId": "string (uuid)",
  "exerciserName": "string",
  "exerciserIconUrl": "string",
  "rank": {
    "value": "integer",
    "progress": "string",
    "percentageDiff": "number",
    "amountDiff": "integer"
  },
  "points": { /* same as rank */ },
  "averageRank": "integer",
  "quote": "string",
  "totalNumberOfUsers": "integer"
}
```

---

## Measurement Endpoints

All measurement endpoints are authenticated and use the base path:
`{MOBILE_API}/measurements/api/`

---

### Body — Latest Metrics

```
GET v1.1/exercisers/{user_id}/body/latest-metrics
```

**Response** — `body_latest_metrics.json`:
```json
[
  {
    "type": "string",   // "WEIGHT_KG" | "BMI" | "BODY_FAT_PERCENTS" | "WAIST_CM" | "HIP_CM" | "HEIGHT_CM" | "WAIST_TO_HIP_RATIO"
    "value": "number",
    "createdAt": "string (ISO datetime)",
    "source": "string",        // e.g. "trainer_app" | "manual"
    "sourceLabel": "string",
    "valueInterpretation": "string"
  }
]
```

---

### Body — Measurements Log

```
GET v1.0/exercisers/{user_id}/body-measurements
  ?startDate={YYYY-MM-DD}&endDate={YYYY-MM-DD}
```

**Response** — `body_measurements.json`:
```json
{
  "measurements": [
    {
      "createdAt": "string (ISO datetime)",
      "timezone": "string",
      "source": "string",
      "sourceLabel": "string",
      "metrics": [
        { "type": "string", "value": "number" }
      ]
    }
  ]
}
```

---

### Body — Summary

```
GET v1.0/exercisers/{user_id}/body/summary/monthly?startDate={ISO datetime}&endDate={ISO datetime}
GET v1.0/exercisers/{user_id}/body/summary/yearly?startDate={ISO datetime}&endDate={ISO datetime}
```

**Response** — `body_summary_monthly.json` / `body_summary_yearly.json`:
```json
{
  "rangeStart": "string (date)",
  "rangeEnd": "string (date)",
  "bmiSummary": {
    "current": { "timezone": "string", "bmi": { "value": "number", "progress": null, "percentageDiff": null, "amountDiff": null, "createdAt": "string (ISO datetime)", "timezone": "string" } },
    "bmi": [ { "value": "number", "date": "string (date)" } ]
  },
  "bodyFatSummary":      { "current": { "timezone": "string", "bodyFat": { /* same */ } }, "bodyFat": [ { "value": "number", "date": "string (date)" } ] },
  "circumferenceSummary":{ "current": { "timezone": "string", "circumference": { /* same */ } }, "circumference": [ { "value": "number", "date": "string (date)" } ] },
  "weightSummary":       { "current": { "timezone": "string", "weight": { /* same */ } }, "weight": [ { "value": "number", "date": "string (date)" } ] }
}
```

---

### Body — History

```
GET v1.0/exercisers/{user_id}/body/history
  ?startDate={YYYY-MM-DD}
  &endDate={YYYY-MM-DD}
  &types=WEIGHT_KG&types=BMI&types=BODY_FAT_PERCENTS&types=WAIST_CM&types=HIP_CM&types=HEIGHT_CM&types=WAIST_TO_HIP_RATIO
  &granularity={ONE_ITEM_PER_DAY|ONE_ITEM_PER_MONTH}
  &timezone=Europe/Berlin
```

**Response** — `body_history_day.json` / `body_history_month.json`:
```json
[
  {
    "type": "string",
    "history": [ { "value": "number", "date": "string (date)" } ]
  }
]
```

---

### Strength — Latest

```
GET v1.0/exercisers/{user_id}/strength/latest
GET v1.1/exercisers/{user_id}/strength/latest-metrics
GET v1.0/exercisers/{user_id}/strength/latest-with-status
```

**Response** — `strength_latest.json`:
```json
{
  "strengthMeasurements": [
    {
      "createdAt": "string (ISO datetime)",
      "timezone": "string",
      "exercise": {
        "code": "string",
        "label": "string",
        "availableForManualTest": "boolean"
      },
      "strength": {
        "value": "integer",
        "progress": "string",
        "percentageDiff": "number",
        "amountDiff": "integer",
        "createdAt": "string (ISO datetime)",
        "timezone": "string"
      },
      "source": "string",        // e.g. "fitness_machine"
      "bodyRegion": "string",    // "UPPER" | "CORE" | "LOWER"
      "sourceLabel": "string"
    }
  ]
}
```

**Response** — `strength_latest_metrics.json`:
```json
[
  {
    "type": "integer",           // exercise type code, e.g. 1000, 1005
    "value": "integer",
    "exerciseLabel": "string",
    "createdAt": "string (ISO datetime)",
    "source": "string",
    "sourceLabel": "string",
    "valueInterpretation": "string"
  }
]
```

**Response** — `strength_latest_with_status.json`:
```json
{
  "status": "string",            // e.g. "ACTIVE"
  "strengthMeasurement": {
    "createdAt": "string (ISO datetime)",
    "timezone": "string",
    "exercise": null,
    "strength": { "value": "integer", "progress": null, "percentageDiff": null, "amountDiff": null, "createdAt": "string (ISO datetime)", "timezone": "string" },
    "source": "string",
    "bodyRegion": "string",
    "sourceLabel": "string"
  }
}
```

---

### Strength — Log

```
GET v1.0/exercisers/{user_id}/strength
  ?startDate={YYYY-MM-DD}&endDate={YYYY-MM-DD}
```

**Response** — `strength_log.json`:
```json
{
  "strengthMeasurements": [
    {
      "createdAt": "string (ISO datetime)",
      "timezone": "string",
      "exercise": { "code": "string", "label": "string", "availableForManualTest": "boolean" },
      "strength": { "value": "integer", "progress": null, "percentageDiff": null, "amountDiff": null, "createdAt": "string (ISO datetime)", "timezone": "string" },
      "source": "string",
      "bodyRegion": "string",
      "sourceLabel": "string"
    }
  ]
}
```

---

### Strength — Summary

```
GET v1.0/exercisers/{user_id}/strength/summary/monthly?startDate={ISO datetime}&endDate={ISO datetime}
GET v1.0/exercisers/{user_id}/strength/summary/yearly?startDate={ISO datetime}&endDate={ISO datetime}
```

**Response** — `probe_strength_summary_monthly.json` / `probe_strength_summary_yearly.json`:
```json
{
  "rangeStart": "string (date)",
  "rangeEnd": "string (date)",
  "current": {
    "timezone": "string",
    "strength": { "value": "integer", "progress": "string", "percentageDiff": "number", "amountDiff": "integer", "createdAt": "string (ISO datetime)", "timezone": "string" }
  },
  "strength": [ { "value": "integer", "date": "string (date)" } ]
}
```

---

### Strength — History

```
GET v1.0/exercisers/{user_id}/strength/history
  ?startDate={YYYY-MM-DD}
  &endDate={YYYY-MM-DD}
  &types={type1}&types={type2}...    // exercise type codes from strength_latest_metrics
  &granularity={ONE_ITEM_PER_DAY|ONE_ITEM_PER_MONTH}
  &timezone=Europe/Berlin
```

**Response** — `strength_history_day.json` / `strength_history_month.json`:
```json
[
  {
    "type": "integer",           // exercise type code
    "history": [ { "value": "integer", "date": "string (date)" } ]
  }
]
```

---

### Cardio — Log

```
GET v1.0/exercisers/{user_id}/cardio
  ?startDate={YYYY-MM-DD}&endDate={YYYY-MM-DD}
```

**Response** — `cardio_log.json`:
```json
{
  "measurements": [
    {
      "createdAt": "string (ISO datetime)",
      "timezone": "string",
      "source": "string",
      "sourceLabel": "string",
      "metrics": [
        { "type": "string", "value": "number" }
        // types: "SYSTOLIC_PRESSURE", "DIASTOLIC_PRESSURE", "RESTING_HEART_RATE"
      ]
    }
  ]
}
```

---

### Cardio — Summary

```
GET v1.0/exercisers/{user_id}/cardio/summary/monthly?startDate={ISO datetime}&endDate={ISO datetime}
GET v1.0/exercisers/{user_id}/cardio/summary/yearly?startDate={ISO datetime}&endDate={ISO datetime}
```

**Response** — `cardio_summary_monthly.json` / `cardio_summary_yearly.json`:
```json
{
  "rangeStart": "string (date)",
  "rangeEnd": "string (date)",
  "restingHeartRateSummary": {
    "current": { "timezone": "string", "bpm": { "value": "integer", "progress": null, "percentageDiff": null, "amountDiff": null, "createdAt": "string (ISO datetime)", "timezone": "string" } },
    "bpm": [ { "value": "integer", "date": "string (date)" } ]
  },
  "systolicSummary":  { "current": { "timezone": "string", "systolic":  { /* same as bpm */ } }, "systolic":  [ { "value": "integer", "date": "string (date)" } ] },
  "diastolicSummary": { "current": { "timezone": "string", "diastolic": { /* same as bpm */ } }, "diastolic": [ { "value": "integer", "date": "string (date)" } ] },
  "vo2MaxSummary": { "current": null, "vo2Max": [] }
}
```

---

### Flexibility

```
GET v1.0/exercisers/{user_id}/flexibility/latest
GET v1.1/exercisers/{user_id}/flexibility/latest-metrics
```

**Response** — `flexibility_latest.json` / `flexibility_latest_metrics.json`:
```json
[]   // empty if no flexibility measurements recorded
```

---

### Exercises List

```
GET v1.0/exercisers/{user_id}/exercises
```

**Response** — `exercises_list.json`:
```json
{
  "exercises": [
    {
      "code": "string",
      "label": "string",
      "description": "string",
      "bodyRegion": "string",       // "UPPER" | "CORE" | "LOWER"
      "recommended": "boolean",
      "availableForManualTest": "boolean",
      "attributes": [
        {
          "code": "string",         // e.g. "reps", "weight", "duration"
          "configuration": {
            "type": "string",
            "min": "integer",
            "max": "integer"
          }
        }
      ]
    }
  ]
}
```

---

## Feed Endpoints

All feed endpoints are authenticated and use the base path:
`{MOBILE_API}/feed/api/v1.0/`

The `gymLocationId` is the UUID of the user's home gym — use `homeClubUuid` from `user_profile.json`.

---

### Gym Feed — Brief (latest N workouts across all members)

```
GET .../gym-locations/{gymLocationId}/feed/brief?size={n}&locale={locale}
```

| Parameter | Type | Description |
|---|---|---|
| `size` | integer | Number of items to return |
| `locale` | string | e.g. `de-DE`, `en-US` |

**Response**:
```json
{
  "items": [
    {
      "id": "string (uuid)",
      "userId": "string (uuid)",
      "userIdType": "NETPULSE",
      "gymLocationId": "string (uuid)",
      "title": "string",
      "imageUrl": "string | null",
      "createdAt": "string (ISO datetime)",
      "updatedAt": "string (ISO datetime)",
      "payload": { "type": "WORKOUT" },
      "user": {
        "userId": "string (uuid)",
        "userIdType": "NETPULSE",
        "firstName": "string",
        "lastName": "string",          // abbreviated, e.g. "P."
        "imageUrl": "string",
        "profilePublic": "boolean"
      }
    }
  ]
}
```

> **Note:** The brief endpoint omits `numberOfLikes`, `numberOfComments`, `liked`, `commented`, and exercise details from the payload.

---

### Gym Feed — Full (date-range, one item per user per day)

```
GET .../gym-locations/{gymLocationId}/feed?startDate={YYYY-MM-DD}&endDate={YYYY-MM-DD}&locale={locale}
```

**Response** — items are grouped with a per-day count:
```json
{
  "items": [
    {
      "item": {
        "id": "string (uuid)",
        "userId": "string (uuid)",
        "userIdType": "NETPULSE",
        "gymLocationId": "string (uuid)",
        "title": "string",
        "imageUrl": "string | null",
        "createdAt": "string (ISO datetime)",
        "updatedAt": "string (ISO datetime)",
        "payload": {
          "type": "WORKOUT",
          "exercises": [
            {
              "id": "string",
              "activityId": "string",        // numeric exercise/activity code
              "duration": "integer",          // milliseconds
              "points": "integer",
              "calories": "integer",
              "distance": "integer",          // meters, only present for cardio activities
              "dataSource": "string"          // see Data Sources below
            }
          ]
        },
        "numberOfLikes": "integer",
        "numberOfComments": "integer",
        "liked": "boolean",
        "commented": "boolean",
        "previewLiked": [],
        "user": {
          "userId": "string (uuid)",
          "userIdType": "NETPULSE",
          "firstName": "string",
          "lastName": "string",
          "imageUrl": "string",
          "profilePublic": "boolean"
        }
      },
      "title": "string",
      "totalPerDay": "integer"              // total workouts by this user on that day
    }
  ]
}
```

---

### Gym Feed — Optimal Range

Returns the same full feed format as above, but uses an API-determined date range. Useful as a starting point when no specific range is known.

```
GET .../gym-locations/{gymLocationId}/optimal-feed-range
```

Response schema is identical to **Gym Feed — Full**.

---

### Exerciser Feed — Activity Summary

Returns the number of active training days for the given user in the specified date range.

```
GET .../exercisers/{user_id}/feed?startDate={YYYY-MM-DD}&endDate={YYYY-MM-DD}&locale={locale}
```

**Response**:
```json
{
  "days": "integer"    // number of days with at least one workout in the range
}
```

---

### Feed Data Sources

| Value | Description |
|---|---|
| `EGYM_MACHINE` | eGym fitness machine |
| `STRAVA` | Strava connected app |
| `APPLE_HEALTH` | Apple Health |
| `HEALTH_CONNECT` | Android Health Connect |
| `FITBIT` | Fitbit |
| `GARMIN` | Garmin |
| `USER` | Manually entered by user |

---

## Location Endpoints

### Company Locations

Returns all gym locations belonging to the brand (chain). The `uuid` in the response corresponds to the `gymLocationId` used in all Feed endpoints.

```
GET {brand_api_url}/np/company/children?responseType=detail
```

**Response** — array of locations:
```json
[
  {
    "uuid": "string (uuid)",              // = gymLocationId for feed endpoints
    "gymChainId": "string (uuid)",
    "name": "string",
    "externalMappingId": "string | null",
    "timezone": "string",                 // e.g. "Europe/Berlin"
    "phone": "string | null",
    "email": "string | null",
    "url": "string | null",
    "status": "string | null",
    "statusTillDate": "string | null",
    "logoUrl": "string | null",
    "photos": "null",
    "mms": "null",
    "address": {
      "addressLine1": "string",
      "addressLine2": "string | null",
      "city": "string",
      "country": "string",               // ISO 3166-1 alpha-2, e.g. "DE"
      "postalCode": "string",
      "stateOrProvince": "string | null",
      "timezone": "string",
      "lat": "number",                   // latitude
      "lng": "number"                    // longitude
    },
    "workingHours": {
      "Mon": "string | null",            // e.g. "7:30 AM-8:00 PM" or "Closed"
      "Tue": "string | null",
      "Wed": "string | null",
      "Thu": "string | null",
      "Fri": "string | null",
      "Sat": "string | null",
      "Sun": "string | null"
    },
    "workingHoursFreeText": "string | null",
    "offPeakHours": "string | null",
    "clubInfoClassUrl": "string | null"
  }
]
```

> **Note:** The `responseType=detail` query parameter is required to receive the full object including address, hours, and contact details. Without it, the response may be abbreviated.

---

## Brand API Endpoints

All brand API endpoints use `{brand_api_url}` as the base (resolved from `config.xml`).

---

### User Profile

```
GET {brand_api_url}/np/exerciser/{user_id}
```

**Response** — `user_profile.json`:
```json
{
  "id": null,
  "uuid": "string (uuid)",
  "xid": "string",
  "verified": "boolean",
  "measurementUnit": "string",
  "roles": ["string"],
  "timezone": "string",
  "name": ["string"],
  "membershipType": null,
  "memberId": null,
  "barcode": null,
  "nickname": null,
  "externalId": null,
  "homeClubUuid": "string (uuid)"
}
```

---

### User Magic Link Info

```
GET {brand_api_url}/np/egym-magic-linking/v1.0/users/{user_id}/magic-link-info
```

**Response** — `user_magic_link_info.json`:
```json
{
  "uuid": "string (uuid)",
  "email": "string (email)",
  "firstname": "string",
  "lastname": "string",
  "birthday": "string (DD/MM/YYYY)",
  "gender": "string",
  "height": "number",
  "weight": "number",
  "measurementUnit": "string",
  "homeClubUuid": "string (uuid)",
  "timezone": "string",
  "createdAt": "string (yyyy-MM-dd HH:mm:ss)",
  "updatedAt": "string (yyyy-MM-dd HH:mm:ss)",
  "active": "boolean",
  "guestPassUser": "boolean"
}
```

> **Note:** This endpoint can expose `birthday` even when `/np/exerciser/{user_id}` does not include date-of-birth fields.

---

### Active Challenges

```
GET {brand_api_url}/np/exerciser/{user_id}/challenges/active
```

**Response** — `challenges_active.json`:
```json
[]   // empty array if no active challenges
```

---

### Workouts

```
GET {brand_api_url}/workouts/api/workouts/v2.3/exercisers/{user_id}/workouts
  ?completedAfter={ISO datetime}
  &completedBefore={ISO datetime}
```

**Response** — `workouts.json`:
```json
{
  "workouts": [
    {
      "code": "string",
      "createdAt": "string (ISO datetime)",
      "updatedAt": "string (ISO datetime)",
      "completedAt": "string (ISO datetime)",
      "timezone": "string",
      "workoutPlanCode": null,
      "workoutPlanLabel": null,
      "workoutPlanGroupType": null,
      "exercises": [
        {
          "code": "string",
          "exerciseCode": "string",
          "libraryCode": "string",
          "name": "string",
          "source": { "label": "string", "code": "string" },
          "exercise": {
            "code": "string",
            "label": "string",
            "description": "string",
            "version": "integer",
            "machineBased": "boolean",
            "category": { "code": "string", "label": "string" },
            "attributes": [
              {
                "code": "string",         // e.g. "calories", "activity_points"
                "type": "string",
                "label": "string",
                "dataType": "string",
                "required": "boolean",
                "configuration": { "min": "integer", "max": "integer" },
                "defaults": [ { "unitCode": "string", "value": "integer" } ],
                "display": null
              }
            ]
          },
          "attributes": {
            "calories": { "unit": "kcal", "value": "integer" },
            "activity_points": { "unit": "unit", "value": "integer" },
            "sets_of_reps_and_weight_or_duration_and_weight": [
              {
                "reps":   { "unit": "unit", "value": "integer" },
                "weight": { "unit": "kg",   "value": "number" }
              }
            ]
          },
          "editable": "boolean",
          "deletable": "boolean",
          "createdAt": "string (ISO datetime)",
          "updatedAt": "string (ISO datetime)",
          "completedAt": "string (ISO datetime)",
          "timezone": "string",
          "origin": null
        }
      ]
    }
  ]
}
```

---

## Common Types

### Progress Object (reused across many endpoints)
```json
{
  "value": "number | integer",
  "progress": "string | null",   // "up" | "down" | null
  "percentageDiff": "number | null",
  "amountDiff": "number | null",
  "createdAt": "string (ISO datetime)",
  "timezone": "string"
}
```

### Date Formats

| Format | Example | Used in |
|---|---|---|
| ISO datetime | `2024-11-15T08:30:00Z` | `startDate`/`endDate` query params for summary endpoints |
| Date only | `2024-11-15` | `startDate`/`endDate` for log and history endpoints |

### Body Metric Types

| Type | Unit |
|---|---|
| `WEIGHT_KG` | kg |
| `BMI` | — |
| `BODY_FAT_PERCENTS` | % |
| `WAIST_CM` | cm |
| `HIP_CM` | cm |
| `HEIGHT_CM` | cm |
| `WAIST_TO_HIP_RATIO` | — |

### Bio Age Types

| Type |
|---|
| `TOTAL` |
| `MUSCLE` |
| `METABOLIC` |
| `CARDIO` |
| `FLEXIBILITY` |

### Body Regions

| Value |
|---|
| `UPPER` |
| `CORE` |
| `LOWER` |