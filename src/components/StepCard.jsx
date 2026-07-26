import { motion } from 'framer-motion';
import './StepCard.css';

export default function StepCard({ children }) {
  return (
    <motion.div
      className="step-card"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
