import * as yup from 'yup'
import { emptyNumberToNull, emptyToNull } from '~/utils/forms'

const optionalString = yup.string().trim().nullable().transform(emptyToNull)
const optionalNumber = yup.number().nullable().transform(emptyNumberToNull)

export function createRoomUpsertSchema(tr: (idText: string, enText: string) => string) {
  return yup.object({
    name: yup.string().trim().required(tr('Nama ruangan wajib diisi', 'Room name is required')),
    location: optionalString,
    capacity: optionalNumber.min(1, tr('Kapasitas minimal 1 orang', 'Capacity must be at least 1 person')),
    description: optionalString,
    open_time_start: optionalString,
    open_time_end: optionalString,
    slot_minutes: optionalNumber.min(15, tr('Minimal 15 menit', 'Minimum is 15 minutes')),
    available_for_booking: yup.boolean().default(true),
  })
}

export const roomUpsertSchema = createRoomUpsertSchema((idText) => idText)
