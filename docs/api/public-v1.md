# TURNOS Public API v1

Status: contract v1 — implementation pending

Base path: `/api/v1/public`

## Principles

- Public booking flows never use admin endpoints.
- The browser must not choose an arbitrary tenant by `tenant_id`.
- Public tenant resolution is performed by a trusted public identifier such as the published slug/domain/widget configuration.
- Server responses use explicit HTTP status codes and stable error codes.
- All timestamps are ISO 8601; tenant timezone is returned by the public configuration/context.
- Booking writes support an idempotency key.
- This contract does not expose secrets, payment credentials, OAuth tokens, or internal storage identifiers unless they are explicitly public identifiers.

## Public context

A public client must resolve the business context before requesting services. The implementation may use a published slug/domain as the routing key.

Conceptual resource:

`GET /api/v1/public/context`

Response:

```json
{
  "organization": {
    "id": "public-safe-id",
    "slug": "akineuro",
    "name": "AkiNeuro",
    "timeZone": "America/Argentina/Buenos_Aires",
    "currency": "ARS"
  }
}
```

The public context identifier is not an authorization mechanism for private/admin resources.

## Services

`GET /api/v1/public/services`

Query:

- `slug` or equivalent trusted public context key.

Response `200`:

```json
{
  "data": [
    {
      "id": "srv-kine-01",
      "name": "Kinesiología y Fisiatría",
      "description": "...",
      "durationMinutes": 30,
      "price": 18500,
      "currency": "ARS"
    }
  ]
}
```

Only active, publicly bookable services are returned.

## Availability

`GET /api/v1/public/availability`

Query:

- `service_id` — required
- `date` — required, `YYYY-MM-DD`
- `professional_id` — optional public filter

The server derives the organization from the public context and verifies that the requested service/professional belongs to it.

Response `200`:

```json
{
  "date": "2026-09-08",
  "timeZone": "America/Argentina/Buenos_Aires",
  "slots": [
    {
      "professionalId": "prof-public-id",
      "start": "2026-09-08T09:30:00-03:00",
      "end": "2026-09-08T10:00:00-03:00",
      "available": true
    }
  ]
}
```

`200` with an empty `slots` array represents a valid date with no availability.

## Booking intent

`POST /api/v1/public/booking-intents`

Headers:

`Idempotency-Key: <opaque-client-generated-key>`

Request:

```json
{
  "serviceId": "srv-kine-01",
  "professionalId": "prof-public-id",
  "start": "2026-09-08T09:30:00-03:00",
  "customer": {
    "name": "María González",
    "phone": "+54 9 261 ...",
    "email": "maria@example.com"
  }
}
```

The server validates the slot and creates a temporary hold when supported by the booking engine.

Response `201`:

```json
{
  "id": "intent-public-id",
  "status": "HELD",
  "expiresAt": "2026-09-08T09:40:00-03:00"
}
```

Conflict response `409`:

```json
{
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "El horario seleccionado ya no está disponible."
  }
}
```

## Booking confirmation

`POST /api/v1/public/bookings`

Headers:

`Idempotency-Key: <opaque-client-generated-key>`

Request:

```json
{
  "bookingIntentId": "intent-public-id"
}
```

Response `201`:

```json
{
  "id": "booking-public-id",
  "status": "CONFIRMED",
  "serviceId": "srv-kine-01",
  "professionalId": "prof-public-id",
  "start": "2026-09-08T09:30:00-03:00",
  "end": "2026-09-08T10:00:00-03:00"
}
```

If the current payment policy requires payment before confirmation, this endpoint must return the appropriate non-final state instead of claiming confirmation.

## Error model

All errors follow:

```json
{
  "error": {
    "code": "STABLE_MACHINE_CODE",
    "message": "Mensaje seguro para el usuario.",
    "details": {}
  }
}
```

Minimum codes:

- `INVALID_REQUEST` → `400`
- `PUBLIC_CONTEXT_NOT_FOUND` → `404`
- `SERVICE_NOT_FOUND` → `404`
- `SLOT_UNAVAILABLE` → `409`
- `BOOKING_INTENT_EXPIRED` → `409`
- `IDEMPOTENCY_CONFLICT` → `409`
- `RATE_LIMITED` → `429`
- `INTERNAL_ERROR` → `500`

## Security boundary

These endpoints are intentionally separate from admin APIs. Admin authentication, tenant management, payments configuration, calendar OAuth, CRM administration and superadmin operations remain private.

Implementation must add server-side rate limiting, input validation, auditability for booking writes, and tenant isolation before production use.
