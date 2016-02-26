/* Linkify all the URLs in the revision descriptions. */
function linkify_comments() {
  var comments = document.getElementsByClassName('comments');
  if (!comments || !comments.length)
    return;
  for (var i = 0; i < comments.length; ++i) {
    var comment = comments[i];
    comment.innerHTML = comment.innerHTML.replace(
      /https?:\/\/[.a-zA-Z0-9\/]*/g,
      function(match, offset, original) {
        return "<a href='" + match + "'>" + match + "</a>";
      }
    );
  }
}

/* Linkify the list of files for the revision. */
function linkify_files() {
  /* Returns the div containing the revisions. This is somewhat flaky. */
  function getChangesList() {
    var comments = document.getElementsByClassName('comments');
    if (!comments || !comments.length)
      return null;

    var comment = comments[0];
    if (comment.parentNode.nodeName != "LI")
      return null;

    if (comment.parentNode.parentNode.nodeName != "OL")
      return null;
    return comment.parentNode.parentNode;
  }

  function processRevisionItem(rev) {
    /* Get the revision#. Use the fact that the revision is the only link in
     * this */
    var links = rev.getElementsByTagName('a');
    if (!links || !links.length)
      return;
    var l = links[0];
    if (!l.innerHTML.match(/^[0-9]+$/))
      return;
    var revision = l.innerHTML;

    var files = rev.getElementsByTagName('li');
    for (var i = 0; i < files.length; ++i) {
      var filename = files[i].innerText;
      var a = document.createElement('a');
      a.href = 'http://src.chromium.org/viewvc/chrome/trunk/src/' +
        filename + '?r1=' + revision + '&r2=' + (revision - 1) +
        '&pathrev=' + revision;
      a.innerHTML = filename;
      files[i].innerHTML = '';
      files[i].appendChild(a);
    }
  }

  var list = getChangesList();
  if (!list)
    return;
  list.classList.add('revisions');

  var lis = list.getElementsByTagName('li');
  for (var i = 0; i < lis.length; ++i) {
    processRevisionItem(lis[i]);
  }
}

function format_time(seconds) {
  var hours = parseInt(seconds / 3600);
  seconds -= hours * 3600;
  var minutes = parseInt(seconds / 60);
  seconds = parseInt(seconds - minutes * 60);
  var s = '';
  if (hours)
    s = hours + 'h ';
  if (hours || minutes) {
    if (hours && minutes < 10)
      s += '0';
    s += minutes + 'm ';
    if (seconds < 10)
      s += '0';
  }
  s += parseInt(seconds) + 's';
  return s;
}

function show_blamelist() {
  var div = document.getElementsByClassName('column');
  if (!div || !div.length)
    return;
  div = div[0];

  /* Collect the builds linked on this page. */
  var links = {};
  var request_path = null;
  var params = [];
  var links = div.getElementsByTagName('a');
  for (var i = 0; i < links.length; ++i) {
    var link = links[i];
    if (!link.innerText.match(/^#?[0-9]+$/))
      continue;

    var match = link.href.match(
        '/p/([^/]*)/builders/([^/]*)/builds/([0-9]+)/?$');
    if (!match)
      continue;
    links[match[3]] = link;
    if (!request_path) {
      request_path = [document.location.origin, 'p', match[1], 'json',
                      'builders', match[2], 'builds'].join('/');
    }
    params.push('select=' + match[3]);
  }
  request_path += '?' + params.join('&');

  var request = new XMLHttpRequest();
  request.onload = function() {
    var all_data = request.response;
    if (request.responseType != 'json')
      all_data = JSON.parse(request.responseText);
    if (!all_data)
      return;

    for (var build in all_data) {
      var data = all_data[build];
      if (!data.blame)
        continue;
      var link = links[build];
      if (!link)
        continue;
      var blame = data.blame.join(', ');
      var author = document.createElement('span');
      author.classList.add('author');
      author.innerHTML = blame;

      var error = null;
      if (data.steps) {
        for (var i = 0; i < data.steps.length; ++i) {
          var step = data.steps[i];
          if (step.results && step.results[0] == 2 && step.logs) {
            /* This is an error */
            if (!error) {
              error = document.createElement('ul');
              error.classList.add('errorlinks');
            }

            var current = document.createElement('ul');
            current.classList.add('errorcategory');
            for (var j = 0; j < step.logs.length; ++j) {
              var log = step.logs[j];
              var a = document.createElement('a');
              a.href = log[1];
              a.innerHTML = log[0];
              var li = document.createElement('li');
              li.appendChild(a);
              current.appendChild(li);
            }
            var li = document.createElement('li');
            li.innerHTML = step.name;
            li.appendChild(current);
            error.appendChild(li);
          }
        }
      }

      if (link.parentNode.nodeName == 'LI') {
        link.parentNode.appendChild(author);
        if (error)
          link.parentNode.appendChild(error);
      } else if (link.parentNode.nodeName == 'TD') {
        var row = link.parentNode.parentNode;

        // See if there is any info about the time.
        if (data.times) {
          var seconds = data.times[1] - data.times[0];
          cell = row.insertCell(-1);
          cell.classList.add('custom-cell');
          cell.classList.add('nowrap');
          cell.innerHTML = format_time(seconds);
        }

        var cell = row.insertCell(-1);
        cell.classList.add('custom-cell');
        cell.appendChild(author);

        if (error) {
          cell = row.insertCell(-1);
          cell.classList.add('custom-cell');
          cell.appendChild(error);
        }
      }
    }
  }
  request.open("GET", request_path, true);
  request.setRequestHeader("Cache-Control", "no-cache");
  request.send();
}

var path = document.location.pathname;
if (path.match('^/p/[^/]*/builders/[^/]*/builds/[0-9]+/?$')) {
  /* This is for a the details page of a specific build. */
  linkify_comments();
  linkify_files();
} else if (path.match('^/p/[^/]*/builders/[^/]*/?$')) {
  /* This is for the summary page of a builder. */
  show_blamelist();
}
