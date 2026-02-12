import './bootstrap-init';
import 'animate.css';
import './legacy/onboarding';
import './legacy/settings';
import './legacy/dropdown';
import './legacy/tutorial';

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from 'components/App';
import 'styles/app-style.css';
import 'styles/messages.css';
import 'styles/Courses.css';
import 'styles/Requirements.css';
import 'styles/Print.css';

const container = document.getElementById('app');
const root = createRoot(container);
root.render(<App />);
