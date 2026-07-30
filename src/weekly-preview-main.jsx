import React from 'react';
import { createRoot } from 'react-dom/client';
import WeeklyLetter from './WeeklyLetter';

const previewRootElement = document.getElementById('root');
const previewRoot = window.__muninnWeeklyPreviewRoot
  || createRoot(previewRootElement);
window.__muninnWeeklyPreviewRoot = previewRoot;

previewRoot.render(
  <React.StrictMode>
    <WeeklyLetter embedded={false} preview />
  </React.StrictMode>,
);
