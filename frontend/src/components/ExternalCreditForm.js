import React, { Component } from 'react';
import styled from 'styled-components';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Dropdown from 'react-bootstrap/Dropdown';
import Alert from 'react-bootstrap/Alert';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import ECReqDropdown from 'components/ECReqDropdown';
import {
  DEFAULT_SCHEDULE,
  EXTERNAL_CREDITS_SEMESTER_INDEX,
  getSemesterNames,
} from 'utils/SemesterUtils';
import { v1 as uuidv1 } from 'uuid';

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

const InfoIcon = styled.i`
  color: ${({ theme }) => theme.lightGrey};
`;

const DEFAULT_NAME = { label: '', value: '' };

const FORM_STATE = Object.freeze({
  NOT_SUBMITTED: Symbol('formNotSubmitted'),
  FAILURE: Symbol('formFailure'),
  SUCCESS: Symbol('formSuccess'),
});

export default class ExternalCreditForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      name: DEFAULT_NAME,
      selectedSemester: null,
      selectedRequirement: null,
      formState: FORM_STATE.NOT_SUBMITTED,
    };
  }

  handleChange = (stateName, eventLabel, eventKey) => {
    this.setState({ [stateName]: { label: eventLabel, value: eventKey } });
  };

  handleSubmit = (event) => {
    const form = event.currentTarget;

    // check to see that the form has been completely filled out
    if (
      form.checkValidity() === false ||
      !this.state.selectedSemester ||
      !this.state.selectedRequirement
    ) {
      this.setState({ formState: FORM_STATE.FAILURE });
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    let schedule = (this.props.schedule || DEFAULT_SCHEDULE).slice();
    let semIndex = this.state.selectedSemester.value;

    // populate the course values
    let course = {};
    course['id'] = uuidv1();
    course['external'] = true;
    course['name'] = this.state.name.value;
    course['dist_area'] = null;
    course['semester'] = 'external';
    course['settled'] = [this.state.selectedRequirement.value];

    // add the course to the schedule
    let scheduleSemester;
    if (semIndex === 'N/A') {
      scheduleSemester = schedule[EXTERNAL_CREDITS_SEMESTER_INDEX];
    } else {
      scheduleSemester = schedule[semIndex];
    }
    let semLen = scheduleSemester.length;
    scheduleSemester.splice(semLen - 1, 0, course);

    // update the state
    this.props.onChange('schedule', schedule);
    this.setState({
      formState: FORM_STATE.SUCCESS,
      name: DEFAULT_NAME,
      selectedSemester: null,
      selectedRequirement: null,
    });

    event.preventDefault();
  };

  render() {
    let profile = this.props.profile;
    let selectedSem = this.state.selectedSemester;
    let semesterDropdownLabel = selectedSem
      ? selectedSem.label
      : 'Select a semester';
    let reqName = this.state.name;

    return (
      <div className={this.props.className}>
        <Card>
          <ECCardHeader>Add external credit</ECCardHeader>
          <Card.Body>
            <Alert
              variant="success"
              show={this.state.formState === FORM_STATE.SUCCESS}
              onClose={() =>
                this.setState({ formState: FORM_STATE.NOT_SUBMITTED })
              }
              dismissible={true}
            >
              Your external credit has been successfully created!
            </Alert>
            <Alert
              variant="danger"
              show={this.state.formState === FORM_STATE.FAILURE}
              onClose={() =>
                this.setState({ formState: FORM_STATE.NOT_SUBMITTED })
              }
              dismissible={true}
            >
              Please fill out all of the fields.
            </Alert>

            <Form onSubmit={this.handleSubmit} validated={this.state.validated}>
              <Form.Group controlId="formExternalCreditName">
                <Form.Label>Name of external credit:</Form.Label>
                <Form.Control
                  required
                  type="text"
                  placeholder="e.g. AP Calculus BC"
                  value={reqName.value}
                  onChange={(e) =>
                    this.handleChange('name', e.target.value, e.target.value)
                  }
                />
              </Form.Group>

              <Form.Group controlId="formRequirement">
                <Form.Label>Requirement you want to satisfy:</Form.Label>
                <ECReqDropdown
                  requirements={this.props.requirements}
                  handleChange={this.handleChange}
                  selectedRequirement={this.state.selectedRequirement}
                />
              </Form.Group>

              <Form.Group controlId="formSemester">
                <Form.Label>
                  Semester you obtained the external credit in:
                  <OverlayTrigger
                    placement="top"
                    overlay={
                      <Tooltip>
                        For AP credits, waivers, or other external credits that
                        don't fit in a semester, choose "N/A" - they will appear
                        in "Your External Credits" on the left.
                        <br />
                        <br />
                        For a summer course, choose either the semester before
                        or after the summer in which you took it.
                      </Tooltip>
                    }
                  >
                    <InfoIcon className="fas fa-info-circle fa-lg fa-fw ml-1" />
                  </OverlayTrigger>
                </Form.Label>
                <SemesterDropdown>
                  <Dropdown.Toggle variant="secondary">
                    {semesterDropdownLabel}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item
                      eventKey="N/A"
                      onSelect={(e) =>
                        this.handleChange('selectedSemester', 'N/A', e)
                      }
                    >
                      N/A
                    </Dropdown.Item>
                    {profile &&
                      profile.classYear &&
                      getSemesterNames(profile.classYear).map(
                        (semName, index) => (
                          <Dropdown.Item
                            key={semName}
                            eventKey={index}
                            onSelect={(e) =>
                              this.handleChange('selectedSemester', semName, e)
                            }
                          >
                            {semName}
                          </Dropdown.Item>
                        )
                      )}
                  </Dropdown.Menu>
                </SemesterDropdown>
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
