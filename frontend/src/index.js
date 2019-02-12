import React from 'react';
import ReactDOM from 'react-dom';
import registerServiceWorker from './registerServiceWorker';
import App from 'components/App';
import 'styles/Courses.css';
import 'styles/Requirements.css';
import 'bootstrap/dist/js/bootstrap.min.js';

ReactDOM.render(<App />, document.getElementById('app'));
registerServiceWorker();
