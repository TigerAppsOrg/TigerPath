import React, { Component } from 'react';
import Courses from './Courses';
import $ from 'jquery'
import jQuery from 'jquery'

class Search extends Component {
  constructor()
  {
    super();
    this.state = {
      search: '',
      data: []
    };
  }
  updateSearch(event)
  {
    this.setState({search: event.target.value});
    let search_query = event.target.value;
    // makes sure that there is always an argument after load_courses, $ is dummy arg
    if(search_query == '') search_query = "$"
    $.ajax({
        url: "/get_courses/" + search_query,
        datatype: 'json',
        type: 'GET',
        cache: true,
        success: function(data) {
          this.setState({data: data});
        }.bind(this)
    })

  }
  render()
  { 
    return (
        <div>
        <input type = "text" 
          placeholder = 'Search Courses'
          value={this.state.search}
          onChange={this.updateSearch.bind(this)}/>
          <Courses course_list={this.state.data}/>
        </div>
      )
  }
}

export default Search;

