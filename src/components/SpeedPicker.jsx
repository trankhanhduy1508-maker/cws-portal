import { Zap } from 'lucide-react';
import { RENDER_SPEEDS } from '../constants/renderConstants';
import './SpeedPicker.css';

export default function SpeedPicker({ selected, onSelect }) {
  return (
    <div className="speed-picker" role="radiogroup" aria-label="Chọn tốc độ render">
      {RENDER_SPEEDS.map((speed) => (
        <button
          key={speed.id}
          className={`speed-card ${selected === speed.id ? 'is-selected' : ''}`}
          onClick={() => onSelect(speed.id)}
          role="radio"
          aria-checked={selected === speed.id}
          type="button"
        >
          <div className="speed-card__bolts">
            {Array.from({ length: 4 }).map((_, i) => (
              <Zap
                key={i}
                size={14}
                fill={i < speed.bolts ? 'currentColor' : 'none'}
                strokeWidth={1.5}
                className={i < speed.bolts ? 'bolt-active' : 'bolt-inactive'}
              />
            ))}
          </div>
          <p className="speed-card__label">{speed.label}</p>
          <p className="speed-card__desc">{speed.desc}</p>
        </button>
      ))}
    </div>
  );
}
