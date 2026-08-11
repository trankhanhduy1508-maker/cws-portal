import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../../src/index.css';
import '../../../src/components/Button.css';
import AdminScreen from '../../../src/pages/AdminScreen.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AdminScreen />
  </StrictMode>,
);
