import React from 'react';
import { createRoot } from 'react-dom/client';
import MemoTagManager from './memo/MemoTagManager';
import './index.css';

createRoot(document.getElementById('tag-root')!).render(
  <React.StrictMode>
    <MemoTagManager />
  </React.StrictMode>,
);
