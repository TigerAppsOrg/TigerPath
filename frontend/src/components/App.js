import React, { Component } from 'react';
import $ from 'jquery';
import { ajaxSetup } from 'AjaxSetup';
import Search from 'components/Search';
import MainView from 'components/MainView';
import Requirements from 'components/Requirements';
import { DragDropContext } from 'react-beautiful-dnd';
import { ThemeProvider } from 'styled-components';
import { TIGERPATH_THEME } from 'styles/theme';
import { DEFAULT_SCHEDULE } from 'utils/SemesterUtils';

const RADIX = 10;

export default class App extends Component {
  constructor(props) {
    super(props);
    ajaxSetup();
    this.state = {
      profile: null,
      schedule: null,
      requirements: null,
      searchResults: [],
    };
  }

  componentDidMount() {
    this.fetchProfile();
    this.fetchRequirements();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.schedule !== prevState.schedule) {
      if (prevState.schedule !== null) {
        this.updateScheduleAndGetRequirements();
      }
    }
  }

  fetchProfile = () => {
    $.ajax({
      url: '/api/v1/get_profile/',
      datatype: 'json',
      type: 'GET',
      success: (profile) => this.setState({ profile }),
    });
  };

  // gets current enrolled courses and sends post request
  updateScheduleAndGetRequirements = () => {
    let schedule = this.state.schedule;
    let strippedSchedule = [];
    for (let semIndex = 0; semIndex < schedule.length; semIndex++) {
      strippedSchedule.push([]);
      for (let course of schedule[semIndex]) {
        let strippedCourse = { id: course['id'], settled: course['settled'] };
        if (course['external']) {
          strippedCourse['external'] = course['external'];
          strippedCourse['name'] = course['name'];
        }
        strippedSchedule[semIndex].push(strippedCourse);
      }
    }

    $.ajax({
      url: '/api/v1/update_schedule_and_get_requirements/',
      type: 'POST',
      data: { schedule: JSON.stringify(strippedSchedule) },
      success: (data) => this.handleRequirementData(data),
    });
  };

  fetchRequirements = () => {
    $.ajax({
      url: '/api/v1/get_requirements/',
      datatype: 'json',
      type: 'GET',
      success: (data) => this.handleRequirementData(data),
    });
  };

  handleRequirementData = (data) => {
    if (data) {
      // there are 3 fields to the data output, the 2nd indexed field contains the requirements json which we display
      data = data.map((mainReq) => {
        // if mainReq is not an array, then it is just the name of the major
        if (!Array.isArray(mainReq)) return mainReq;
        return mainReq[2];
      });
      this.setState({ requirements: data });
    }
  };

  onDragEnd = (result) => {
    let schedule = (this.state.schedule || DEFAULT_SCHEDULE).slice();
    let searchResults = this.state.searchResults;

    if (result.destination === null) return;

    let destSemId = parseInt(
      result.destination.droppableId.split('sem')[1],
      RADIX
    );
    let destCourseIndex = result.destination.index;
    let sourceCourseIndex = result.source.index;

    if (result.source.droppableId.includes('search-result-droppable')) {
      // moving course from search results to schedule
      let searchResultsCourse = searchResults[sourceCourseIndex];
      let course = {};
      course['id'] = searchResultsCourse['id'];
      course['name'] = searchResultsCourse['name'];
      course['title'] = searchResultsCourse['title'];
      course['dist_area'] = searchResultsCourse['dist_area'];
      course['semester'] = searchResultsCourse['semester'];
      course['semester_list'] = searchResultsCourse['semester_list'];
      course['settled'] = [];
      schedule[destSemId].splice(destCourseIndex, 0, course);
    } else {
      // moving course between or within semesters
      let sourceSemId = parseInt(
        result.source.droppableId.split('sem')[1],
        RADIX
      );
      let course = schedule[sourceSemId].splice(sourceCourseIndex, 1)[0];
      schedule[destSemId].splice(destCourseIndex, 0, course);
    }

    this.setState({ schedule: schedule });
  };

  onChange = (name, value) => this.setState({ [name]: value });

  render() {
    return (
      <ThemeProvider theme={TIGERPATH_THEME}>
        <React.Fragment>
          <h1 className="print-only">My Four Year Schedule</h1>
          <p className="print-only">
            This schedule was created using{' '}
            <b>TigerPath - Princeton's Four-Year Course Planner</b> at{' '}
            <a
              href="http://www.tigerpath.io/"
              target="_blank"
              rel="noopener noreferrer"
            >
              tigerpath.io
            </a>
            .
          </p>
          <DragDropContext onDragEnd={this.onDragEnd}>
            <div id="search-pane" className="col-lg-2 pl-0 pr-0 dont-print">
              <Search
                onChange={this.onChange}
                searchResults={this.state.searchResults}
              />
            </div>
            <div className="col-lg-8 pl-0 pr-0">
              <MainView
                onChange={this.onChange}
                profile={this.state.profile}
                schedule={this.state.schedule}
                requirements={this.state.requirements}
              />
            </div>
          </DragDropContext>
          <div className="col-lg-2 pl-0 pr-0 break dont-print">
            <Requirements
              onChange={this.onChange}
              requirements={this.state.requirements}
              schedule={this.state.schedule}
            />
          </div>
        </React.Fragment>
      </ThemeProvider>
    );
  }
}
