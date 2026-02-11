import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Dropdown from 'react-bootstrap/Dropdown';
import Alert from 'react-bootstrap/Alert';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import RequirementsDropdown from 'components/RequirementsDropdown';
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

const DEFAULT_NAME = { label: '', value: '' };

const FORM_STATE = Object.freeze({
  NOT_SUBMITTED: Symbol('formNotSubmitted'),
  FAILURE: Symbol('formFailure'),
  SUCCESS: Symbol('formSuccess'),
});

export default function ExternalCreditForm({ onChange, profile, schedule, requirements, className }) {
  const [name, setName] = useState(DEFAULT_NAME);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [formState, setFormState] = useState(FORM_STATE.NOT_SUBMITTED);

  const handleChange = useCallback((stateName, eventLabel, eventKey) => {
    const value = { label: eventLabel, value: eventKey };
    switch (stateName) {
      case 'name':
        setName(value);
        break;
      case 'selectedSemester':
        setSelectedSemester(value);
        break;
      case 'selectedRequirement':
        setSelectedRequirement(value);
        break;
    }
  }, []);

  const handleSubmit = (event) => {
    const form = event.currentTarget;

    if (
      form.checkValidity() === false ||
      !selectedSemester ||
      !selectedRequirement
    ) {
      setFormState(FORM_STATE.FAILURE);
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    let currentSchedule = (schedule || DEFAULT_SCHEDULE).slice();
    let semIndex = selectedSemester.value;

    let course = {};
    course['id'] = uuidv1();
    course['external'] = true;
    course['name'] = name.value;
    course['dist_area'] = null;
    course['semester'] = 'external';
    course['settled'] = [selectedRequirement.value];

    let scheduleSemester;
    if (semIndex === 'N/A') {
      scheduleSemester = currentSchedule[EXTERNAL_CREDITS_SEMESTER_INDEX];
    } else {
      scheduleSemester = currentSchedule[semIndex];
    }
    let semLen = scheduleSemester.length;
    scheduleSemester.splice(semLen - 1, 0, course);

    onChange('schedule', currentSchedule);
    setFormState(FORM_STATE.SUCCESS);
    setName(DEFAULT_NAME);
    setSelectedSemester(null);
    setSelectedRequirement(null);

    event.preventDefault();
  };

  let semesterDropdownLabel = selectedSemester
    ? selectedSemester.label
    : 'Select a semester';

  return (
    <div className={className}>
      <Card>
        <ECCardHeader>Add external credit</ECCardHeader>
        <Card.Body>
          <Alert
            variant="success"
            show={formState === FORM_STATE.SUCCESS}
            onClose={() => setFormState(FORM_STATE.NOT_SUBMITTED)}
            dismissible={true}
          >
            Your external credit has been successfully created!
          </Alert>
          <Alert
            variant="danger"
            show={formState === FORM_STATE.FAILURE}
            onClose={() => setFormState(FORM_STATE.NOT_SUBMITTED)}
            dismissible={true}
          >
            Please fill out all of the fields.
          </Alert>

          <Form onSubmit={handleSubmit}>
            <Form.Group controlId="formExternalCreditName">
              <Form.Label>Name of external credit:</Form.Label>
              <Form.Control
                required
                type="text"
                placeholder="e.g. AP Calculus BC"
                value={name.value}
                onChange={(e) =>
                  handleChange('name', e.target.value, e.target.value)
                }
              />
            </Form.Group>

            <Form.Group controlId="formRequirement">
              <Form.Label>Requirement you want to satisfy:</Form.Label>
              <RequirementsDropdown
                requirements={requirements}
                handleChange={handleChange}
                selectedRequirement={selectedRequirement}
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
                      in "Your External Credits" on the left. For a summer
                      course, choose either the semester before or after the
                      summer in which you took it.
                    </Tooltip>
                  }
                >
                  <i className="fas fa-info-circle fa-lg fa-fw ml-1" />
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
                      handleChange('selectedSemester', 'N/A', e)
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
                            handleChange('selectedSemester', semName, e)
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
