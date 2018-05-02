import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import './Courses.css';
import $ from 'jquery';
import jQuery from 'jquery';
import 'dragula/dist/dragula.css';

var dragula = require('react-dragula');
var current_request = null;


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

    // get existing schedule and populate semesters
    $.ajax({
        url: "/api/v1/get_schedule/",
        datatype: 'json',
        type: 'GET',
        cache: true,
        success: function(data) {
          if (data !== null) {
            let index = 1;
            data.map((semester)=> {
              ReactDOM.render(semester.map((course)=> {
                return <li key={course["id"]} id={course["id"]} className={"course-display " + course["semester"]} data-placement="top" data-toggle="tooltip">
                <p className="course-name">{course["name"]}</p><i className="fas fa-times-circle delete-course"></i>
                <p className="course-title">{course["title"]}</p>
                </li>
              }), document.getElementById('sem' + index))
              semester.map((course) => {
                addToolTip(document.getElementById(course["id"]));
              })
              index++;
            });
            // assign delete listeners
            $(".delete-course").click(function(){
              $(this).parent().remove();
              updateSchedule();
              // gets rid of lingering tooltips
              $('.tooltip').tooltip('hide');
            });
          }
        }
    });

    // select containers to make items draggable
    let draggableItems = $(".semester").get();
    draggableItems.push($("#display-courses")[0]);
    let drake = dragula(draggableItems, {
      copy: function(el, source){return el.parentElement.id === "display-courses";},
      accepts: function(el, target){
        return target.className === "semester";}
    });

    // check for duplicates to add tooltip
    let addToolTip = function(course){
      let added_courses = $('.semester').find('[id=' + course.id +']');
      let search_list_course = $('#display-courses').find('[id=' + course.id +']');
      if(added_courses.length > 1){
        // add tip to course on search list
        search_list_course.attr('data-original-title', 'Note: class already added');
        search_list_course.tooltip('enable');
        added_courses.attr('data-original-title', 'Note: class already added');
        added_courses.tooltip('enable')
      }
      else{
        search_list_course.attr('data-original-title', '');
        search_list_course.tooltip('disable');
        added_courses.each(function(course){
          $(this).attr('data-original-title', '');
          $(this).tooltip('disable');
          });
        // get rid of lingering toolltips
        $('.tooltip').tooltip('hide');
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
          if(typeof course.innerHTML !== 'undefined'){
            let course_entry = {}
            course_entry["name"] = course.getElementsByClassName("course-name")[0].innerHTML;
            course_entry["title"] = course.getElementsByClassName("course-title")[0].innerHTML;
            course_entry["id"] = course.id;
            course_entry["semester"] = course.className.split(" ")[1]
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
          $(this).find(".delete-course").click(function(){
            $(this).parent().remove();
            updateSchedule();
            // gets rid of lingering tooltips
            $('.tooltip').tooltip('hide');
          });
        }
      });
      updateSchedule();
    });
  }


  // is called whenever search query is modified
  updateSearch(event) {
    ReactDOM.unmountComponentAtNode(document.getElementById('display-courses'));
    this.setState({search: event.target.value});
    let search_query = event.target.value;
    // makes sure that there is always an argument after load_courses, $ is dummy arg
    if(search_query === '') search_query = "$"
    // get request, renders list of courses received
    
    current_request = $.ajax({
        url: "/api/v1/get_courses/" + search_query,
        datatype: 'json',
        type: 'GET',
        cache: true,
        beforeSend : function() {
          // 4 checks if the request is already finished
          if(current_request !== null && current_request.readyState !== 4) {
              current_request.abort();
          }
        },
        success: function(data) {
          if(search_query === this.state.search || search_query === '$')
          {
            this.setState({data: data});
            ReactDOM.render(
              data.map((course)=> {
              return <li key={course["id"]} id={course["id"]} className={"course-display " + course["semester"]} data-placement="top" data-toggle="tooltip">
              <p className="course-name">{course["listing"]}</p>
              <i className="fas fa-times-circle delete-course"></i>
              <a href={"https://registrar.princeton.edu/course-offerings/course_details.xml?courseid=" + course["id"] + "&term="} target="_blank"><i className="fas fa-info-circle fa-lg fa-fw course-info"></i></a>
              <p className="course-title">{course["title"]}</p>
              <p className="course-semester">{course["semester"] === "both" ? "Fall/Spring" : course["semester"].charAt(0).toUpperCase() + course["semester"].slice(1)}</p>
              </li>
            }),
            document.getElementById('display-courses')
            )
          }
        }.bind(this),
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
          className="form-control"
          autoFocus/>
        </div>
      )
  }
}

export default Search;
