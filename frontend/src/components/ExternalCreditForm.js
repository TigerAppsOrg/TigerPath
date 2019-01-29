import React, { Component } from 'react';
import styled from 'styled-components'
import Semester from 'components/Semester';
import { Form, Button, Input, Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import Requirements from 'components/Requirements';

const Heading = styled.h6`
  margin-bottom: 2rem;
`;

const Label = styled.label`
  display: flex;
`;

const StyledInput = styled(Input)`
  flex: 1;
  margin-left: 10px;
`;

const Submit = styled(Button)`
  display: block;
  margin-top: 2rem;
`;

export default class ExternalCreditForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      name: '',
      dropdownOpen: false,
    };
  }

  handleChange = event => {
    let target = event.target;
    let id = target.id;
    this.setState({[id]: target.value});
  }

  handleSubmit = event => {
    alert('A name was submitted: ' + this.state.name);
    event.preventDefault();
  }

  toggle = () => {
    this.setState(prevState => ({
      dropdownOpen: !prevState.dropdownOpen
    }));
  }

  render() {
    return (
      <div>
        <Heading>Add external credit</Heading>
        <Form onSubmit={this.handleSubmit}>
          <Label>
            <span>Name of external credit</span>
            <StyledInput type="text" id="name" value={this.state.name} onChange={this.handleChange} />
          </Label>
          <Label>
            <span>Which requirement do you want this to satisfy?</span>
            <Dropdown isOpen={this.state.dropdownOpen} toggle={this.toggle}>
              <DropdownToggle caret>
                Choose a requirement
              </DropdownToggle>
              <DropdownMenu>
                <Requirements onChange={this.props.onChange} schedule={this.props.schedule} requirements={this.props.requirements} />
              </DropdownMenu>
            </Dropdown>
          </Label>
          <Submit>Submit</Submit>
        </Form>
      </div>
    );
  }
}
