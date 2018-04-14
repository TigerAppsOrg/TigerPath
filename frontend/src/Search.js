import React, { Component } from 'react';

class Search extends Component {
  constructor()
  {
    super();
    this.state = {
      search: 'Search Courses'
    };
  }
  updateSearch(event)
  {
    this.setState({search: event.target.value});
  }
  render()
  {
    return (
        <div>
        <input type = "text" 
          value={this.state.search}
          onChange={this.updateSearch.bind(this)}/>
        </div>
      )
  }
}

export default Search;

