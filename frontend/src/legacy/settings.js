function initSettings() {
  var settingsModal = document.getElementById('settings-modal');
  if (!settingsModal) return;

  var settingsForm = document.getElementById('settings-form');
  var settingsButton = document.getElementById('settings-btn');
  var isSubmitting = false;
  var bsModal = new window.bootstrap.Modal(settingsModal);

  if (settingsButton) {
    settingsButton.addEventListener('click', function () {
      isSubmitting = false;
      bsModal.show();
    });
  }

  if (settingsForm) {
    settingsForm.addEventListener('submit', function () {
      isSubmitting = true;
    });

    settingsModal.addEventListener('hidden.bs.modal', function () {
      if (!isSubmitting) settingsForm.reset();
      isSubmitting = false;
    });
  }

  var saveButton = document.getElementById('save-btn');
  if (saveButton) {
    saveButton.addEventListener('click', function () {
      isSubmitting = true;
    });
  }
}

document.addEventListener('DOMContentLoaded', initSettings);
