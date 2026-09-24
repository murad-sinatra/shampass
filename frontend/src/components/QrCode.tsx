import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QrCode({ value, label }: { value: string; label: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void QRCode.toDataURL(value, {
      margin: 1,
      width: 320,
      errorCorrectionLevel: 'M',
      color: { dark: '#1c1915', light: '#fffdf8' },
    })
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch(() => {
        if (alive) setSrc(null);
      });
    return () => {
      alive = false;
    };
  }, [value]);

  if (!src) return <p className="sp-qr-fallback">{label}</p>;
  return <img className="sp-qr" src={src} alt={label} width={220} height={220} />;
}
