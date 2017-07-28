window.onload = function() {
  var fileName;
  var file_sha;
  var file_path;
  var bodyHtml;
  var lti_user_private_key;

  var editor = $('#initial_textarea');

  tinymce.init({
    selector: '#initial_textarea',
    browser_spellcheck: true,
    setup: function(editor) {
      // Check for changes in editor
      editor.on('change', function(e) {
        console.log(editor.isDirty());
        var clean = $('#mceu_0').hasClass('mce-disabled');
        if(clean) {
          $('.saveBtn').removeClass('saveWarning');
          $('.saveBtn').attr('');
        } else {
          $('.saveBtn').addClass('saveWarning');
          $('.saveBtn').attr('data-badge', '!');
        }
      });
      // editor.on('init', function(editor) {
      //   console.log(tinymce.UndoManager);
      //   tinymce.onUndo(function(e) {
      //   // tinymce.UndoManager.hasUndo(function(e) {
      //     console.log("undo-ed");
      //     var clean = $('#mceu_0').hasClass('mce-disabled');
      //     if(clean) {
      //       console.log("clearing");
      //       $('.saveBtn').removeClass('saveWarning');
      //       $('.saveBtn').attr('');
      //     }
      //   });
      // });
    },
    isNotDirty: true,
    height : "50rem",
    auto_focus: 'initial_textarea',
    plugins: [
      'advlist autolink link image lists charmap print preview hr anchor pagebreak spellchecker template',
      'searchreplace wordcount visualblocks visualchars code fullscreen insertdatetime media nonbreaking',
      'save table contextmenu directionality emoticons template paste textcolor'
    ],
    toolbar: 'insertfile undo redo | styleselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image table | preview media fullpage | forecolor backcolor template',

    menubar: 'newdocument, undo, redo, visualaid, cut, copy, paste, selectall, bold, italic, underline, strikethrough, subscript, superscript, removeformat, formats insert',

    templates: [
    {title: 'Simple', description: 'Simple Template', content: '<h2>Here is a test</h2><p>Your content...</p>'},
    {title: 'Custom', description: 'Some custom template', content: '<p>A very custom template...</p>'}
  ]
  });

  // Should likely get file name from LTI...
  fileName = 'contents_demo.html';
  //Fetch data from GitHub
  $.ajax({
    url: "https://api.github.com/repos/byuitechops/content_editor_v2/contents/" + fileName,
    context: document.body
  }).done(function(value) {
    console.log('data', value);
    fileName = value.name;
		file_sha = value.sha;
		file_path = value.path;
    $.ajax({
      url: value.download_url,
      context: document.body
		}).done(function(result) {
      // Update title of page with fileName
			$('#fileName_title').html(fileName);
      // Set tinymce content to that of the file
      tinymce.activeEditor.setContent(result);
    });
  }).fail(function() {
    console.log( "Error" );
  });

  //Setting active link for Nav links
  function updateActiveLink(selection, hideEditor, headerLabel) {
    $('.mdl-navigation__link').removeClass('activeLink');
    $('#' + selection + '').addClass('activeLink');
    if (hideEditor) {
      $('.editorContainer').hide();
      $('.contentContainer').show();
      $('.additionalContent').html('<h4>' + headerLabel + '</h4>');
    } else {
      $('.contentContainer').hide();
      $('.editorContainer').show();
    }
  }

  function showToast(successful) {
    if (successful){
      $('#toastMsg').text("Successfully saved");
    }else{
      $('#toastMsg').text("Error saving file");
    }
    $('#demo-toast').show();
    setTimeout(function(){
      $('#demo-toast').hide();
      $('#toastMsg').innerHTML = '';
    }, 1500);
  }

  function commitChanges(e) {
    // When implementing LTI piece you can have the user's private key assigned here:
      // NOTE: This is the Base-64 version of the user's private key
      // You MUST Base-64 encode the one obtained via the LTI, you can use 'btoa([private key to encode])'
    lti_user_private_key = 'Y2Ntcy1kZW1vOmVjYTZkYzVkNmRlNmYwMDc2MWFjOGJkZjAwMTE2NTA4M2RhNjMxZjE=';
    var encoded_file_content = btoa(tinymce.activeEditor.getContent());
    var commitMsg = $('#commitMsg').val();

    // AJAX data must be a JSON string, so assigning to a variable to take care of that later
    var data = {"path": file_path, "sha": file_sha, "message": commitMsg, "content": encoded_file_content};
    var settings = {
      "async": true,
      "crossDomain": true,
      "url": "https://api.github.com/repos/byuitechops/content_editor_v2/contents/" + file_path,
      "method": "PUT",
      "headers": { "authorization": "Basic " + lti_user_private_key},
      "data": JSON.stringify(data)
    }

    $.ajax(settings).done(function (response) {
      console.log(response);
    }).fail(function(error){
      showToast(false);
      console.log("Commiting File Failed: ", error.responseJSON);
    }).done(function(result) {

      console.log('Successfully Commited: ', result);
      showToast(true);
    });
  }
  // ------- BUTTON CLICK LISTENERS -------
  $('#edit').click(function(e){
    e.preventDefault();
    updateActiveLink('edit', false);
  });
  $('#settings').click(function(e){
    e.preventDefault();
    updateActiveLink('settings', true, 'Settings');
    // Example of inserting content to additionalContent container for 'Settings' page
    $('.additionalContent').append("<p><b>Note:</b> This will provide various settings changes.</p>");
  });
  $('#save').click(function(e){
    e.preventDefault();
    updateActiveLink('save', true, 'Save');
    var commitMsgCode = '<div class="mdl-textfield mdl-js-textfield commitContainer"><label class="labelMsg" for="commitMsg">Reason for change</label><textarea class="mdl-textfield__input commitField" type="text" rows="4" id="commitMsg">Made changes to ' + fileName + '</textarea></div><br /><button class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored" id="commitSave">Save</button>';
    $('.additionalContent').append(commitMsgCode);
    $('#commitSave').on('click', commitChanges);
  });
  $('#history').click(function(e){
    e.preventDefault();
    updateActiveLink('history', true, 'History');

    // Fetch versions and insert them into the additionalContent container
    $.get("https://api.github.com/repos/byuitechops/content_editor_v2/commits", function(data){
    }).done(function(data) {
      var commitTable;
      commitTable = "<p><b>Note:</b> This will also provide a link to see changes made in each previous version.</p>";
      $.each(data, function( index, value ) {

        var author = data[index].commit.author.name;
        var date = data[index].commit.author.date;
        var message = data[index].commit.message;

        //Convert date format
        var newDate = moment(date).format("ddd MMM Do 'YY (h:mm:ss a)");

        if (index == 0) {
          commitTable += "<table class='mdl-data-table mdl-js-data-table mdl-data-table--selectable mdl-shadow--2dp versionTable'><tr><th class='mdl-data-table__cell--non-numeric'>Author</th><th class='mdl-data-table__cell--non-numeric'>Date</th><th class='mdl-data-table__cell--non-numeric'>Message</th></tr>";
        }
        commitTable += "<tr><td class='mdl-data-table__cell--non-numeric'>" + author + "</td><td>" + newDate + "</td><td>" + message + "</td></tr>";
        if (index == data.length) {
          commitTable += "</table>";
        }
      });
      $('.additionalContent').append(commitTable);
    });
  });
}
