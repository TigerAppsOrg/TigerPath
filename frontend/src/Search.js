import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import './Courses.css';
import './Requirements.css';
import $ from 'jquery';
import jQuery from 'jquery';
import 'dragula/dist/dragula.css';
import 'react-treeview/react-treeview.css';
import TreeView from 'react-treeview/lib/react-treeview.js';

var dragula = require('react-dragula');
var current_request = null;

const reqData = [
  {
    "name": "Computer Science - BSE",
    "path_to": "Computer Science - BSE",
    "satisfied": true,
    "count": 3,
    "min_needed": 3,
    "max_counted": null,
    "req_list": [
      {
        "name": "Prerequisites",
        "path_to": "Computer Science - BSE//Prerequisites",
        "satisfied": true,
        "count": 3,
        "min_needed": 3,
        "max_counted": 1,
        "req_list": [
          {
            "name": "Computer Science Prerequisites",
            "path_to": "Computer Science - BSE//Prerequisites//Computer Science Prerequisites",
            "satisfied": true,
            "count": 3,
            "min_needed": 3,
            "max_counted": 3,
            "settled": [],
            "unsettled": ["COS340"]
          }
        ]
      },
      {
        "name": "Core Courses",
        "path_to": "Computer Science - BSE//Core Courses",
        "satisfied": true,
        "count": 4,
        "min_needed": 4,
        "max_counted": 1,
        "req_list": [
          {
            "name": "Theory",
            "path_to": "Computer Science - BSE//Core Courses//Theory",
            "satisfied": true,
            "count": 2,
            "min_needed": 2,
            "max_counted": 1,
            "settled": [],
            "unsettled": ["COS340"]
          },
          {
            "name": "Systems",
            "path_to": "Computer Science - BSE//Core Courses//Systems",
            "satisfied": true,
            "count": 2,
            "min_needed": 2,
            "max_counted": 1,
            "settled": ["COS318"],
            "unsettled": ["COS333"]
          },
          {
            "name": "Applications",
            "path_to": "Computer Science - BSE//Core Courses//Applications",
            "satisfied": true,
            "count": 2,
            "min_needed": 2,
            "max_counted": 1,
            "settled": [],
            "unsettled": ["COS340"]
          },
          {
            "name": "General",
            "path_to": "Computer Science - BSE//Core Courses//General",
            "satisfied": true,
            "count": 10,
            "min_needed": 2,
            "max_counted": 1,
            "settled": [],
            "unsettled": []

          }
        ]
      },
      {
        "name": "Independent Work",
        "path_to": "Computer Science - BSE//Independent Work",
        "satisfied": true,
        "count": 2,
        "min_needed": 1,
        "max_counted": 1,
        "settled": [],
        "unsettled": ["COS340"]
      }
    ]
  },
  {
    "name": "Computer Science - BSE",
    "path_to": "Computer Science - BSE",
    "satisfied": true,
    "count": 3,
    "min_needed": 3,
    "max_counted": null,
    "req_list": [
      {
        "name": "Prerequisites",
        "path_to": "Computer Science - BSE//Prerequisites",
        "satisfied": true,
        "count": 3,
        "min_needed": 3,
        "max_counted": 1,
        "req_list": [
          {
            "name": "Computer Science Prerequisites",
            "path_to": "Computer Science - BSE//Prerequisites//Computer Science Prerequisites",
            "satisfied": true,
            "count": 3,
            "min_needed": 3,
            "max_counted": 3,
            "settled": [],
            "unsettled": ["COS340"]
          }
        ]
      },
      {
        "name": "Core Courses",
        "path_to": "Computer Science - BSE//Core Courses",
        "satisfied": true,
        "count": 4,
        "min_needed": 4,
        "max_counted": 1,
        "req_list": [
          {
            "name": "Theory",
            "path_to": "Computer Science - BSE//Core Courses//Theory",
            "satisfied": true,
            "count": 2,
            "min_needed": 2,
            "max_counted": 1,
            "settled": [],
            "unsettled": ["COS340"]
          },
          {
            "name": "Systems",
            "path_to": "Computer Science - BSE//Core Courses//Systems",
            "satisfied": true,
            "count": 2,
            "min_needed": 2,
            "max_counted": 1,
            "settled": ["COS318"],
            "unsettled": ["COS333"]
          },
          {
            "name": "Applications",
            "path_to": "Computer Science - BSE//Core Courses//Applications",
            "satisfied": true,
            "count": 2,
            "min_needed": 2,
            "max_counted": 1,
            "settled": [],
            "unsettled": ["COS340"]
          },
          {
            "name": "General",
            "path_to": "Computer Science - BSE//Core Courses//General",
            "satisfied": true,
            "count": 10,
            "min_needed": 2,
            "max_counted": 1,
            "settled": [],
            "unsettled": []

          }
        ]
      },
      {
        "name": "Independent Work",
        "path_to": "Computer Science - BSE//Independent Work",
        "satisfied": true,
        "count": 2,
        "min_needed": 1,
        "max_counted": 1,
        "settled": [],
        "unsettled": ["COS340"]
      }
    ]
  }
];

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

    // settles course and runs verifier to update
    let toggleSettle = function(course, path_to, settle){
      let courseOnReq = $("#requirements").find("li:contains(\'" + course + "\')");
      let courseOnSchedule = $(".semesters").find("p:contains(\'" + course + "\')").parent();
      if(settle){
        // change class of req element to settled
        courseOnReq.attr('class', 'settled')
        // find course in schedule, attach req path to the course, and update schedule
        courseOnSchedule.attr('reqs', courseOnSchedule.attr('reqs') + "," + path_to);
      }
      else{
        // change class of req element to unsettled
        courseOnReq.attr('class', 'unsettled text-muted')
        // find course in schedule, remove req path to the course, and update schedule
        let pathList = courseOnSchedule.attr('reqs').split(',');
        let pathListRemoved = courseOnSchedule.attr('reqs').split(',').splice(pathList.indexOf(path_to), 1).join()
        courseOnSchedule.attr('reqs', pathListRemoved);
      }
      updateSchedule();
    }

    // traverses req tree to display when updating reqlist
    let populateReqTree = function(reqTree){
      return(reqTree['req_list'].map((requirement)=>{
          if('req_list' in requirement) { 
            return(<TreeView nodeLabel={requirement['name']}>{populateReqTree(requirement)}</TreeView>);
          }
          else {
            let counter = requirement['settled'].length + '/' + requirement['min_needed'];
            return (<TreeView itemClassName="tree-leaf-req" nodeLabel={requirement['name'] + " " + counter}>
              {requirement['settled'].map((course)=>{
                return(<li className='settled' onClick={(e)=>{toggleSettle(course, requirement['path_to'], false)}}>{course}</li>);
              })}
              {requirement['unsettled'].map((course)=>{
                return(<li className='unsettled text-muted' onClick={(e)=>{toggleSettle(course, requirement['path_to'], true)}}>{course}</li>);
              })}
            </TreeView>);
          }
        })
      );
    };

    // render data on startup

    // update requirements display
    // get requirements from existing schedule
    $.ajax({
        url: "/api/v1/get_requirements/",
        datatype: 'json',
        type: 'GET',
        cache: true,
        success: function(data) {
          if (data !== null) {
            ReactDOM.render(
             reqData.map((mainReq)=>{
                return <TreeView itemClassName="tree-root" childrenClassName="tree-sub-reqs"nodeLabel={mainReq.name}>{populateReqTree(mainReq)}</TreeView>
              }),
              document.getElementById('requirements')
            );
          }
        }
    });

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
            course_entry["semester"] = course.className.split(" ")[1];
            course_entry["area"] = course.getAttribute('dist_area');
            // slice the first element out because it's an empty string: format is ",x,y,z"
            course_entry["settled"] = course.getAttribute('reqs').split(',').slice(1);
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

      // get requirements from existing schedule
      $.ajax({
          url: "/api/v1/get_requirements/",
          datatype: 'json',
          type: 'GET',
          cache: true,
          success: function(data) {
            if (data !== null) {
              ReactDOM.render(<TreeView className="TreeView" nodeLabel={data[2].name}>{populateReqTree(reqData[0])}</TreeView>, document.getElementById('requirements'));
            }
          }
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
                return <li key={course["id"]} id={course["id"]} className={"course-display " + course["semester"]} data-placement="top" data-toggle="tooltip" dist_area={course["area"]} reqs="">
                <p className="course-name">{course["listing"]}</p>
                <i className="fas fa-times-circle delete-course"></i>
                <a href={"https://registrar.princeton.edu/course-offerings/course_details.xml?courseid=" + course["id"] + "&term=" + termCode} target="_blank"><i className="fas fa-info-circle fa-lg fa-fw course-info"></i></a>
                <a href={"https://reg-captiva.princeton.edu/chart/index.php?terminfo=" + termCode + "&courseinfo=" + course["id"]} target="_blank"><i className="fas fa-chart-bar fa-lg fa-fw course-eval"></i></a>
                <p className="course-title">{course["title"]}</p>
                <p className="course-semester">{"Previously offered in " + convertSemListToReadableForm(course["semester_list"])}</p>
                </li>
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
