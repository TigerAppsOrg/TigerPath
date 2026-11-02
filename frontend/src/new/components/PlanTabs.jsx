import React from 'react';
import Icon from './Icon';

export const MAX_PLANS = 5;

export default function PlanTabs({ plans, activePlanId, onSelect, onEdit, onCreate }) {
  const atLimit = plans.length >= MAX_PLANS;
  return (
    <div id="main-view-tabs" className="tp-plan-tabs dont-print" role="tablist" aria-label="Plans">
      {plans.map((plan, i) => {
        const active = plan.id === activePlanId;
        const prevActive = plans[i - 1]?.id === activePlanId;
        return (
          <React.Fragment key={plan.id}>
            {i > 0 && !active && !prevActive && <span className="tp-plan-divider" aria-hidden />}
            <div className={`tp-plan-tab ${active ? 'active' : ''}`}>
              <button
                type="button"
                role="tab"
                aria-selected={active}
                className="tp-plan-tab-name"
                title={plan.majorNames?.length ? `${plan.name} (${plan.majorNames.join(', ')})` : plan.name}
                onClick={() => onSelect(plan.id)}
                onDoubleClick={() => onEdit(plan)}
              >
                {plan.name}
              </button>
              {active && (
                <button
                  type="button"
                  className="tp-icon-btn"
                  aria-label={`Edit ${plan.name}`}
                  onClick={() => onEdit(plan)}
                >
                  <Icon name="pencil" size={15} />
                </button>
              )}
            </div>
          </React.Fragment>
        );
      })}
      <button
        type="button"
        className="tp-icon-btn tp-plan-add"
        onClick={onCreate}
        disabled={atLimit}
        aria-label={atLimit ? `You have reached the maximum of ${MAX_PLANS} plans.` : 'Create a new plan'}
        title={atLimit ? `You have reached the maximum of ${MAX_PLANS} plans.` : 'Create a new plan'}
      >
        <Icon name={atLimit ? 'lock' : 'plus'} size={17} />
      </button>
    </div>
  );
}
