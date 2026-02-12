function initSettings() {
  var settingsModal = document.getElementById('settings-modal');
  if (!settingsModal) return;

  var bsModal = new window.bootstrap.Modal(settingsModal);

  document.getElementById('settings-btn').addEventListener('click', function () {
    bsModal.show();
  });

  document.getElementById('save-btn').addEventListener('click', function () {
    bsModal.hide();
  });
}

document.addEventListener('DOMContentLoaded', initSettings);
