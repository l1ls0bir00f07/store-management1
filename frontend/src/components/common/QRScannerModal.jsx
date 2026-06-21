import React, { useEffect, useRef, useState, useCallback } from 'react';

const SCANNER_ELEMENT_ID = 'qr-scanner-viewport';
const RESCAN_COOLDOWN_MS = 1500; // prevents the same QR from firing twice in a row while still in frame

export default function QRScannerModal({ onClose, onScan }) {
  const scannerRef = useRef(null);
  const lastScanRef = useRef({ text: null, time: 0 });
  const [status, setStatus] = useState('starting'); // starting | running | error
  const [errorMsg, setErrorMsg] = useState('');
  const [lastResult, setLastResult] = useState(null); // { name, ok } for visual feedback

  const handleDecodedText = useCallback((decodedText) => {
    const now = Date.now();
    if (lastScanRef.current.text === decodedText && now - lastScanRef.current.time < RESCAN_COOLDOWN_MS) {
      return; // ignore duplicate scan of the same code while it's still in view
    }
    lastScanRef.current = { text: decodedText, time: now };

    let payload;
    try {
      payload = JSON.parse(decodedText);
    } catch {
      setLastResult({ ok: false, message: 'Это не QR-код товара' });
      return;
    }

    if (!payload || typeof payload.id === 'undefined') {
      setLastResult({ ok: false, message: 'QR-код не содержит данных товара' });
      return;
    }

    onScan(payload, {
      onSuccess: (name) => setLastResult({ ok: true, message: `✓ Добавлено: ${name}` }),
      onError: (message) => setLastResult({ ok: false, message }),
    });
  }, [onScan]);

  useEffect(() => {
    let isMounted = true;
    let html5QrCode;

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (!isMounted) return;
      html5QrCode = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = html5QrCode;

      html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => handleDecodedText(decodedText),
        () => { /* per-frame "no QR found" noise — intentionally ignored */ }
      ).then(() => {
        if (isMounted) setStatus('running');
      }).catch((err) => {
        if (!isMounted) return;
        setStatus('error');
        setErrorMsg(
          err?.toString().includes('NotAllowedError') || err?.toString().includes('Permission')
            ? 'Доступ к камере запрещён. Разрешите доступ к камере в браузере и попробуйте снова.'
            : 'Не удалось запустить камеру. Проверьте, что устройство имеет камеру и сайт открыт по HTTPS.'
        );
      });
    });

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(() => {});
      }
    };
  }, [handleDecodedText]);

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(() => {});
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div className="modal-title">📷 Сканировать QR-код товара</div>
          <button className="btn btn-ghost btn-sm" onClick={handleClose}>✕</button>
        </div>

        {status === 'error' && (
          <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>
            ⚠ {errorMsg}
          </div>
        )}

        <div style={{
          position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden',
          background: '#000', minHeight: status === 'error' ? 0 : 320
        }}>
          <div id={SCANNER_ELEMENT_ID} style={{ width: '100%' }} />
          {status === 'starting' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', fontSize: 13 }}>
              Запуск камеры...
            </div>
          )}
        </div>

        {lastResult && (
          <div style={{
            marginTop: 16, padding: '10px 16px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600,
            background: lastResult.ok ? 'var(--green-dim)' : 'var(--red-dim)',
            color: lastResult.ok ? 'var(--green)' : 'var(--red)',
            border: `1px solid ${lastResult.ok ? 'var(--green)' : 'var(--red)'}`
          }}>
            {lastResult.message}
          </div>
        )}

        <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 14, textAlign: 'center' }}>
          Наведите камеру на QR-код товара. Можно сканировать несколько товаров подряд без закрытия окна.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-primary" onClick={handleClose}>Готово</button>
        </div>
      </div>
    </div>
  );
}
