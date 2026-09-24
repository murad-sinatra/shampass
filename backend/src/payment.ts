export type PayMethod = 'shamcash' | 'visa' | 'mastercard';

export interface PayInput {
  method: PayMethod;
  walletPhone?: string;
  otp?: string;
  cardName?: string;
  cardNumber?: string;
  expiry?: string;
  cvc?: string;
}

export type PayIssueCode =
  | 'phone'
  | 'otp'
  | 'cardName'
  | 'cardNumber'
  | 'brandMismatch'
  | 'expiry'
  | 'cvc';

export function digitsOnly(value: string, max: number): string {
  return value.replace(/\D/g, '').slice(0, max);
}

export function normalizeSyrianMobile(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (/^09\d{8}$/.test(digits)) return digits;
  if (/^9639\d{8}$/.test(digits)) return `0${digits.slice(3)}`;
  return null;
}

export function validPersonName(value: string): boolean {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return /^[\p{L}][\p{L}\s'.-]{1,59}$/u.test(trimmed);
}

function luhn(number: string): boolean {
  let sum = 0;
  let alternate = false;
  for (let index = number.length - 1; index >= 0; index -= 1) {
    let digit = Number(number[index]);
    if (alternate) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

function matchesBrand(method: PayMethod, number: string): boolean {
  if (method === 'visa') return /^4\d{15}$/.test(number);
  if (method === 'mastercard') {
    const firstTwo = Number(number.slice(0, 2));
    const firstFour = Number(number.slice(0, 4));
    return (firstTwo >= 51 && firstTwo <= 55) || (firstFour >= 2221 && firstFour <= 2720);
  }
  return false;
}

function expiryInFuture(value: string, now: Date): boolean {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  return new Date(year, month, 1).getTime() > now.getTime();
}

/** Demo checkout. The full card number is checked and then discarded. */
export function validatePayment(input: PayInput, now = new Date()): { last4: string } | { code: PayIssueCode } {
  if (input.method === 'shamcash') {
    const phone = normalizeSyrianMobile(input.walletPhone ?? '');
    if (!phone) return { code: 'phone' };
    if (!/^\d{6}$/.test(input.otp ?? '')) return { code: 'otp' };
    return { last4: phone.slice(-4) };
  }
  if (!validPersonName(input.cardName ?? '')) return { code: 'cardName' };
  const number = digitsOnly(input.cardNumber ?? '', 16);
  if (number.length !== 16 || !luhn(number)) return { code: 'cardNumber' };
  if (!matchesBrand(input.method, number)) return { code: 'brandMismatch' };
  if (!expiryInFuture(input.expiry ?? '', now)) return { code: 'expiry' };
  if (!/^\d{3}$/.test(input.cvc ?? '')) return { code: 'cvc' };
  return { last4: number.slice(-4) };
}
