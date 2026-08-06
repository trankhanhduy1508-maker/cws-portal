import { formatEtaDuration } from '../utils/timeUtils';
import './RenderProfileCard.css';

export default function RenderProfileCard({ profile, estimate, isSelected, isLoading, onSelect }) {
  return (
    <button
      className={`profile-card ${isSelected ? 'is-selected' : ''}`}
      onClick={() => onSelect(profile.id)}
      type="button"
      role="radio"
      aria-checked={isSelected}
    >
      {profile.recommended && <span className="profile-card__badge">Đề xuất</span>}
      <p className="profile-card__label">{profile.label}</p>
      <p className="profile-card__tagline">{profile.tagline}</p>

      <div className="profile-card__stats">
        <div className="profile-card__stat">
          <span className="profile-card__stat-label">Thời gian</span>
          {isLoading ? <span className="profile-card__skeleton" /> : (
            <span className="profile-card__stat-value">{formatEtaDuration(estimate?.etaSeconds)}</span>
          )}
        </div>
        {estimate?.queueSeconds > 0 && (
          <div className="profile-card__stat">
            <span className="profile-card__stat-label">Chờ trước</span>
            <span className="profile-card__stat-value">{formatEtaDuration(estimate.queueSeconds)}</span>
          </div>
        )}
      </div>
    </button>
  );
}
