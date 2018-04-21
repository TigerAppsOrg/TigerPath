import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import './Courses.css';
import $ from 'jquery'
import styles from 'dragula/dist/dragula.css';

var dragula = require('react-dragula')

class Search extends Component {
  constructor() {
    super();
    this.state = {
      search: '',
      data: []
    };

    // select containers to make items draggable
    let draggableItems = $(".semester").get()
    draggableItems.push($("#display_courses")[0])
    let drake = dragula(draggableItems)

    // gets current enrolled courses and sends post request
    let get_courses = function(){
      let added_courses = document.querySelectorAll(".semester");
      let courses_taken = [];
      let i = 0;
      added_courses.forEach(function (semester){
        courses_taken.push([]);
        semester.childNodes.forEach(function(course){
          if(typeof course.innerHTML != 'undefined'){
            courses_taken[i].push(course.innerHTML);
            // adds onclick listener to remove courses on schedule
            // .off to prevent multiple bindings of click event
            $("#" + course["id"]).off("click").click(function(){
                $("#display_courses").append($(this)[0].outerHTML);
                $(this).remove();
                // send post request of updated schedule
                get_courses();
              });
          }
        })
        i++;
      });
      courses_taken = JSON.stringify(courses_taken);
      $.ajax({
        url: "/api/v1/update_schedule/",
        type: 'POST',
        data: courses_taken
      });
    };

    // tells react to post updated course schedule when an item is dropped
    drake.on('drop', get_courses);
  }

  // is called whenever search query is modified
  update_search(event) {
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
              return <li key={course["id"]} id={course["id"]}>{course["dept"]} {course["number"]}</li>
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
          onChange={this.update_search.bind(this)}
          className="form-control"/>
        </div>
      )
  }
}

export default Search;

