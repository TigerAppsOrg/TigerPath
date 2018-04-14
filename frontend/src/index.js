import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import Search from './Search';
import registerServiceWorker from './registerServiceWorker';
import $ from 'jquery'
import jQuery from 'jquery'

ReactDOM.render(<div><App /><Search /></div>, document.getElementById('root'));
registerServiceWorker();
