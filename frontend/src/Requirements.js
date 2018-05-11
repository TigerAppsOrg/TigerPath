import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import './Requirements.css';
import $ from 'jquery';
import 'react-treeview/react-treeview.css';
import TreeView from 'react-treeview/lib/react-treeview.js';

import {updateSchedule} from './Search';
import {returnSearchList} from './Search';

// settles course and runs verifier to update
export function toggleSettle(course, path_to, settle){
  let allCoursesOnSchedule = $("#semesters").find("p:contains('" + course + "')").parent();
  let courseOnScheduleAssigned = '';
  let courseOnScheduleNotAssigned = '';
  // checks for duplicates on course schedule and grabs courses that do not have the path and courses that do have the path
  allCoursesOnSchedule.each(function(){
    if($(this).data('reqs').map((path)=>{
      return path.split('//')[0]
    }).indexOf(path_to.split('//')[0]) === -1) courseOnScheduleNotAssigned = $(this);
    else courseOnScheduleAssigned = $(this);
  });
  if(settle){
    // find course in schedule, attach req path to the course, and update schedule
    courseOnScheduleNotAssigned.data('reqs').push(path_to);
  }
  else{
    courseOnScheduleAssigned.data('reqs').splice(courseOnScheduleAssigned.data('reqs').indexOf(path_to), 1)
  }
  updateSchedule();
}

function getHash(stringName) {
  return stringName.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
}

function getReqCourses(req_path){
  $.ajax({
      // the slashes messes up the url 
      url: "/api/v1/get_req_courses/" + req_path.replace(/\/\//g, '$'),
      datatype: 'json',
      type: 'GET',
      cache: true,
      success: function(data) {
        ReactDOM.render(returnSearchList(data), document.getElementById('display-courses'))
        ReactDOM.render(<span id='search-count'>{data.length} Search Results</span>, document.getElementById('search-count'))
      }
    });
}

// traverses req tree to display when updating reqlist
export function populateReqTree(reqTree){
  return(reqTree['req_list'].map((requirement)=>{
      // treeview key is not needed but assigning here to prevent error in console, this function creates a hash from the name
      let treeHash = getHash(requirement['name'])
      let finished = '';
      if((requirement['min_needed'] === 0 && requirement['count'] >= 0) || 
        (requirement['min_needed'] > 0 && requirement['count'] >= requirement['min_needed']))
          finished='req-done';
      if(requirement['count'] === 0 && requirement['min_needed'] === 0) finished='req-neutral'
      let tag = '';
      if(requirement['min_needed'] === 0) tag = requirement['count'];
      else tag = requirement['count'] + '/' + requirement['min_needed'];
      let reqLabel = <span>
                          <div className='my-arrow'></div>
                          <span className='reqName'>{requirement['name']}</span>
                          <i className="fa fa-search" onClick={(e)=>{getReqCourses(requirement['path_to'])}}></i>
                          <span className='reqCount'>{tag}</span>
                       </span>;
      if('req_list' in requirement) { 
        return(<TreeView key={treeHash} nodeLabel={reqLabel} itemClassName={finished}>{populateReqTree(requirement)}</TreeView>);
      }
      else {
        return (
                <TreeView key={treeHash} itemClassName={finished}  nodeLabel={reqLabel}>
                {requirement['settled'].map((course, index)=>{
                  return(<li key={index} className='settled' onClick={(e)=>{toggleSettle(course, requirement['path_to'], false)}}>{course}</li>);
                })}
                {requirement['unsettled'].map((course, index)=>{
                  return(<li key={index} className='unsettled text-muted' onClick={(e)=>{toggleSettle(course, requirement['path_to'], true)}}>{course}</li>);
                })}
                </TreeView>
              );
      }
    }));
}

// makes the entire node (not just the arrow) clickable to collapse/uncollapse a node
// removes arrows added by library (their listeners cause bugs) and readd them
export function makeNodesClickable(){
  // arrows kept getting deleted when updating for some reason, this makes sure they stay
  $('.tree-view_arrow').not('.my-arrow').remove()
  $('.my-arrow').addClass('tree-view_arrow')
  $('.tree-view_item').each(function(){
    $(this).unbind().click(function(){
      let arrowCollapsedClass = 'tree-view_arrow-collapsed'
      let treeCollapsedClass = 'tree-view_children-collapsed'
      let arrowItem = $(this).find('.tree-view_arrow');
      if(arrowItem.hasClass(arrowCollapsedClass)){ 
        arrowItem.removeClass(arrowCollapsedClass);
        $(this).parent().find('.tree-view_children').removeClass(treeCollapsedClass);
      }
      else {
        arrowItem.addClass(arrowCollapsedClass);
        $(this).parent().find('.tree-view_children').addClass(treeCollapsedClass);
      }
    })
  });
}