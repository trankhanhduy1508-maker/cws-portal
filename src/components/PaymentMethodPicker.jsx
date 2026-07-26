import { PAYMENT_METHODS } from '../constants/renderConstants';
import './PaymentMethodPicker.css';

export default function PaymentMethodPicker({ selected, onSelect }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} role="radiogroup" aria-label="Chọn phương thức thanh toán">
      {PAYMENT_METHODS.map((m) => (
        <button
          key={m.id}
          className={`payment-method ${selected === m.id ? 'is-selected' : ''}`}
          onClick={() => m.available && onSelect(m.id)}
          disabled={!m.available}
          type="button"
          role="radio"
          aria-checked={selected === m.id}
        >
          <span className="payment-method__radio">
            {selected === m.id && <span className="payment-method__radio-dot" />}
          </span>
          <span className="payment-method__label">{m.label}</span>
          {!m.available && <span className="payment-method__coming-soon">Sắp ra mắt</span>}
        </button>
      ))}
    </div>
  );
}
