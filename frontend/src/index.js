import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import Search from './Search';
import registerServiceWorker from './registerServiceWorker';
import 'bootstrap/dist/js/bootstrap.min.js';
import 'react-treeview/react-treeview.css';
import TreeView from 'react-treeview/lib/react-treeview.js';

ReactDOM.render(<Search />, document.getElementById('search-courses'));
registerServiceWorker();
