import React, { Component } from 'react';
import styled from 'styled-components'
import Semester from 'components/Semester';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Dropdown from 'react-bootstrap/Dropdown';
import RequirementsDropdown from 'components/RequirementsDropdown';

const ECCardHeader = styled(Card.Header)`
  padding: 2px;
  text-align: center;
  font-size: large;
`;

const Submit = styled(Button)`
  float: right;
`;

export default class ExternalCreditForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      name: null,
      selectedSemester: null,
      selectedRequirement: null,
    };
  }

  handleChange = (stateName, event) => {
    console.log(event.target);
    console.log(event.target.value);
    this.setState({ [stateName]: event.target.value });
  }

  handleSubmit = event => {
    alert('A name was submitted: ' + this.state.name);
    event.preventDefault();
  }

  // handleSemesterClick = event => {
  //   let target = event.target;
  //   let id = target.id;
  //   console.log(target);
  //   console.log(id);
  //   this.setState({[id]: target.value});
  // }

  render() {
    return (
      <div className={this.props.className}>
        <Card>
          <ECCardHeader>Add external credit</ECCardHeader>
          <Card.Body>
            <Form onSubmit={this.handleSubmit}>
              <Form.Group controlId="formExternalCreditName">
                <Form.Label>Name of external credit</Form.Label>
                <Form.Control type="text" placeholder="e.g. AP Calculus BC" />
              </Form.Group>

              <Form.Group controlId="formRequirement">
                <Form.Label>Requirement you want to satisfy</Form.Label>
                <RequirementsDropdown requirements={this.props.requirements} />
              </Form.Group>

              <Form.Group controlId="formSemester">
                <Form.Label>Which semester did you obtain this external credit in?</Form.Label>
                <Dropdown>
                  <Dropdown.Toggle variant="secondary">
                    Select a semester
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={e => this.handleChange('selectedSemester', e)}>None</Dropdown.Item>
                    <Dropdown.Item onClick={e => this.handleChange('selectedSemester', e)}>1</Dropdown.Item>
                    <Dropdown.Item onClick={e => this.handleChange('selectedSemester', e)}>2</Dropdown.Item>
                    <Dropdown.Item onClick={e => this.handleChange('selectedSemester', e)}>3</Dropdown.Item>
                    <Dropdown.Item onClick={e => this.handleChange('selectedSemester', e)}>4</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
                {/* <Form.Control as="select">
                  <option>None</option>
                  <option>1</option>
                  <option>2</option>
                  <option>3</option>
                  <option>4</option>
                </Form.Control> */}
                <Form.Text className="text-muted">
                  For AP credits, waivers, or other external credits that don't fit in a semester, choose None.
                </Form.Text>
              </Form.Group>

              <Submit variant="primary" type="submit">
                Submit
              </Submit>
            </Form>
          </Card.Body>
        </Card>
      </div>
    );
  }
}
