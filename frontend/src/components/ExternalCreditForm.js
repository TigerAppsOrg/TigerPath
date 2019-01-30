import React, { Component } from 'react';
import styled from 'styled-components'
import Semester from 'components/Semester';
import { Form, Button, Input, Dropdown, DropdownToggle, DropdownMenu, DropdownItem, Card, CardHeader, CardBody } from 'reactstrap';
import RequirementsDropdown from 'components/RequirementsDropdown';

const ECCardHeader = styled(CardHeader)`
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

  render() {
    return (
      <div className={this.props.className}>
        <Card>
          <ECCardHeader>Add external credit</ECCardHeader>
          <CardBody>
            <Form onSubmit={this.handleSubmit}>
              <Label>
                <LabelText>Name of external credit:</LabelText>
                <Input type="text" id="name" value={this.state.name} onChange={this.handleChange} />
              </Label>
              <Label>
                <LabelText>Requirement you want to satisfy:</LabelText>
                <RequirementsDropdown requirements={this.props.requirements} />
              </Label>
              <Submit>Submit</Submit>
            </Form>
          </CardBody>
        </Card>
      </div>
    );
  }
}
