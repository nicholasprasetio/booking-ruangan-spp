import * as yup from 'yup'
import { emptyNumberToNull, emptyToNull } from '~/utils/forms'

const optionalString = yup.string().trim().nullable().transform(emptyToNull)
const optionalNumber = yup.number().nullable().transform(emptyNumberToNull)

export function createBookingRequestSchema(tr: (idText: string, enText: string) => string) {
  return yup.object({
    date: yup.string().required(tr('Tanggal wajib diisi', 'Date is required')),
    recurrenceEnabled: yup.boolean().default(false),
    recurrenceFrequency: yup
      .string()
      .oneOf(['daily', 'weekly', 'monthly', 'yearly', ''])
      .when('recurrenceEnabled', {
        is: true,
        then: (s) => s.required(tr('Tipe pengulangan wajib dipilih', 'Recurrence type is required')),
        otherwise: (s) => s.optional(),
      }),
    recurrenceUntil: yup.string().when('recurrenceEnabled', {
      is: true,
      then: (s) => s.required(tr('Sampai tanggal wajib diisi', 'Until date is required')),
      otherwise: (s) => s.optional(),
    }),
    recurrenceInterval: yup
      .number()
      .nullable()
      .transform(emptyNumberToNull)
      .when('recurrenceEnabled', {
        is: true,
        then: (s) => s
          .required(tr('Interval wajib diisi', 'Interval is required'))
          .integer(tr('Interval harus bilangan bulat', 'Interval must be an integer'))
          .min(1, tr('Interval minimal 1', 'Minimum interval is 1')),
        otherwise: (s) => s.optional(),
      }),
    recurrenceWeeklyDays: yup
      .array(yup.number().integer().min(0).max(6).required())
      .default([])
      .when(['recurrenceEnabled', 'recurrenceFrequency'], {
        is: (enabled: boolean, frequency: string) => enabled && frequency === 'weekly',
        then: (s) => s.min(1, tr('Pilih minimal 1 hari', 'Select at least 1 day')),
        otherwise: (s) => s.optional(),
      }),
    recurrenceMonthlyDay: yup
      .number()
      .nullable()
      .transform(emptyNumberToNull)
      .when(['recurrenceEnabled', 'recurrenceFrequency'], {
        is: (enabled: boolean, frequency: string) => enabled && frequency === 'monthly',
        then: (s) => s
          .required(tr('Tanggal bulanan wajib diisi', 'Monthly day is required'))
          .integer(tr('Tanggal harus bilangan bulat', 'Day must be an integer'))
          .min(1)
          .max(31),
        otherwise: (s) => s.optional(),
      }),
    recurrenceYearlyMonth: yup
      .number()
      .nullable()
      .transform(emptyNumberToNull)
      .when(['recurrenceEnabled', 'recurrenceFrequency'], {
        is: (enabled: boolean, frequency: string) => enabled && frequency === 'yearly',
        then: (s) => s
          .required(tr('Bulan tahunan wajib diisi', 'Yearly month is required'))
          .integer(tr('Bulan harus bilangan bulat', 'Month must be an integer'))
          .min(1)
          .max(12),
        otherwise: (s) => s.optional(),
      }),
    recurrenceYearlyDay: yup
      .number()
      .nullable()
      .transform(emptyNumberToNull)
      .when(['recurrenceEnabled', 'recurrenceFrequency'], {
        is: (enabled: boolean, frequency: string) => enabled && frequency === 'yearly',
        then: (s) => s
          .required(tr('Tanggal tahunan wajib diisi', 'Yearly day is required'))
          .integer(tr('Tanggal harus bilangan bulat', 'Day must be an integer'))
          .min(1)
          .max(31),
        otherwise: (s) => s.optional(),
      }),
    activityName: optionalString,
    participantCount: optionalNumber.min(1, tr('Estimasi peserta minimal 1 orang', 'Estimated participants must be at least 1 person')),
    notes: optionalString,
  })
}

export const bookingRequestSchema = createBookingRequestSchema((idText) => idText)
