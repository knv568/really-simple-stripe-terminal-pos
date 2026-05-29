export const MIN_CHARGE_AMOUNT_PENCE = 50;
/** £1,500 cap per in-person charge */
export const MAX_CHARGE_AMOUNT_PENCE = 150_000;

export const METADATA_VALUE_MAX_LENGTH = 500;

export function validateChargeAmount(amountPence: number): string | null {
  if (!Number.isInteger(amountPence)) {
    return "Amount must be a whole number of pence";
  }
  if (amountPence < MIN_CHARGE_AMOUNT_PENCE) {
    return "Amount must be at least £0.50";
  }
  if (amountPence > MAX_CHARGE_AMOUNT_PENCE) {
    return "Amount must be at most £1,500.00";
  }
  return null;
}

export function sanitizeMetadataValue(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= METADATA_VALUE_MAX_LENGTH) {
    return trimmed;
  }
  return trimmed.slice(0, METADATA_VALUE_MAX_LENGTH);
}
