import React, { Component } from 'react';
import './App.css';

import $ from 'jquery'
import jQuery from 'jquery'

class App extends Component {
  constructor()
  {
    super();
    this.state = {data: []};
  }
  componentDidMount()
  {
    this.loadCourses();
  }
  loadCourses()
  {
    $.ajax({
//            url: this.state.url,
        url: "/get_courses/course",
        datatype: 'json',
        type: 'GET',
        cache: true,
        success: function(data) {
          /* Return courses in order of dept and then num. */
          this.setState({data: data});
//              this.sortResults(null, null, this.state.sortBy);

          /* Scroll to the top of the new results. */
//              if (document.getElementById('results')) {
//                document.getElementById('results').scrollTop = 0;
//              }
        }.bind(this)
    })
  }

  render() {
    if(Object.keys(this.state.data).length > 0)
      this.state.data = this.state.data["objects"][0]["id"]
    return(
      <div>
        {this.state.data}
      </div>
      );
  } 
}

export default App;

