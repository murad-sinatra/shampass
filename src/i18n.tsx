import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Lang } from './format';

const STRINGS = {
  en: {
    skip: 'Skip to content',
    searchTab: 'Search',
    ticketsTab: 'Tickets',
    switchLang: 'Switch to Arabic',
    homeKicker: 'Intercity buses in Syria',
    homeTitle: 'Book a seat. Ride with a QR ticket.',
    homeLead: 'Choose a route, pick your seat and its fare, then pay with ShamCash, Visa, or Mastercard.',
    from: 'From',
    to: 'To',
    date: 'Date',
    passengers: 'Passengers',
    passengerHint: 'One seat each, up to 5',
    fewerPassengers: 'Fewer passengers',
    morePassengers: 'More passengers',
    swap: 'Swap cities',
    searchBuses: 'Search buses',
    sameCity: 'Choose two different cities.',
    popular: 'Popular routes',
    fromPrice: 'From {price}',
    howTitle: 'How boarding works',
    how1: 'Find a bus',
    how1b: 'Route, day, and time.',
    how2: 'Choose seats',
    how2b: 'Economy, comfort, or premium. Each seat has its own price.',
    how3: 'Pay and ride',
    how3b: 'ShamCash, Visa, or Mastercard. Show the QR to the driver.',
    sampleFares: 'Fares in this demo are sample prices.',
    changeSearch: 'Change',
    noRoute: 'No direct buses on this road yet.',
    noRouteBody: 'Try a popular route, or another pair of cities.',
    noTrips: 'No more departures on this day.',
    noTripsBody: 'Pick another date. Buses that already left are hidden.',
    nextDay: 'Next day',
    sortDepart: 'Earliest',
    sortPrice: 'Cheapest',
    sortDuration: 'Fastest',
    seatsLeft: '{n} left',
    seatsLeftOne: '1 left',
    soldOut: 'Sold out',
    direct: 'Direct',
    resultsTitle: '{from} to {to}',
    paxCount: '{n} passengers',
    paxOne: '1 passenger',
    back: 'Back',
    frontOfBus: 'Front of the bus',
    driver: 'Driver',
    economy: 'Economy',
    comfort: 'Comfort',
    premium: 'Premium',
    seatLabel: 'Seat {id}, {klass}, {price}, {state}',
    available: 'available',
    taken: 'taken',
    selected: 'selected',
    selectedOne: '1 seat',
    selectedSummary: '{n} seats',
    noneSelected: 'Select a seat',
    continue: 'Continue',
    maxSeats: 'This search is for {n} seats. Go back and add passengers to book more.',
    takenSeat: 'That seat was just booked on this phone.',
    yourSeats: 'Your seats',
    changeSeats: 'Change seats',
    passengerFor: 'Passenger · seat {seat}',
    fullName: 'Full name',
    nameError: 'Enter the name as it should appear on the ticket.',
    phone: 'Mobile number',
    phoneHint: 'Syrian mobile, 09xxxxxxxx',
    phoneError: 'Enter a Syrian mobile number.',
    payWith: 'Pay with',
    shamcash: 'ShamCash',
    shamcashHint: 'Wallet on your phone',
    visa: 'Visa',
    visaHint: 'Debit or credit',
    mastercard: 'Mastercard',
    mastercardHint: 'Debit or credit',
    walletPhone: 'ShamCash number',
    otp: 'Confirmation code',
    otpHint: 'Any 6 digits in this demo',
    otpError: 'Enter the 6-digit code.',
    cardName: 'Name on card',
    cardNumber: 'Card number',
    expiry: 'Expiry',
    cvc: 'CVC',
    cardNumberError: 'Check the card number.',
    expiryError: 'Enter a future expiry as MM/YY.',
    cvcError: 'Enter the 3-digit CVC.',
    cardNameError: 'Enter the name on the card.',
    brandMismatch: 'That number does not match {brand}.',
    demoPay: 'Demo checkout. Nothing is sent to a bank or to ShamCash, and you are not charged.',
    demoCards: 'Visa 4242 4242 4242 4242 · Mastercard 5555 5555 5555 4444',
    pay: 'Pay {price}',
    chooseSeats: 'Choose seats',
    ticketTitle: 'Your ticket',
    booked: 'You’re booked',
    showQr: 'Show this QR to the driver when you board.',
    reference: 'Booking',
    paidWith: 'Paid with {method}',
    demoTicket: 'Demo booking stored on this phone. No payment was collected.',
    seat: 'Seat',
    seatClass: 'Class',
    passengerName: 'Passenger',
    departs: 'Departs',
    arrives: 'Arrives',
    coach: 'Coach {n}',
    remove: 'Remove from this phone',
    removeTitle: 'Remove this ticket?',
    removeBody: 'The seats become available again on this phone. This does not contact a bus company.',
    removeConfirm: 'Remove',
    cancel: 'Cancel',
    myTickets: 'My tickets',
    noTickets: 'No tickets yet',
    noTicketsBody: 'When you book a seat, the QR ticket stays on this phone.',
    findBus: 'Find a bus',
    departed: 'Departed',
    upcoming: 'Upcoming',
    ac: 'AC',
    usb: 'USB',
    wifi: 'Wi-Fi',
    water: 'Water',
    reclining: 'Reclining',
    today: 'Today',
    tomorrow: 'Tomorrow',
    share: 'Share',
    copied: 'Booking reference copied',
    shareText: '{ref}: {from} to {to}, {when}, seats {seats}',
    total: 'Total',
    qrAlt: 'QR code for booking {ref}, seat {seat}',
    ticketMissing: 'Ticket not on this phone',
    ticketMissingBody: 'It may have been removed, or it was booked on another device.',
    stepSeats: 'Seats',
    stepPay: 'Pay',
    stepTicket: 'Ticket',
    tripMissing: 'This departure is no longer listed.',
    tripMissingBody: 'Search again and pick another bus.',
    columnLabel: 'Columns {letters}',
  },
  ar: {
    skip: 'تخطَّ إلى المحتوى',
    searchTab: 'بحث',
    ticketsTab: 'تذاكري',
    switchLang: 'التبديل إلى الإنجليزية',
    homeKicker: 'باصات بين المدن في سوريا',
    homeTitle: 'احجز مقعدك. اركب برمز QR.',
    homeLead: 'اختر الطريق، حدّد المقعد وسعره، ثم ادفع عبر شام كاش أو فيزا أو ماستركارد.',
    from: 'من',
    to: 'إلى',
    date: 'التاريخ',
    passengers: 'الركاب',
    passengerHint: 'مقعد لكل راكب، حتى 5',
    fewerPassengers: 'ركاب أقل',
    morePassengers: 'ركاب أكثر',
    swap: 'تبديل المدينتين',
    searchBuses: 'ابحث عن باصات',
    sameCity: 'اختر مدينتين مختلفتين.',
    popular: 'طرق شائعة',
    fromPrice: 'من {price}',
    howTitle: 'كيف يتم الصعود',
    how1: 'اعثر على باص',
    how1b: 'الطريق واليوم والوقت.',
    how2: 'اختر المقاعد',
    how2b: 'اقتصادي أو مريح أو مميز. لكل مقعد سعره.',
    how3: 'ادفع واركب',
    how3b: 'شام كاش أو فيزا أو ماستركارد. أظهر الرمز للسائق.',
    sampleFares: 'الأسعار في هذا العرض أسعار تجريبية.',
    changeSearch: 'تعديل',
    noRoute: 'لا توجد باصات مباشرة على هذا الطريق بعد.',
    noRouteBody: 'جرّب طريقاً شائعاً أو مدينتين أخريين.',
    noTrips: 'لا رحلات أخرى في هذا اليوم.',
    noTripsBody: 'اختر تاريخاً آخر. الرحلات التي غادرت مخفية.',
    nextDay: 'اليوم التالي',
    sortDepart: 'الأقرب',
    sortPrice: 'الأرخص',
    sortDuration: 'الأسرع',
    seatsLeft: 'متبقي {n}',
    seatsLeftOne: 'متبقي مقعد',
    soldOut: 'نفدت',
    direct: 'مباشر',
    resultsTitle: '{from} إلى {to}',
    paxCount: '{n} ركاب',
    paxOne: 'راكب واحد',
    back: 'رجوع',
    frontOfBus: 'مقدمة الباص',
    driver: 'السائق',
    economy: 'اقتصادي',
    comfort: 'مريح',
    premium: 'مميز',
    seatLabel: 'المقعد {id}، {klass}، {price}، {state}',
    available: 'متاح',
    taken: 'محجوز',
    selected: 'محدد',
    selectedOne: 'مقعد واحد',
    selectedSummary: '{n} مقاعد',
    noneSelected: 'اختر مقعداً',
    continue: 'متابعة',
    maxSeats: 'هذا البحث لـ {n} مقاعد. ارجع وزد عدد الركاب لحجز المزيد.',
    takenSeat: 'حُجز هذا المقعد للتو على هذا الهاتف.',
    yourSeats: 'مقاعدك',
    changeSeats: 'تغيير المقاعد',
    passengerFor: 'الراكب · المقعد {seat}',
    fullName: 'الاسم الكامل',
    nameError: 'اكتب الاسم كما سيظهر على التذكرة.',
    phone: 'رقم الجوال',
    phoneHint: 'جوال سوري، 09xxxxxxxx',
    phoneError: 'أدخل رقم جوال سوري.',
    payWith: 'الدفع بواسطة',
    shamcash: 'شام كاش',
    shamcashHint: 'محفظة على جوالك',
    visa: 'فيزا',
    visaHint: 'بطاقة خصم أو ائتمان',
    mastercard: 'ماستركارد',
    mastercardHint: 'بطاقة خصم أو ائتمان',
    walletPhone: 'رقم شام كاش',
    otp: 'رمز التأكيد',
    otpHint: 'أي 6 أرقام في هذا العرض',
    otpError: 'أدخل الرمز المكوّن من 6 أرقام.',
    cardName: 'الاسم على البطاقة',
    cardNumber: 'رقم البطاقة',
    expiry: 'الانتهاء',
    cvc: 'رمز CVC',
    cardNumberError: 'تحقق من رقم البطاقة.',
    expiryError: 'أدخل تاريخاً مستقبلياً بالشكل MM/YY.',
    cvcError: 'أدخل رمز CVC من 3 أرقام.',
    cardNameError: 'أدخل الاسم على البطاقة.',
    brandMismatch: 'هذا الرقم لا يطابق {brand}.',
    demoPay: 'دفع تجريبي. لا يُرسل شيء إلى بنك أو إلى شام كاش، ولن يُخصم منك مبلغ.',
    demoCards: 'فيزا 4242 4242 4242 4242 · ماستركارد 5555 5555 5555 4444',
    pay: 'ادفع {price}',
    chooseSeats: 'اختيار المقاعد',
    ticketTitle: 'تذكرتك',
    booked: 'تم الحجز',
    showQr: 'أظهر رمز QR هذا للسائق عند الصعود.',
    reference: 'الحجز',
    paidWith: 'دُفع عبر {method}',
    demoTicket: 'حجز تجريبي محفوظ على هذا الهاتف. لم يُحصَّل أي مبلغ.',
    seat: 'المقعد',
    seatClass: 'الدرجة',
    passengerName: 'الراكب',
    departs: 'المغادرة',
    arrives: 'الوصول',
    coach: 'الحافلة {n}',
    remove: 'إزالة من هذا الهاتف',
    removeTitle: 'إزالة هذه التذكرة؟',
    removeBody: 'تعود المقاعد متاحة على هذا الهاتف. هذا لا يتواصل مع شركة نقل.',
    removeConfirm: 'إزالة',
    cancel: 'إلغاء',
    myTickets: 'تذاكري',
    noTickets: 'لا تذاكر بعد',
    noTicketsBody: 'عندما تحجز مقعداً، تبقى تذكرة QR على هذا الهاتف.',
    findBus: 'ابحث عن باص',
    departed: 'غادرت',
    upcoming: 'قادمة',
    ac: 'تكييف',
    usb: 'USB',
    wifi: 'واي فاي',
    water: 'ماء',
    reclining: 'مقاعد متحركة',
    today: 'اليوم',
    tomorrow: 'غداً',
    share: 'مشاركة',
    copied: 'تم نسخ رقم الحجز',
    shareText: '{ref}: {from} إلى {to}، {when}، المقاعد {seats}',
    total: 'المجموع',
    qrAlt: 'رمز QR للحجز {ref}، المقعد {seat}',
    ticketMissing: 'التذكرة ليست على هذا الهاتف',
    ticketMissingBody: 'ربما أُزيلت، أو حُجزت على جهاز آخر.',
    stepSeats: 'المقاعد',
    stepPay: 'الدفع',
    stepTicket: 'التذكرة',
    tripMissing: 'هذه الرحلة لم تعد في الجدول.',
    tripMissingBody: 'ابحث من جديد واختر باصاً آخر.',
    columnLabel: 'الأعمدة {letters}',
  },
} as const;

export type MessageKey = keyof typeof STRINGS.en;

type Vars = Record<string, string | number>;

interface I18nValue {
  lang: Lang;
  dir: 'rtl' | 'ltr';
  setLang: (lang: Lang) => void;
  t: (key: MessageKey, vars?: Vars) => string;
}

const I18nContext = createContext<I18nValue | null>(null);
const LANG_KEY = 'shampass.lang';

function readLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === 'ar' || stored === 'en') return stored;
  } catch {
    /* private mode */
  }
  return navigator.language.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

function fill(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: MessageKey, vars?: Vars) => fill(STRINGS[lang][key], vars),
    [lang],
  );

  const value = useMemo<I18nValue>(
    () => ({ lang, dir: lang === 'ar' ? 'rtl' : 'ltr', setLang, t }),
    [lang, setLang, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}

export function useDocumentLang() {
  const { lang, dir } = useI18n();
  useEffect(() => {
    document.documentElement.lang = lang === 'ar' ? 'ar' : 'en';
    document.documentElement.dir = dir;
  }, [lang, dir]);
}
