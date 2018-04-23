import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import './Courses.css';
import $ from 'jquery'
import jQuery from 'jquery'
import styles from 'dragula/dist/dragula.css';

var dragula = require('react-dragula')

// setting up ajax request with csrf
function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
var csrftoken = getCookie('csrftoken');
function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}
$.ajaxSetup({
    beforeSend: function(xhr, settings) {
        if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
            xhr.setRequestHeader("X-CSRFToken", csrftoken);
        }
    }
});

class Search extends Component {
  constructor() {
    super();
    this.state = {
      search: '',
      data: []
    };

    // select containers to make items draggable
    let draggableItems = $(".semester").get();
    draggableItems.push($("#display_courses")[0]);
    let drake = dragula(draggableItems, {
      copy: function(el, source){return el.parentElement.id === "display_courses";},
      accepts: function(el, target){
        return target.className === "semester";}
    });

    // check for duplicates to add tooltip
    let addToolTip = function(course){
      let added_courses = $(".semester").find('[id=' + course.id +']');
      let search_list_course = $("#display_courses").find('[id=' + course.id +']');
      if(added_courses.length > 1){
        // add tip to course on search list
        search_list_course.addClass("showtip");
        search_list_course.find(".tooltiptext-custom").empty();
        search_list_course.find(".tooltiptext-custom").append("Note: class already added");
        added_courses.each(function(course){
          $(this).addClass("showtip");
          $(this).find(".tooltiptext-custom").empty();
          $(this).find(".tooltiptext-custom").append("Note: class already added");
          });
      }
      else{
        search_list_course.removeClass("showtip");
        search_list_course.find(".tooltiptext-custom").empty();
        added_courses.each(function(course){
          $(this).removeClass("showtip");
          $(this).find(".tooltiptext-custom").empty();
          });
      }
    };

    // gets current enrolled courses and sends post request
    let updateSchedule = function(){
      let added_courses = document.querySelectorAll(".semester");
      let courses_taken = [];
      let i = 0;
      added_courses.forEach(function (semester){
        courses_taken.push([]);
        semester.childNodes.forEach(function(course){
          if(typeof course.innerHTML != 'undefined'){
            let course_entry = {}
            course_entry["course_name"] = course.getElementsByClassName("course_name")[0].innerHTML;
            course_entry["course_title"] = course.getElementsByClassName("course_title")[0].innerHTML;
            course_entry["course_id"] = course.id;
            courses_taken[i].push(course_entry);
            addToolTip(course);
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
    drake.on('drop', function(el){
      // assigns delete listener to dropped item
      $('[id=' + el.id + ']').each(function(course){
        if($(this).parent().hasClass('semester')){
          $(this).find(".delete_course").click(function(){
            $(this).parent().remove();
            updateSchedule();
          });
        }
      });
      updateSchedule();
    });
  }


  // is called whenever search query is modified
  updateSearch(event) {
    ReactDOM.unmountComponentAtNode(document.getElementById('display_courses'));
    this.setState({search: event.target.value});
    let search_query = event.target.value;
    // makes sure that there is always an argument after load_courses, $ is dummy arg
    if(search_query === '') search_query = "$"
    // get request, renders list of courses received
    $.ajax({
        url: "/api/v1/get_courses/" + search_query,
        datatype: 'json',
        type: 'GET',
        cache: true,
        success: function(data) {
          if(search_query === this.state.search || search_query === '$')
          {
            this.setState({data: data});
            ReactDOM.render(
              data.map((course)=> {
              return <li key={course["id"]} id={course["id"]} className='course_display tooltip-custom'>
              <span className="course_name">{course["listing"]}</span><span className='delete_course'>✖</span><br />
              <span className='course_title'>{course["title"]}</span>
              <span className="tooltiptext-custom"></span>
              </li>
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

