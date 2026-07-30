import { motion } from 'framer-motion';
import { Check, Clock3, Search, Network, Link2, Cpu, Eye, QrCode, PackageCheck } from 'lucide-react';
import { STAGE_SEQUENCE as STAGES, JOB_STATUS } from '../constants/renderConstants';
import './RenderProgress.css';

const STAGE_ICONS = {
  [JOB_STATUS.QUEUED]: Clock3,
  [JOB_STATUS.SEARCHING_WORKERS]: Search,
  [JOB_STATUS.ALLOCATING_WORKERS]: Network,
  [JOB_STATUS.WORKERS_CONNECTED]: Link2,
  [JOB_STATUS.RENDERING]: Cpu,
  [JOB_STATUS.REVIEW_READY]: Eye,
  [JOB_STATUS.AWAITING_PAYMENT]: QrCode,
  [JOB_STATUS.PACKAGING]: PackageCheck,
};

export default function RenderProgress({ stageIndex, overallProgress }) {
  return (
    <div className="render-progress">
      <div className="render-progress__ring-wrap">
        <svg viewBox="0 0 120 120" className="render-progress__ring">
          <circle cx="60" cy="60" r="52" className="render-progress__ring-track" />
          <motion.circle
            cx="60" cy="60" r="52"
            className="render-progress__ring-fill"
            strokeDasharray={2 * Math.PI * 52}
            initial={false}
            animate={{
              strokeDashoffset: 2 * Math.PI * 52 * (1 - overallProgress / 100),
            }}
            transition={{ ease: 'linear', duration: 0.1 }}
          />
        </svg>
        <div className="render-progress__ring-label">
          <span className="render-progress__percent">
            {Math.round(overallProgress)}%
          </span>
        </div>
      </div>

      <p className="render-progress__stage-label">{STAGES[stageIndex].label}</p>

      <ul className="render-progress__list">
        {STAGES.slice(0, -1).map((stage, i) => {
          const StageIcon = STAGE_ICONS[stage.key];
          return (
            <li
              key={stage.key}
              className={`render-progress__item ${i < stageIndex ? 'is-done' : ''} ${i === stageIndex ? 'is-active' : ''}`}
            >
              <span className="render-progress__item-icon">
                {i < stageIndex
                  ? <Check size={13} strokeWidth={3} />
                  : <StageIcon size={12} strokeWidth={2} />}
              </span>
              {stage.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
