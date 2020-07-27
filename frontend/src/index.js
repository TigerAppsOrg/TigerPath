import React from 'react';
import ReactDOM from 'react-dom';
import App from 'components/App';
import { SWRConfig } from 'swr';
import { ThemeProvider } from 'styled-components';
import { TIGERPATH_THEME } from 'styles/theme';
import 'styles/Courses.css';
import 'styles/Print.css';
import 'bootstrap/dist/js/bootstrap.min.js';
import 'react-treeview/react-treeview.css';

ReactDOM.render(
  <SWRConfig
    value={{
      revalidateOnFocus: false,
      fetcher: (...args) => fetch(...args).then((res) => res.json()),
    }}
  >
    <ThemeProvider theme={TIGERPATH_THEME}>
      <App />
    </ThemeProvider>
  </SWRConfig>,
  document.getElementById('app')
);
