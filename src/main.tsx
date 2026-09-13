import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Before the components: their own stylesheets then outrank the shared classes in base.css, which is what
// lets one of them adjust a class it wears.
import './styles/tokens.css';
import './styles/base.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
