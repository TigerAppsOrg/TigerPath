// wait for DOM to load first
$(function() {
  // show onboarding modal
  $('#onboarding-modal').modal('show');

  // onclick listener for save button
  $('#done-btn').click(function() {
    $('#onboarding-modal').modal('hide');
  })
});
