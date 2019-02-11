import React, { Component } from 'react';
import styled from 'styled-components'
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Dropdown from 'react-bootstrap/Dropdown';
import Alert from 'react-bootstrap/Alert';
import RequirementsDropdown from 'components/RequirementsDropdown';
import { getSemesterNames } from 'utils/SemesterUtils';

const ECCardHeader = styled(Card.Header)`
  padding: 2px;
  text-align: center;
  font-size: large;
`;

const SemesterDropdown = styled(Dropdown)`
  display: block;
`;

const Submit = styled(Button)`
  display: block;
  margin-left: auto;
  margin-right: 0;
`;

const DEFAULT_NAME = { label: '', value: ''};

export default class ExternalCreditForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      name: DEFAULT_NAME,
      selectedSemester: null,
      selectedRequirement: null,
      submitted: false,
    };
  }

  handleChange = (stateName, eventLabel, eventKey) => {
    this.setState({ [stateName]: { label: eventLabel, value: eventKey } });
  }

  handleSubmit = event => {
    const form = event.currentTarget;

    if (form.checkValidity() === false) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.setState({ submitted: true });

    console.log('Name: ' + this.state.name.value);
    console.log('selected semester: ' + this.state.selectedSemester);
    console.log('selected requirement: ' + this.state.selectedRequirement);

    this.setState({ name: DEFAULT_NAME, selectedSemester: null, selectedRequirement: null });

    event.preventDefault();
  }

  render() {
    let profile = this.props.profile;
    let selectedSem = this.state.selectedSemester;
    let semesterDropdownLabel = selectedSem ? selectedSem.label : 'Select a semester';
    let reqName = this.state.name;

    return (
      <div className={this.props.className}>
        <Card>
          <ECCardHeader>Add external credit</ECCardHeader>
          <Card.Body>
            <Alert variant="success" show={this.state.submitted}
                   onClose={() => this.setState({ submitted: false })} dismissible={true}>
              Your external credit has been successfully created!
            </Alert>
            <Form onSubmit={this.handleSubmit} validated={this.state.validated}>
              <Form.Group controlId="formExternalCreditName">
                <Form.Label>Name of external credit:</Form.Label>
                <Form.Control required type="text" placeholder="e.g. AP Calculus BC" value={reqName.value} onChange={(e) => this.handleChange("name", e.target.value, e.target.value)} />
              </Form.Group>

              <Form.Group controlId="formRequirement">
                <Form.Label>Requirement you want to satisfy:</Form.Label>
                <RequirementsDropdown requirements={this.props.requirements} handleChange={this.handleChange}
                                      selectedRequirement={this.state.selectedRequirement} />
              </Form.Group>

              <Form.Group controlId="formSemester">
                <Form.Label>Semester you obtained the external credit in:</Form.Label>
                <SemesterDropdown>
                  <Dropdown.Toggle variant="secondary">
                    {semesterDropdownLabel}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item eventKey="N/A" onSelect={e => this.handleChange("selectedSemester", "N/A", e)}>N/A</Dropdown.Item>
                    { profile && profile.classYear &&
                      getSemesterNames(profile.classYear).map((semName, index) =>
                        <Dropdown.Item key={semName} eventKey={index} onSelect={(e) => this.handleChange("selectedSemester", semName, e)}>
                          {semName}
                        </Dropdown.Item>
                      )
                    }
                  </Dropdown.Menu>
                </SemesterDropdown>
                <Form.Text className="text-muted">
                  For AP credits, waivers, or other external credits that don't fit in a semester, choose "N/A" - they will appear in "Your External Credits" on the left.
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
