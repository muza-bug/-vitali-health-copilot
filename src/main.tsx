import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './store/AuthContext';
import './styles/global.css';
import './styles/components.css';
import './styles/screens.css';
import './styles/interactions.css';
import './styles/demo.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
