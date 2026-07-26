import './Button.css';

export default function Button({ children, variant = 'primary', disabled, onClick, icon: Icon, fullWidth = true }) {
  return (
    <button
      className={`btn btn--${variant} ${fullWidth ? 'btn--full' : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      {Icon && <Icon size={18} strokeWidth={2} />}
      {children}
    </button>
  );
}
