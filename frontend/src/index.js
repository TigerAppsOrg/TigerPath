import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import Search from './Search';
import registerServiceWorker from './registerServiceWorker';
import $ from 'jquery'
import jQuery from 'jquery'

ReactDOM.render(<div><Search /></div>, document.getElementById('root'));
registerServiceWorker();
