// wait for DOM to load first
$(function() {
  // onclick listener for netid button
  $('#netid-btn').click(function() {
    $('#netid-dropdown').toggle();
  });

  // Close the dropdown if the user clicks outside of it
  $(window).click(function(e) {
    if (!$(e.target).is('#netid-btn')) {
      $("#netid-dropdown").hide();
    }
  });
});
