const isReqDone = (requirement) => {
  const minNeeded = requirement['min_needed'];
  const count = requirement['count'];
  return (
    (minNeeded === 0 && count >= 0) || (minNeeded > 0 && count >= minNeeded)
  );
};

const isReqNeutral = (requirement) => {
  const minNeeded = requirement['min_needed'];
  const count = requirement['count'];
  return minNeeded === 0 && count === 0;
};

export { isReqDone, isReqNeutral };
