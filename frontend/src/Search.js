import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import './Courses.css';
import $ from 'jquery'
import jQuery from 'jquery'

var dragula = require('react-dragula')

class Search extends Component {
  constructor() {
    super();
    this.state = {
      search: '',
      data: []
    };

    // select containers to make items draggable
    let drake = dragula([document.getElementById("display_courses"), 
      document.getElementById("sem1"), 
      document.getElementById("sem2"), 
      document.getElementById("sem3"), 
      document.getElementById("sem4"), 
      document.getElementById("sem5"), 
      document.getElementById("sem6"), 
      document.getElementById("sem7"), 
      document.getElementById("sem8")]);

    // tells react to update course schedule when an item is dropped
    drake.on('drop', function (){
      let added_courses = document.querySelectorAll(".course");
      let courses_taken = [[],[],[],[],[],[],[],[]];
      let i = 0;
      added_courses.forEach(function (semester){
        semester.childNodes.forEach(function(course){
          if(typeof course.innerHTML != 'undefined')
            courses_taken[i].push(course.innerHTML);
        })
        i++
      });
      courses_taken = JSON.stringify(courses_taken);
      console.info(courses_taken);
      $.ajax({
        url: "/api/v1/update_schedule/",
        type: 'POST',
        data: courses_taken
      })
    });
  }

  // is called whenever search query is modified
  updateSearch(event) {
    ReactDOM.unmountComponentAtNode(document.getElementById('display_courses'));
    this.setState({search: event.target.value});
    let search_query = event.target.value;
    // makes sure that there is always an argument after load_courses, $ is dummy arg
    if(search_query == '') search_query = "$"
    // get request, renders list of courses received
    $.ajax({
        url: "/api/v1/get_courses/" + search_query,
        datatype: 'json',
        type: 'GET',
        cache: true,
        success: function(data) {
          this.setState({data: data});
          if(search_query == this.state.search || search_query == '$')
          {
            ReactDOM.render(
              data.map((course)=> {
              return <li key={course["id"]}>{course["dept"]} {course["number"]}</li>
            }),
            document.getElementById('display_courses')
            )
          }
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
          onChange={this.updateSearch.bind(this)}
          className="form-control"/>
        </div>
      )
  }
}

export default Search;

