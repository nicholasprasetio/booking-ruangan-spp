-- Migration number: 0031  2026-10-04
-- Booking slots use WIB wall-clock DATETIME values. Earlier external bookings
-- were converted to UTC, shifting them by 7 hours before MySQL stored them.

UPDATE booking_occurrence_slots bos
JOIN booking_occurrences bo ON bo.id = bos.occurrence_id
JOIN bookings b ON b.id = bo.booking_id
SET
  bos.start_at = DATE_ADD(bos.start_at, INTERVAL 7 HOUR),
  bos.end_at = DATE_ADD(bos.end_at, INTERVAL 7 HOUR)
WHERE b.external_request_id IS NOT NULL;

UPDATE booking_occurrences bo
JOIN bookings b ON b.id = bo.booking_id
SET
  bo.start_at = DATE_ADD(bo.start_at, INTERVAL 7 HOUR),
  bo.end_at = DATE_ADD(bo.end_at, INTERVAL 7 HOUR)
WHERE b.external_request_id IS NOT NULL;
