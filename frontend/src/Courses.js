import React, { Component } from 'react';
import './App.css';

import $ from 'jquery'
import jQuery from 'jquery'

class Courses extends Component {
  constructor()
  {
    super();
  }
  render() {
    console.info(this.props.course_list)
    return(
      <ul>
        {this.props.course_list.map((course)=> {
          return <li>{course["dept"]} {course["number"]}</li>
        })}
      </ul>
      );
  } 
}

export default Courses;

