export const TIME_SLOT_START_MIN = 10 * 60; // 10:00
export const TIME_SLOT_END_MIN = 18 * 60; // 18:00
export const TIME_SLOT_INTERVAL_MIN = 30;

export function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (
    let m = TIME_SLOT_START_MIN;
    m <= TIME_SLOT_END_MIN;
    m += TIME_SLOT_INTERVAL_MIN
  ) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}
