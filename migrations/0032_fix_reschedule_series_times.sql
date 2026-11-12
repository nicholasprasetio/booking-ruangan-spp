-- Migration number: 0032  2026-11-12
-- Recurring reschedule (reschedule-series) parsed WIB wall-clock values with
-- `new Date()` + `toISOString()`. On a server running in WIB this stored the
-- slots and the occurrence end_at 7 hours early, while occurrence start_at
-- stayed correct. Shift those rows back.
--
-- Scope is locked up front: only occurrences whose first slot starts exactly
-- 7 hours before the occurrence start_at. Re-running finds nothing to do.

START TRANSACTION;

DROP TEMPORARY TABLE IF EXISTS fix_0032_occ;
CREATE TEMPORARY TABLE fix_0032_occ (id INT PRIMARY KEY, booking_id INT NOT NULL);

INSERT INTO fix_0032_occ (id, booking_id)
SELECT bo.id, bo.booking_id
FROM booking_occurrences bo
JOIN booking_occurrence_slots s ON s.occurrence_id = bo.id
GROUP BY bo.id, bo.booking_id, bo.start_at
HAVING MIN(s.start_at) = DATE_SUB(bo.start_at, INTERVAL 7 HOUR);

-- 1) Slots of those occurrences.
UPDATE booking_occurrence_slots bos
JOIN fix_0032_occ f ON f.id = bos.occurrence_id
SET
  bos.start_at = DATE_ADD(bos.start_at, INTERVAL 7 HOUR),
  bos.end_at = DATE_ADD(bos.end_at, INTERVAL 7 HOUR);

-- 2) Occurrence end_at (start_at was already correct).
UPDATE booking_occurrences bo
JOIN fix_0032_occ f ON f.id = bo.id
SET bo.end_at = DATE_ADD(bo.end_at, INTERVAL 7 HOUR);

-- 3) bookings.start_date / end_date are MIN/MAX of the occurrences; refresh
--    them for the bookings touched above.
UPDATE bookings b
JOIN (
  SELECT bo.booking_id, MIN(bo.start_at) AS first_start, MAX(bo.end_at) AS last_end
  FROM booking_occurrences bo
  WHERE bo.booking_id IN (SELECT booking_id FROM fix_0032_occ)
  GROUP BY bo.booking_id
) o ON o.booking_id = b.id
SET b.start_date = o.first_start,
    b.end_date = o.last_end;

COMMIT;

DROP TEMPORARY TABLE IF EXISTS fix_0032_occ;
