import React from 'react';
import { createRoot } from 'react-dom/client';
import MemoApp from './memo/MemoApp';
import './index.css';

const params = new URLSearchParams(window.location.search);
const facilityId = Number(params.get('facilityId')) || 0;
const facilityName = params.get('facilityName') || '';

// ブラウザタブのタイトルを医療機関名に更新
if (facilityName) {
  document.title = facilityName;
}

createRoot(document.getElementById('memo-root')!).render(
  <React.StrictMode>
    <MemoApp facilityId={facilityId} facilityName={facilityName} />
  </React.StrictMode>
);
