import React, { Component } from 'react';
import $ from 'jquery';
import CourseCard from 'components/CourseCard';
import { Droppable, Draggable } from 'react-beautiful-dnd';

export default class Search extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentRequest: null
    };
  }

  // is called whenever search query is modified
  updateSearch = (event) => {
    $('#spinner').css('display', 'inline-block');

    let searchQuery = event.target.value;
    this.props.onChange('searchQuery', searchQuery);
    if (searchQuery === '') searchQuery = "$" // makes sure that there is a value, $ is dummy arg

    this.setState(state => ({
      currentRequest: $.ajax({
        url: "/api/v1/get_courses/" + searchQuery,
        datatype: 'json',
        type: 'GET',
        cache: true,
        beforeSend : function() {
          // if readyState is 4, then the request is already finished
          if (state.currentRequest !== null && state.currentRequest.readyState !== 4) {
            state.currentRequest.abort();
          }
        },
        success: function(searchResults) {
          if (searchQuery === this.props.searchQuery || searchQuery === '$') {
            this.props.onChange('searchResults', searchResults);
            $('#spinner').css('display', 'none');
          }
        }.bind(this)
      })
    }));
  };

  courseCard = (provided, isDragging, course) => {
    if (isDragging) {
      return (
        <React.Fragment>
          <CourseCard innerRef={provided.innerRef} draggable={provided.draggableProps} dragHandle={provided.dragHandleProps}
                      course={course} showSearchInfo={false} />
          <CourseCard course={course} showSearchInfo={true} isPlaceholder={true} />
        </React.Fragment>
      );
    } else {
      return <CourseCard innerRef={provided.innerRef} draggable={provided.draggableProps} dragHandle={provided.dragHandleProps}
                         course={course} showSearchInfo={true} />
    }
  }

  render() {
    return (
      <React.Fragment>
        <div id="search-courses">
          <input type="text"
            id="search-text"
            placeholder="Search Courses"
            value={this.props.searchQuery}
            onChange={this.updateSearch}
            className="form-control"
            autoFocus/>
        </div>
        <div id='search-info'>
          <div id="search-count">
            <span id='search-count-num'>{this.props.searchResults.length}</span>
          </div>
          <span>Search Results</span>
          <i id="spinner" className="fas fa-circle-notch fa-spin"></i>
        </div>
        <Droppable droppableId="search-results" isDropDisabled={true}>
          {(provided, snapshot) => (
            <React.Fragment>
              <div id="display-courses" ref={provided.innerRef} {...provided.droppableProps}>
                {this.props.searchResults.map((course, courseIndex) => {
                  let courseKey = `search-course-card-${courseIndex}`;
                  return (
                    <Draggable key={courseKey} draggableId={courseKey} index={courseIndex}>
                      {(provided, snapshot) => this.courseCard(provided, snapshot.isDragging, course)}
                    </Draggable>
                  );
                })}
              </div>
            </React.Fragment>
          )}
        </Droppable>
      </React.Fragment>
    );
  }
}
