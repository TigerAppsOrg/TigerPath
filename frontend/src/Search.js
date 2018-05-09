import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import './Courses.css';
import './Requirements.css';
import $ from 'jquery';
import jQuery from 'jquery';
import 'dragula/dist/dragula.css';
import 'react-treeview/react-treeview.css';
import TreeView from 'react-treeview/lib/react-treeview.js';

import {toggleSettle} from './Requirements';
import {populateReqTree} from './Requirements';
import {makeNodesClickable} from './Requirements';

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

let addPopover = function(courseId) {
  let addedCourses = $(".semester").find("[id=" + courseId +"]");
  addedCourses.each(function() {
    // Add content to the popover
    let courseName = $(this).find(".course-name").text();
    let courseTitle = $(this).find(".course-title").text();
    $(this).attr("title", courseName);
    $(this).attr("data-html", "true");
    if (addedCourses.length > 1) {
      $(this).attr("data-content", courseTitle + "<br><span class='popover-warning'>Note: course already added</span>");
    } else {
      $(this).attr("data-content", courseTitle);
    }
    // Show the popover when it's hovered over
    $(this).popover({ trigger: "manual" , html: true, animation: true})
    .on("mouseenter", function() {
        var _this = this;
        $(this).popover("show");
        $(".popover").on("mouseleave", function() {
            $(_this).popover("hide");
        });
    }).on("mouseleave", function() {
        var _this = this;
        setTimeout(function() {
            if (!$(".popover:hover").length) {
                $(_this).popover("hide");
            }
        }, 100);
    });
  });
}

// get requirements from existing schedule
function renderRequirements(){
  $.ajax({
      url: "/api/v1/get_requirements/",
      datatype: 'json',
      type: 'GET',
      cache: true,
      success: function(data) {
        if (data !== null) {
          // there are 3 fields to the data output, the 2nd indexed field contains the requirements json which we display
          data = data.map((mainReq)=>{
            return mainReq[2];
          });
          ReactDOM.render(
           data.map((mainReq, index)=>{
              let mainReqLabel = <span>
                                    <div className='my-arrow root-arrow'></div>
                                    {mainReq.name}
                                 </span>
              return <TreeView key={index} itemClassName="tree-root" childrenClassName="tree-sub-reqs" nodeLabel={mainReqLabel}>{populateReqTree(mainReq)}</TreeView>
            }),
            document.getElementById('requirements')
          );
          makeNodesClickable();
        }
      }
  });
}

// gets current enrolled courses and sends post request
export function updateSchedule(){
  let added_courses = document.querySelectorAll(".semester");
  let courses_taken = [];
  let i = 0;
  added_courses.forEach(function (semester, sem_num){
    courses_taken.push([]);
    semester.childNodes.forEach(function(course, course_index){
      if(typeof course.innerHTML !== 'undefined'){
        let course_entry = {}
        course_entry["name"] = course.getElementsByClassName("course-name")[0].innerHTML;
        course_entry["title"] = course.getElementsByClassName("course-title")[0].innerHTML;
        course_entry["id"] = course.id;
        course_entry["semester"] = course.className.split(" ")[1];
        course_entry["dist_area"] = course.getAttribute('dist_area');
        course_entry["settled"] = $('.semester').eq(sem_num).find('li').eq(course_index).data('reqs');
        courses_taken[i].push(course_entry);
        addPopover(course.id);
      }
    })
    i++;
  });
  courses_taken = JSON.stringify(courses_taken);
  $.ajax({
    url: "/api/v1/update_schedule/",
    type: 'POST',
    data: courses_taken,
    success: function(){
      // update requirements display
      renderRequirements();
    }
  });
}

class Search extends Component {
  constructor() {
    super();
    this.state = {
      search: '',
      data: []
    };

    // render data on startup
    // get existing schedule and populate semesters
    $.ajax({
        url: "/api/v1/get_schedule/",
        datatype: 'json',
        type: 'GET',
        cache: true,
        success: function(data) {
          if (data !== null) {
            let index = 1;
            data.map((semester, sem_num)=> {
              ReactDOM.render(semester.map((course)=> {
                return(
                <li key={course["id"]} id={course["id"]} className={"course-display " + course["semester"]} dist_area={course["dist_area"]}>
                  <span className="grip-dots"></span>
                  <div className="course-content">
                    <p className="course-name">{course["name"]}</p><i className="fas fa-times-circle delete-course"></i>
                    <p className="course-title">{course["title"]}</p>
                  </div>
                </li>)
              }), document.getElementById('sem' + index))
              semester.map((course, course_index) => {
                $('.semester').eq(sem_num).find('li').eq(course_index).data('reqs', course['settled'])
                addPopover(course["id"]);
              })
              index++;
            });
            // assign delete listeners
            $(".delete-course").click(function() {
              let course = $(this).parent();
              course.popover("hide");
              course.remove();
              updateSchedule();
            });
          }
          // get requirements from existing schedule
          updateSchedule();
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

    // tells react to post updated course schedule when an item is dropped
    drake.on('drop', function(el){
      // assigns delete listener to dropped item
      $('.semesters').find('[id=' + el.id + ']').each(function(index) {
        let course = $(this);
        // initializes req list for each dropped item
        if(course.data('reqs') === undefined) course.data('reqs', [])
        if($(this).parent().hasClass('semester')){
          course.find(".delete-course").click(function(){
            course.popover("hide");
            course.remove();
            updateSchedule();
          });
        }
      });
      updateSchedule();
    });
  }

  // is called whenever search query is modified
  updateSearch(event) {
    // clear search before loading new courses
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
          if (current_request !== null && current_request.readyState !== 4) {
              current_request.abort();
          }
        },
        success: function(data) {
          if(search_query === this.state.search || search_query === '$') {
            this.setState({data: data});
            // Render search results
            ReactDOM.render(
              data.map((course)=> {
                let termCode = convertSemToTermCode(course["semester_list"][course["semester_list"].length - 1]);
                return (
                <li key={course["id"]} id={course["id"]} className={"course-display " + course["semester"]} dist_area={course["dist_area"]}>
                  <span className="grip-dots"></span>
                  <div className="course-content">
                    <p className="course-name">{course["listing"]}</p>
                    <i className="fas fa-times-circle delete-course"></i>
                    <a href={"https://registrar.princeton.edu/course-offerings/course_details.xml?courseid=" + course["id"] + "&term=" + termCode} target="_blank"><i className="fas fa-info-circle fa-lg fa-fw course-info"></i></a>
                    <a href={"https://reg-captiva.princeton.edu/chart/index.php?terminfo=" + termCode + "&courseinfo=" + course["id"]} target="_blank"><i className="fas fa-chart-bar fa-lg fa-fw course-eval"></i></a>
                    <p className="course-title">{course["title"]}</p>
                    <p className="course-semester">{"Previously offered in " + convertSemListToReadableForm(course["semester_list"])}</p>
                  </div>
                </li>
                )
            }),
            document.getElementById('display-courses')
            )
          }
        }.bind(this),
    });

    /* Converts semester to term code */
    function convertSemToTermCode(sem) {
      let code = "1";
      if (sem[0] === "f") {
        code += (parseInt(sem.slice(1)) + 1).toString() + "2";
      } else {
        code += sem.slice(1) + "4";
      }
      return code;
    }

    /* Converts semester list to human readable form, using the two most recent semesters */
    function convertSemListToReadableForm(semList) {
      // Sort semester list according to when they happened
      semList.sort(function(sem1, sem2){
        let yearCmp = parseInt(sem1.slice(1)) - parseInt(sem2.slice(1));
        if (yearCmp !== 0) return yearCmp;
        else if (sem1[0] === "s" && sem2[0] === "f") return -1;
        else if (sem1[0] === "f" && sem2[0] === "s") return 1;
        else return 0;
      });

      // Convert to readable form
      let result = "";
      for (let index = Math.max(0, semList.length - 2); index < semList.length; index++) {
        result += convertSemToReadableForm(semList[index]);
        if (index !== semList.length - 1) result += ", ";
      }
      return result;
    }

    /* Helper function to convert a semester into readable form */
    function convertSemToReadableForm(sem) {
      if (sem[0] === "f") {
        return "Fall 20" + sem.slice(1);
      } else {
        return "Spring 20" + sem.slice(1);
      }
    }
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
