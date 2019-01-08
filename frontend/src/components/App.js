import React, { Component } from 'react';
import $ from 'jquery';
import { ajaxSetup } from 'AjaxSetup';
import Search from 'components/Search';
import Schedule from 'components/Schedule';
import Requirements from 'components/Requirements';
import { addPopover } from 'Popover';
import { DragDropContext } from 'react-beautiful-dnd';

const DEFAULT_SCHEDULE = [[],[],[],[],[],[],[],[]];
const RADIX = 10;

export default class App extends Component {
  constructor(props) {
    super(props);
    ajaxSetup();
    this.state = {
      profile: null,
      schedule: DEFAULT_SCHEDULE,
      requirements: null,
      searchQuery: '',
      searchResults: [],
    };
  }

  componentDidMount() {
    this.fetchProfile();
    this.fetchRequirements();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.schedule !== prevState.schedule) {
      let schedule = this.state.schedule;
      this.updateSchedule();
      this.fetchRequirements(schedule);
      for (let sem_num = 0; sem_num < schedule.length; sem_num++) {
        for (let course_index = 0; course_index < schedule[sem_num].length; course_index++) {
          let course = schedule[sem_num][course_index];
          addPopover(course['id'], course['name'], course['title']);
        }
      }
    }
  }

  fetchProfile = () => {
    $.ajax({
      url: '/api/v1/get_profile/',
      datatype: 'json',
      type: 'GET',
      success: (profile) => this.setState({profile})
    });
  }

  // gets current enrolled courses and sends post request
  updateSchedule = () => {
    let schedule = this.state.schedule;
    let stripped_schedule = [];
    for (let sem_num = 0; sem_num < schedule.length; sem_num++) {
      stripped_schedule.push([]);
      for (let course of schedule[sem_num]) {
        stripped_schedule[sem_num].push({id: course['id'], settled: course['settled']});
      }
    }

    $.ajax({
      url: "/api/v1/update_schedule/",
      type: 'POST',
      data: { schedule: JSON.stringify(stripped_schedule) }
    });
  }

  fetchRequirements = (schedule = null) => {
    let ajaxRequest = {
      url: "/api/v1/get_requirements/",
      datatype: 'json',
      type: 'GET',
      success: data => {
        if (data) {
          // there are 3 fields to the data output, the 2nd indexed field contains the requirements json which we display
          data = data.map(mainReq => {
            // if mainReq is not an array, then it is just the name of the major
            if (!Array.isArray(mainReq)) return mainReq
            return mainReq[2];
          });
          this.setState({requirements: data});
        }
      }
    };
    // if the schedule is defined, then we fetch the requirements for that schedule
    // otherwise, it will use the schedule that's stored in the database
    if (schedule) {
      ajaxRequest['data'] = { schedule: JSON.stringify(schedule) };
    }
    $.ajax(ajaxRequest);
  }

  onDragEnd = (result) => {
    let schedule = this.state.schedule.slice();
    let searchResults = this.state.searchResults;

    if (result.destination === null) return;

    let destSemId = parseInt(result.destination.droppableId.split('sem')[1], RADIX);
    let destCourseIndex = result.destination.index;
    let sourceCourseIndex = result.source.index;

    if (result.source.droppableId === 'search-results') {
      // moving course from search results to schedule
      let searchResultsCourse = searchResults[sourceCourseIndex];
      let course = {}
      course['id'] = searchResultsCourse['id'];
      course['name'] = searchResultsCourse['name'];
      course['title'] = searchResultsCourse['title'];
      course['dist_area'] = searchResultsCourse['dist_area'];
      course['semester'] = searchResultsCourse['semester'];
      course['settled'] = [];
      schedule[destSemId].splice(destCourseIndex, 0, course);
    } else {
      // moving course between or within semesters
      let sourceSemId = parseInt(result.source.droppableId.split('sem')[1], RADIX);
      let course = schedule[sourceSemId].splice(sourceCourseIndex, 1)[0];
      schedule[destSemId].splice(destCourseIndex, 0, course);
    }

    this.setState({schedule: schedule});
  };

  onChange = (name, value) => this.setState({ [name]: value })

  render() {
    return (
      <React.Fragment>
        <DragDropContext onDragEnd={this.onDragEnd}>
          <div id="search-pane" className="col-lg-2 pl-0 pr-0">
            <Search onChange={this.onChange} searchQuery={this.state.searchQuery} searchResults={this.state.searchResults} />
          </div>
          <div className="col-lg-8 pl-0 pr-0">
            <Schedule onChange={this.onChange} profile={this.state.profile} schedule={this.state.schedule} />
          </div>
        </DragDropContext>
        <div className="col-lg-2 pl-0 pr-0">
          <Requirements onChange={this.onChange} requirements={this.state.requirements} schedule={this.state.schedule} />
        </div>
      </React.Fragment>
    );
  }
}
