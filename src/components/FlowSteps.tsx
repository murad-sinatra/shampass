import { useI18n, type MessageKey } from '../i18n';

const STEPS = ['stepSeats', 'stepPay', 'stepTicket'] as const satisfies readonly MessageKey[];

export function FlowSteps({ current }: { current: 0 | 1 | 2 }) {
  const { t } = useI18n();
  return (
    <ol className="sp-steps">
      {STEPS.map((key, index) => (
        <li
          key={key}
          className={index === current ? 'is-current' : index < current ? 'is-done' : undefined}
          aria-current={index === current ? 'step' : undefined}
        >
          <span>{index + 1}</span>
          {t(key)}
        </li>
      ))}
    </ol>
  );
}
