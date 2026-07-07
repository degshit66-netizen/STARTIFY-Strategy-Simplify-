import React from 'react';
import { createRoot } from 'react-dom/client';
const Dashboard = React.lazy(() => import('./src/components/Dashboard'));
console.log(Dashboard);
