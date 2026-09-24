export type PayMethod = 'shamcash' | 'visa' | 'mastercard';

export interface PayInput {
  method: PayMethod;
  walletPhone: string;
  otp: string;
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
}

export type PayIssue =
  | { field: 'phone'; key: 'phoneError' }
  | { field: 'otp'; key: 'otpError' }
  | { field: 'cardName'; key: 'cardNameError' }
  | { field: 'cardNumber'; key: 'cardNumberError' | 'brandMismatch' }
  | { field: 'expiry'; key: 'expiryError' }
  | { field: 'cvc'; key: 'cvcError' };

export function digitsOnly(value: string, max: number): string {
  return value.replace(/\D/g, '').slice(0, max);
}

export function formatCardNumber(value: string): string {
  return digitsOnly(value, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function formatExpiry(value: string): string {
  const digits = digitsOnly(value, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/** Syrian mobiles: 09xxxxxxxx, or +963 9xxxxxxxx. */
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
  const firstInstantAfter = new Date(year, month, 1);
  return firstInstantAfter.getTime() > now.getTime();
}

export function validatePayment(input: PayInput, now = new Date()): PayIssue | { last4: string } {
  if (input.method === 'shamcash') {
    const phone = normalizeSyrianMobile(input.walletPhone);
    if (!phone) return { field: 'phone', key: 'phoneError' };
    if (!/^\d{6}$/.test(digitsOnly(input.otp, 6)) || digitsOnly(input.otp, 6).length !== 6) {
      return { field: 'otp', key: 'otpError' };
    }
    return { last4: phone.slice(-4) };
  }

  const number = digitsOnly(input.cardNumber, 16);
  if (!validPersonName(input.cardName)) return { field: 'cardName', key: 'cardNameError' };
  if (number.length !== 16 || !luhn(number)) return { field: 'cardNumber', key: 'cardNumberError' };
  if (!matchesBrand(input.method, number)) return { field: 'cardNumber', key: 'brandMismatch' };
  if (!expiryInFuture(input.expiry, now)) return { field: 'expiry', key: 'expiryError' };
  if (!/^\d{3}$/.test(digitsOnly(input.cvc, 3))) return { field: 'cvc', key: 'cvcError' };
  return { last4: number.slice(-4) };
}
