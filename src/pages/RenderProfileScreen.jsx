import { ArrowRight, ArrowLeft } from 'lucide-react';
import StepCard from '../components/StepCard';
import StepDots from '../components/StepDots';
import RenderProfileCard from '../components/RenderProfileCard';
import Button from '../components/Button';
import { RENDER_PROFILES } from '../constants/renderConstants';

export default function RenderProfileScreen({
  estimates, isLoadingEstimates,
  selectedProfileId, onSelectProfile,
  onContinue, onBack,
}) {
  return (
    <StepCard>
      <StepDots total={5} current={1} />

      <div>
        <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
          Chọn chế độ render
        </h2>
        <p style={{ fontSize: 14, color: '#6B6B70' }}>
          So sánh thời gian và chi phí giữa các chế độ
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {RENDER_PROFILES.map((profile) => (
          <RenderProfileCard
            key={profile.id}
            profile={profile}
            estimate={estimates[profile.id]}
            isLoading={isLoadingEstimates}
            isSelected={selectedProfileId === profile.id}
            onSelect={onSelectProfile}
          />
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Button icon={ArrowRight} disabled={!selectedProfileId} onClick={onContinue}>
          Tiếp tục thanh toán
        </Button>
        <button
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14, color: '#6B6B70', fontWeight: 600, padding: 8 }}
          type="button"
        >
          <ArrowLeft size={15} strokeWidth={2} />
          Quay lại
        </button>
      </div>
    </StepCard>
  );
}
