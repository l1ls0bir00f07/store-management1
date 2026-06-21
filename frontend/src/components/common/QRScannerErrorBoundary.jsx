import React from 'react';

export default class QRScannerErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Сканер QR: перехвачена ошибка, модалка закрыта безопасно:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="modal-overlay" onClick={this.props.onClose}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div className="modal-title">⚠ Сканер остановлен</div>
            </div>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 16 }}>
              Произошла ошибка камеры. Попробуйте отсканировать снова — товар можно также найти через поиск.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={this.props.onClose}>Закрыть</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
