import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import './Courses.css';
import $ from 'jquery';
import jQuery from 'jquery';

var dragula = require('react-dragula')

class Courses extends Component {
  constructor() {
    super();
  }
  componentDidMount() {
//    let draggables = [document.getElementById("course_list")];
//    draggables.concat(Array.from(document.querySelectorAll(".course"));
    let drake = dragula([document.getElementById("course_list"), 
      document.getElementById("sem1"), 
      document.getElementById("sem2"), 
      document.getElementById("sem3"), 
      document.getElementById("sem4"), 
      document.getElementById("sem5"), 
      document.getElementById("sem6"), 
      document.getElementById("sem7"), 
      document.getElementById("sem8")]);
    drake.on('drop', function (){
      let added_courses = document.querySelectorAll(".course");
      let courses_taken = []
      added_courses.forEach(function (semester){
        semester.childNodes.forEach(function (course){
          if(typeof course.innerText != 'undefined')
            courses_taken.push(course);
        });
      });
      console.info(courses_taken);
    });
  }
  render() {
    return(
      <ul id="course_list">
        {this.props.course_list.map((course)=> {
          return <li key={course["id"]}>{course["dept"]} {course["number"]}</li>
        })}
      </ul>
      );
  } 
}

export default Courses;

