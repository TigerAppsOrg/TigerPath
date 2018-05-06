import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import './Requirements.css';
import $ from 'jquery';
import 'react-treeview/react-treeview.css';
import TreeView from 'react-treeview/lib/react-treeview.js';

import {updateSchedule} from './Search';

// settles course and runs verifier to update
export function toggleSettle(course, path_to, settle){
  let courseOnSchedule = $(".semesters").find("p:contains('" + course + "')").parent();
  if(settle){
    // find course in schedule, attach req path to the course, and update schedule
    courseOnSchedule.attr('reqs', courseOnSchedule.attr('reqs') + "," + path_to);
  }
  else{
    // find course in schedule, remove req path to the course, and update schedule
    let pathList = courseOnSchedule.attr('reqs').split(',');
    let pathListRemoved = pathList.splice(pathList.indexOf(path_to), 1).join();
    courseOnSchedule.attr('reqs', pathListRemoved);
  }
  updateSchedule();
}

function getReqsSatisfied(requirement){
  return requirement['req_list'].map((req)=>{
    if('req_list' in req) {
      return getReqsSatisfied(req) >= req['min_needed'];
    }
    else {
      return req['settled'].length >= req['min_needed'];
    }
  }).filter(x => x).length;
}

// traverses req tree to display when updating reqlist
export function populateReqTree(reqTree){
  return(reqTree['req_list'].map((requirement)=>{
      if('req_list' in requirement) { 
        // treeview key is not needed but assigning here to prevent error in console, this function creates a hash from the name
        let treeHash = requirement['name'].split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
        let satisfied = getReqsSatisfied(requirement);
        let finished = '';
        if(satisfied >= requirement['min_needed']) finished='req-done ';
        if(requirement['min_needed'] == 0) finished+='null-req ';
        let parentReqLabel = <span>
                                <div className='my-arrow'></div>
                                <span className='reqName'>{requirement['name']}</span>
                                <span className='reqCount'>{satisfied + '/' + requirement['min_needed']}</span>
                             </span>
        return(<TreeView key={treeHash} nodeLabel={parentReqLabel} itemClassName={finished}>{populateReqTree(requirement)}</TreeView>);
      }
      else {
        // treeview key is not needed but assigning here to prevent error in console, this function creates a hash from the name
        let treeHash = requirement['name'].split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
        let finished = '';
        if(requirement['settled'].length >= requirement['min_needed']) finished='req-done ';
        if(requirement['min_needed'] == 0) finished+='null-req ';
        let reqLabel = <span>
                          <div className='my-arrow'></div>
                          <span className='reqName'>{requirement['name']}</span>
                          <span className='reqCount'>{requirement['settled'].length + '/' + requirement['min_needed']}</span>
                       </span>;
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
  // root arrows kept getting deleted when updating for some reason, this makes sure they stay
  $('.tree-view_arrow').not('.root-arrow').remove()
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