// wait for DOM to load first
$(function() {
  // onclick listener for settings button
  $('#settings-btn').click(function() {
    $('#settings-modal').modal('show');
  });

  // onclick listener for save button
  $('#save-btn').click(function() {
    $('#settings-modal').modal('hide');
  })
});