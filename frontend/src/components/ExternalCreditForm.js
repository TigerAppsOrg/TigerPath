import React, { Component } from 'react';
import styled from 'styled-components'
import Semester from 'components/Semester';
import { Form, Button, Input, Dropdown, DropdownToggle, DropdownMenu, DropdownItem, Card, CardHeader, CardBody } from 'reactstrap';
import Requirements from 'components/Requirements';

const StyledCardHeader = styled(CardHeader)`
  padding: 2px;
  text-align: center;
  font-size: large;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 1rem;
`;

const LabelText = styled.p`
  margin-bottom: 0.5rem;
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
      <div className={this.props.className}>
        <Card>
          <StyledCardHeader>Add external credit</StyledCardHeader>
          <CardBody>
            <Form onSubmit={this.handleSubmit}>
              <Label>
                <LabelText>Name of external credit:</LabelText>
                <Input type="text" id="name" value={this.state.name} onChange={this.handleChange} />
              </Label>
              <Label>
                <LabelText>Requirement you want to satisfy:</LabelText>
                <Dropdown isOpen={this.state.dropdownOpen} toggle={this.toggle}>
                  <DropdownToggle caret>
                    Select a requirement
                  </DropdownToggle>
                  <DropdownMenu>
                    <DropdownItem header>Header</DropdownItem>
                    <DropdownItem>Some Action</DropdownItem>
                    <DropdownItem>Foo Action</DropdownItem>
                    <DropdownItem header>Header 2</DropdownItem>
                    <DropdownItem>Bar Action</DropdownItem>
                    <DropdownItem>Quo Action</DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </Label>
              <Submit>Submit</Submit>
            </Form>
          </CardBody>
        </Card>
      </div>
    );
  }
}
