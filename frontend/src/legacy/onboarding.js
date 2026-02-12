function setVisible(element, isVisible) {
  if (!element) return;

  element.classList.toggle('hidden', !isVisible);
  element.style.display = isVisible ? '' : 'none';
}

function showPage(id) {
  var page = document.getElementById('page-' + id);
  if (!page) return;

  setVisible(page, true);
  page.classList.remove('animate__fadeIn');
  page.classList.add('animate__animated', 'animate__fadeIn');
}

function hidePage(id) {
  var page = document.getElementById('page-' + id);
  setVisible(page, false);
}

function initOnboarding() {
  var onboardingModal = document.getElementById('onboarding-modal');
  if (!onboardingModal) return;

  var nextBtn = document.getElementById('next-btn');
  var finishBtn = document.getElementById('finish-btn');
  if (!nextBtn || !finishBtn) return;

  var bsModal = new window.bootstrap.Modal(onboardingModal);
  var startPage = parseInt(
    onboardingModal.dataset.onboardingStartPage || '1',
    10
  );
  var pageId = startPage === 2 ? 2 : 1;
  var numOfPages = 2;

  if (pageId === 2) {
    hidePage(1);
    showPage(2);
    setVisible(nextBtn, false);
    setVisible(finishBtn, true);
  } else {
    showPage(1);
    hidePage(2);
    setVisible(nextBtn, true);
    setVisible(finishBtn, false);
  }

  bsModal.show();

  nextBtn.addEventListener('click', function () {
    hidePage(pageId);
    showPage(++pageId);

    if (pageId === numOfPages) {
      setVisible(nextBtn, false);
      setVisible(finishBtn, true);
    }
  });

  finishBtn.addEventListener('click', function () {
    bsModal.hide();
  });

  onboardingModal.addEventListener('keyup', function (e) {
    if (e.keyCode === 13 || e.which === 13) {
      e.preventDefault();
      if (pageId === numOfPages) {
        finishBtn.click();
      } else {
        nextBtn.click();
      }
      return false;
    }
  });
}

document.addEventListener('DOMContentLoaded', initOnboarding);
