import React from 'react';
import ReqDegreeTree from './ReqDegreeTree';

const Requirements = (props) => {
  const { requirements, schedule, onChange } = props;
  return (
    <div id="requirements">
      {requirements &&
        requirements.map((req, index) => (
          <ReqDegreeTree
            key={index}
            schedule={schedule}
            requirement={req}
            onChange={onChange}
          />
        ))}
    </div>
  );
};

export default Requirements;
