import './bootstrap-init';

import React from 'react';
import { createRoot } from 'react-dom/client';
import Landing from 'components/Landing';

const container = document.getElementById('app');
const root = createRoot(container);
root.render(<Landing />);
