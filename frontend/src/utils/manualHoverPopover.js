const DEFAULT_HIDE_DELAY_MS = 120;

function getPopoverElement(triggerElement) {
  const describedBy = triggerElement.getAttribute('aria-describedby');
  if (!describedBy) return null;
  return document.getElementById(describedBy);
}

export function bindManualHoverPopover(
  triggerElement,
  popoverInstance,
  { hideDelayMs = DEFAULT_HIDE_DELAY_MS, onShow } = {}
) {
  let hideTimeoutId = null;
  let activePopoverElement = null;

  const clearHideTimeout = () => {
    if (hideTimeoutId !== null) {
      window.clearTimeout(hideTimeoutId);
      hideTimeoutId = null;
    }
  };

  const detachPopoverListeners = () => {
    if (!activePopoverElement) return;
    activePopoverElement.removeEventListener('mouseenter', onPopoverMouseEnter);
    activePopoverElement.removeEventListener('mouseleave', onPopoverMouseLeave);
    activePopoverElement = null;
  };

  const attachPopoverListeners = () => {
    const popoverElement = getPopoverElement(triggerElement);
    if (!popoverElement || popoverElement === activePopoverElement) return;

    detachPopoverListeners();
    activePopoverElement = popoverElement;
    activePopoverElement.addEventListener('mouseenter', onPopoverMouseEnter);
    activePopoverElement.addEventListener('mouseleave', onPopoverMouseLeave);
  };

  const shouldRemainVisible = (relatedTarget) => {
    const popoverElement = getPopoverElement(triggerElement);
    const pointerOnTrigger =
      triggerElement.matches(':hover') ||
      (!!relatedTarget && triggerElement.contains(relatedTarget));
    const pointerOnPopover =
      !!popoverElement &&
      (popoverElement.matches(':hover') ||
        (!!relatedTarget && popoverElement.contains(relatedTarget)));
    return pointerOnTrigger || pointerOnPopover;
  };

  const scheduleHide = (relatedTarget) => {
    clearHideTimeout();
    hideTimeoutId = window.setTimeout(() => {
      if (!shouldRemainVisible(relatedTarget)) {
        popoverInstance.hide();
      }
    }, hideDelayMs);
  };

  function onTriggerMouseEnter() {
    clearHideTimeout();
    popoverInstance.show();
    attachPopoverListeners();
    if (onShow) {
      onShow(getPopoverElement(triggerElement));
    }
  }

  function onTriggerMouseLeave(event) {
    scheduleHide(event.relatedTarget);
  }

  function onPopoverMouseEnter() {
    clearHideTimeout();
  }

  function onPopoverMouseLeave(event) {
    scheduleHide(event.relatedTarget);
  }

  function onPopoverHidden() {
    clearHideTimeout();
    detachPopoverListeners();
  }

  triggerElement.addEventListener('mouseenter', onTriggerMouseEnter);
  triggerElement.addEventListener('mouseleave', onTriggerMouseLeave);
  triggerElement.addEventListener('hidden.bs.popover', onPopoverHidden);

  return () => {
    clearHideTimeout();
    triggerElement.removeEventListener('mouseenter', onTriggerMouseEnter);
    triggerElement.removeEventListener('mouseleave', onTriggerMouseLeave);
    triggerElement.removeEventListener('hidden.bs.popover', onPopoverHidden);
    detachPopoverListeners();
  };
}
