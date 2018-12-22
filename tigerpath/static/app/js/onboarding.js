// show the page with the given id
function showPage(id) {
  let page = $('#page-' + id);
  page.addClass("fadeIn");
  page.show();
}

// hide the page with the given id
function hidePage(id) {
  let page = $('#page-' + id);
  page.hide();
}

// wait for DOM to load first
$(function() {
  let pageId = 1;
  let numOfPages = 3

  // show onboarding modal
  $('#onboarding-modal').modal('show');

  // onclick listeners for buttons
  $('#next-btn').click(function() {
    hidePage(pageId); // hide current page
    showPage(++pageId); // show next page

    // replace the next button with the finish button
    if (pageId === numOfPages) {
      $('#next-btn').toggle();
      $('#finish-btn').toggle();
      $('#transcript-btn').toggle();
    }
  });

  // send ajax request to set user metadata when transcript button is pressed
  $('#transcript-btn').click(function() {
    $("#onboarding-form").ajaxSubmit();
  });

  // when the finish button is clicked, hide the onboarding modal
  $('#finish-btn').click(function() {
    $('#onboarding-modal').modal('hide');
  });

  // override enter to submit for the onboarding form
  $('#onboarding-form').on('keyup keypress', function(e) {
    var keyCode = e.keyCode || e.which;
    if (keyCode === 13) { 
      e.preventDefault();
      // click different buttons depending on the page
      if (pageId === numOfPages) {
        $('#finish-btn').click();
      } else {
        $('#next-btn').click();
      }
      return false;
    }
  });
});
