/** Name of the div that contains the user-popup. */
const USER_POPUP_ID = 'userPopupDiv';

function $(id) {
  return document.getElementById(id);
}

function HasClass(node, cls) {
  var list = node.classList;
  for (var i = 0; i < list.length; ++i)
    if (list[i] == cls)
      return true;
  return false;
}

function GetJSONData(url, callback) {
  var request = new XMLHttpRequest();
  request.onload = function() {
    var all_data = request.response;
    try {
      if (request.responseType != 'json')
        all_data = JSON.parse(request.responseText);
    } catch (e) {
      console.log(e);
      all_data = null;
    }
    if (!all_data)
      return;

    callback(all_data);
  }
  request.open("GET", url, true);
  request.send();
}

function GetParentPath(path) {
  if (path == '/')
    return null;
  var splits = path.match("(.*)/([^/]*)");
  if (splits && splits.length > 1)
    return splits[1];
  return '/';
}

function SanitizePerFilePattern(pattern) {
  /* per-file patterns are the dumb kind of regexes. This function converts
   * those into regex patterns that can be used in JS.
   *
   * There is probably a better way of doing this.
   */
  return pattern.replace(/\*/g, '.*').replace(/\(/g, '\(').replace(/\)/g, '\)');
}

function GetCSSClassForStatus(cls) {
  switch (cls) {
    case UNKNOWN:
      return 'unknown';
    case NO_OWNER:
      return 'no-owner';
    case ERROR:
      return 'owner-error';
    case OWNER_LGTM:
      return 'owner-lgtm';
    case OWNER_REVIEWER:
      return 'owner-reviewer';
    case OWNER_CREATOR:
      return 'owner-creator';
  }
  return null;
}

////////////////////////////////////////////////////////////////////////////////
// Overriden some functions from rietveld.

// Make sure the userinfo popups show up in the right position.
M_getElementPosition = function(obj) {
  var curleft = 0;
  var curtop = 0;
  if (obj.offsetParent) {
    do {
      curleft += obj.offsetLeft - obj.scrollLeft;
      curtop += obj.offsetTop - obj.scrollTop;
    } while (obj = obj.offsetParent);
    curtop += document.body.scrollTop;
  }
  return [curleft, curtop];
};

////////////////////////////////////////////////////////////////////////////////
// Owner

// |Owner| doesn't have enough data about who the owners are for the path (and
// hasn't sent any request to the server).
const OWNER_STATE_UNKNOWN = 1;
// |Owner| has requested the server to send information about owners.
const OWNER_STATE_REQUESTED = 2;
// |Owner| knows who the actual owners are.
const OWNER_STATE_KNOWN = 3;

/** A representation of an OWNERS file. */
function Owner() {
  this.noparent = false;
  this.state = OWNER_STATE_UNKNOWN;
  this.owners = [];
  this.perfiles = {};
  this.cached_owners = {};
  this.cached_noparent = {};
}

Owner.prototype.ProcessFile = function(content) {
  this.state = OWNER_STATE_KNOWN;
  var lines = content.split('\n');
  lines.forEach(function(line) {
    var m = line.match('([^#]*)(#.*)?');
    if (!m || m.length < 2)
      return;
    line = m[1].trim();
    this.ProcessLine(line);
  }, this);
}

Owner.prototype.ProcessLine = function(line) {
  if (line == "set noparent") {
    this.noparent = true;
    return;
  }

  var perfile = line.match('^per-file (.*)=(.*)$');
  if (perfile) {
    var file = perfile[1];
    if (!(file in this.perfiles))
      this.perfiles[file] = new Owner();
    this.perfiles[file].ProcessFile(perfile[2]);
  } else if (line.length > 0) {
    this.owners.push(line);
  }
}

Owner.prototype.FindOwnersForFile = function(file, include_perfiles) {
  if (this.state != OWNER_STATE_KNOWN)
    return [];
  if (file in this.cached_owners)
    return this.cached_owners[file];

  var owners = this.owners;
  if (include_perfiles) {
    for (pattern in this.perfiles) {
      if (file.match(SanitizePerFilePattern(pattern))) {
        if (this.perfiles[pattern].noparent) {
          /* per-file can have 'set noparent'. Reset the owners in that case. */
          owners = [];
        }

        owners = owners.concat(this.perfiles[pattern].FindOwnersForFile(file, false));
      }
    }
  }

  this.cached_owners[file] = owners;
  return owners;
}

Owner.prototype.IsNoParentForFile = function(file) {
  if (this.state != OWNER_STATE_KNOWN)
    return false;
  if (this.noparent)
    return true;
  if (file in this.cached_noparent)
    return this.cached_noparent[file];

  for (pattern in this.perfiles) {
    if (file.match(SanitizePerFilePattern(pattern)) &&
        this.perfiles[pattern].IsNoParentForFile(file)) {
      /* per-file can have 'set noparent'. */
      this.cached_noparent[file] = true;
      return true;
    }
  }
  this.cached_noparent[file] = false;
  return false;
}

Owner.prototype.GetData = function(url, callback) {
  if (this.state != OWNER_STATE_UNKNOWN) {
    callback(null);
    return;
  }

  var request = new XMLHttpRequest();
  this.state = OWNER_STATE_REQUESTED;
  request.onreadystatechange = function() {
    if (request.readyState != 4)
      return;
    if (request.status == 200) {
      var response = request.responseText;
      try {
        /* The response comes in as base64-encoded data. So we need to decode it
         * first. */
        response = atob(response);
      } catch(e) {}
      this.ProcessFile(response);
    } else {
      this.state = OWNER_STATE_KNOWN;
    }

    callback(request);
  }.bind(this);

  try {
    request.open("GET", url, true);
    request.send();
  } catch (e) {
    callback(null);
  }
};

////////////////////////////////////////////////////////////////////////////////
// Issue

const OWNER_LGTM = '+';
const OWNER_REVIEWER = '|';
const OWNER_CREATOR = 'o';
const ERROR = 'e';
const NO_OWNER = 'x';
const UNKNOWN = '?';

const SVN_DEFAULT_BASE = 'https://src.chromium.org/chrome/trunk/src';
const DEFAULT_BASE_CHROMIUM = 'https://chromium.googlesource.com/chromium/src/+/master';
const DEFAULT_BASE_BLINK = 'https://chromium.googlesource.com/chromium/blink/+/master';
const DEFAULT_BASE_SKIA = 'https://skia.googlesource.com/skia/+/master';
const DEFAULT_BASE_MOJO = 'https://chromium.googlesource.com/external/mojo/+/master';
const DEFAULT_BASE_V8 = 'https://chromium.googlesource.com/v8/v8/+/master';

function Issue(num, patchset) {
  this.num = num;

  this.creator = null;
  this.base = null;

  this.patchset = patchset ? patchset : null;

  /* The number of pending OWNER file requests. */
  this.pending_requests = 0;

  /* The list of reviewers in the issue. */
  this.reviewers = [];

  /* The list of files in the latest patchset. */
  this.files = [];

  /* The list of <a> nodes for the files in this patchset. */
  this.filenodes = [];

  /* Flag indicating the status of each file in |this.files|.
   */
  this.fileflags = {};

  /* The list of people who have lgtm'ed this CL. */
  this.lgtms = [];

  this.owners = {};

  this.suggested_owners = {};

  this.mutationObserver =
      new MutationObserver(this.UserInfoAttributeChanged.bind(this));
  this.user_popup_for = null;

  /* reviewer-email => review-score
     review-score is 0 when unknown.
                  is '...' when a request has been made to retrieve the score
                           (or when the request has failed for some reason).
  */
  this.reviewer_scores = {};
}

Issue.prototype.Start = function() {
  /* First, get the patchset and the list of reviewers. */
  var url = '/api/' + this.num;
  if (this.patchset)
    url += '/#ps' + this.patchset;
  url += '/?messages=true';
  GetJSONData(url, function(json) {
    var project = json['project'];
    if (project == 'chromium') {
      this.base = DEFAULT_BASE_CHROMIUM;
    } else if (project == 'blink') {
      this.base = DEFAULT_BASE_BLINK;
    } else if (project == 'skia') {
      this.base = DEFAULT_BASE_SKIA;
    } else if (project == 'mojo') {
      this.base = DEFAULT_BASE_MOJO;
    } else if (project == 'v8') {
      this.base = DEFAULT_BASE_V8;
    } else {
      this.base = json['base_url'];
      if (this.base.match('^svn://svn'))
        this.base = this.base.replace('svn://svn', 'https://src');
      else if (this.base.match(/\/blink/))
        this.base = DEFAULT_BASE_BLINK;
      else if (this.base.match('^svn://') || this.base.match('@'))
        this.base = DEFAULT_BASE_CHROMIUM;
    }
    this.creator = json['owner_email'];
    this.reviewers = json['reviewers'];

    if (!this.patchset) {
      var patchsets = json['patchsets'];
      this.patchset = patchsets[patchsets.length - 1];
    }

    this.ExtractLGTM(json['messages']);
    this.GetFilelist();
  }.bind(this));

  // Setup the file list in the patch.
  this.GetFileList();
}

Issue.prototype.ReportError = function(message) {
}

Issue.prototype.ExtractLGTM = function(messages) {
  this.lgtms = [];
  if (!messages)
    return;
  messages.forEach(function(message) {
    var sender = message['sender'];
    if (message['approval']) {
      var index = this.lgtms.indexOf(sender);
      if (index < 0)
        this.lgtms.push(sender);
    } else if (message['disapproval']) {
      var index = this.lgtms.indexOf(sender);
      if (index >= 0)
        this.lgtms.splice(index, 1);
    }
  }, this);
}

Issue.prototype.GetFilelist = function() {
  if (!this.patchset) {
    throw "Trying to get filelist for unknown patchset.";
  }

  var url = '/api/' + this.num + '/' + this.patchset;
  GetJSONData(url, function(json) {
    this.files = [];
    this.fileflags = {};

    var list = json['files'];
    for (file in list) {
      this.files.push(file);
      this.fileflags[file] = (this.base == null ? ERROR : UNKNOWN);
    }

    this.GetOWNERS();
    this.UpdateFilelist();
  }.bind(this));
}

Issue.prototype.GetOWNERS = function() {
  /* Get owner for all the files in the latest patchset. */
  var paths = {};
  this.files.forEach(function(file) {
    var path = GetParentPath(file);
    paths[path] = true;
  });

  this.owners = {};
  for (var path in paths) {
    var par = path;
    do {
      if (!(par in this.owners))
        this.owners[par] = new Owner();
    } while ((par = GetParentPath(par)) != null);
    this.GetOWNER(path);
  }
}

Issue.prototype.GetOWNER = function(path) {
  if (!path || !this.base)
    return;

  this.pending_requests++;

  var url_path = path;
  if (url_path == '/' || url_path == '')
    url_path = '';
  else
    url_path = '/' + url_path;
  var url = this.base + url_path + '/OWNERS?format=TEXT';
  this.owners[path].GetData(url, function(request) {
    --this.pending_requests;
    this.GetOWNER(GetParentPath(path));
    this.UpdateFilelist();
  }.bind(this));
}

Issue.prototype.GetOWNERSForFile = function(file) {
  var path = file;
  var owners = [];
  var first_path = GetParentPath(path);
  while ((path = GetParentPath(path)) != null) {
    var owner = this.owners[path];
    if (!owner)
      continue;

    if (owner.state == OWNER_STATE_UNKNOWN ||
        owner.state == OWNER_STATE_REQUESTED) {
      return [];
    }

    owners = owners.concat(owner.FindOwnersForFile(file, path == first_path));
    if (owner.IsNoParentForFile(file))
      break;
  }
  return owners;
}

Issue.prototype.UpdateFilelist = function() {
  this.suggested_owners = {};
  this.files.forEach(function(file) {
    var owners = this.GetOWNERSForFile(file);

    /* Now we have the list of owners for this file, the list of reviewers, and
     * the list of lgtms. Figure out the status of the file from ALL this
     * information.
     */

    var creator_is_owner = owners.indexOf(this.creator) >= 0;
    function IsAnOwner(owners, r) {
      return owners.indexOf(r) >= 0 || owners.indexOf('*') >= 0;
    }
    if (this.lgtms.some(function(r) { return IsAnOwner(owners, r); })) {
      this.SetFileFlag(file, OWNER_LGTM, creator_is_owner);
      return;
    }

    if (this.reviewers.some(function(r) { return IsAnOwner(owners, r); })) {
      this.SetFileFlag(file, OWNER_REVIEWER, creator_is_owner);
      return;
    }

    if (this.pending_requests == 0 && this.fileflags[file] == UNKNOWN)
      this.fileflags[file] = NO_OWNER;
    this.SetFileFlag(file, this.fileflags[file], creator_is_owner);

    if (creator_is_owner) {
      this.SetFileFlag(file, OWNER_CREATOR, creator_is_owner);
      return;
    }

    if (this.fileflags[file] == UNKNOWN || this.fileflags[file] == NO_OWNER) {
      owners.forEach(function(o) {
        if (!(o in this.suggested_owners))
          this.suggested_owners[o] = [];
        this.suggested_owners[o].push(file);
      }.bind(this));
    }
  }, this);

  this.UpdateSuggestedOwnerList();
}

Issue.prototype.GetFileList = function() {
  if (this.filenodes.length > 0)
    return this.filenodes;

  var add_cat = (window.location.hash == '#cat');
  var ps = this.patchset ? document.getElementById('ps-' + this.patchset)
                         : document.body;
  var list = ps.getElementsByClassName('issue-list')[0];
  var rows = list.getElementsByTagName('tr');
  for (var i = 0; i < rows.length; ++i) {
    if (rows[i].getAttribute('name') == 'patch') {
      var items = rows[i].cells[2].getElementsByClassName('noul');
      for (var j = 0; j < items.length; ++j) {
        this.filenodes.push(items[j]);
        items[j].setAttribute('butler-filepath', items[j].innerText.trim());
        items[j].classList.add('common');
        if (add_cat)
          items[j].classList.add('cat');
      }
    }
  }
  return this.filenodes;
}

Issue.prototype.SetFileFlag = function(file, flag, owner) {
  if (!(file in this.fileflags))
    return;
  var oldflag = this.fileflags[file];
  this.fileflags[file] = flag;

  // The file-list isn't used here. But call |GetFileList()| to make sure the
  // attributes get set on the <a> links.
  this.GetFileList();
  var item = document.querySelector('a[butler-filepath="' + file + '"]');
  if (item) {
    if (this.lgtms.length > 0)
      item.classList.add('has-lgtm');
    item.classList.remove(GetCSSClassForStatus(oldflag));
    item.classList.add(GetCSSClassForStatus(flag));
    item.classList.add('animate-border');
    if (owner)
      item.classList.add('self-owner');

    switch (flag) {
      case UNKNOWN:
      case NO_OWNER:
        item.title = 'No OWNER for this file in the reviewer list.';
        break;

      case ERROR:
        item.title = 'Unknown status';
        break;

      case OWNER_LGTM:
        item.title = 'An OWNER for this file has LGTMed the CL';
        break;

      case OWNER_REVIEWER:
        item.title = 'An OWNER for this file is in the reviewer list.';
        if (item.classList.contains('self-owner'))
          item.title += ' (The patch author is also an OWNER for this file)';
        break;

      case OWNER_CREATOR:
        item.title = 'The creator of this CL is an OWNER for this file.';
        break;
    }
  }
}

Issue.prototype.UpdateSuggestedOwnerList = function() {
  var div = $('butler-suggested-owners');
  if (!div) {
    div = document.createElement('div');
    div.id = 'butler-suggested-owners';

    var details = document.getElementsByClassName('issue_details_sidebar')[0];
    details.parentNode.insertBefore(div, details);
  }

  var owners = [];
  for (var owner in this.suggested_owners) {
    owners.push(owner);
  }

  owners.sort(function(a, b) {
    return this.suggested_owners[a].length > this.suggested_owners[b].length;
  }.bind(this));

  var ol = document.createElement('ul');
  owners.forEach(function(owner) {
    var li = document.createElement('li');
    var input = document.createElement('input');
    input.type = 'checkbox';
    input.owner = owner;
    input.classList.add('butler-owner');
    input.addEventListener('change', function() {
      this.UpdateFileListForSuggestedOwners();
    }.bind(this));
    li.appendChild(input);

    var label = document.createElement('label');

    var link = document.createElement('a');
    link.setAttribute('href', '/user/' + owner);
    link.setAttribute('onmouseover', "M_showUserInfoPopup(this)");
    link.textContent = owner;
    label.appendChild(link);

    li.appendChild(label);
    label.addEventListener('mouseover', function() {
      this.AddFileHighLightForOwner(owner);
      this.AddOwnerDetailsInPopup(owner);
    }.bind(this));
    label.addEventListener('mouseout', function() {
      this.RemoveFileHighLightForOwner(owner);
      this.RemoveOwnerDetailsInPopup(owner);
    }.bind(this));

    ol.appendChild(li);
  }.bind(this));

  div.innerHTML = '';
  div.appendChild(document.createElement('b')).textContent =
      'Owners: ';
  if (owners.length > 0) {
    div.appendChild(ol);

    var button = document.createElement('button');
    button.textContent = 'Add Reviewers';
    div.appendChild(button);
    button.addEventListener('click', function(event) {
      RequestXSRF(
        function(token) {
          new Overlay('/' + this.num + '/publish',
                      this.AddReviewerFrameLoaded.bind(this),
                      null);
        }.bind(this), function() {
          alert('You cannot add reviewers. You are not signed in.');
        }
      );
    }.bind(this));
  } else {
    div.appendChild(document.createTextNode(
          'Assigned reviewers already OWN all files in this patch!'));
  }
}

Issue.prototype.GetSelectedSuggestedOwners = function() {
  var owners = [];
  var inputs = document.getElementsByClassName('butler-owner');
  for (var i = 0; i < inputs.length; ++i) {
    var input = inputs[i];
    if (input.checked)
      owners.push(input.owner);
  }
  return owners;
}

Issue.prototype.UpdateFileListForSuggestedOwners = function() {
  var selected_owners = this.GetSelectedSuggestedOwners();
  var items = this.GetFileList();
  for (var i = 0; i < items.length; ++i) {
    var item = items[i];
    item.classList.remove('butler-selected-suggested-owner');

    var f = item.innerText.trim();
    if (this.fileflags[f] != UNKNOWN && this.fileflags[f] != NO_OWNER)
      continue;

    var owners = this.GetOWNERSForFile(f);
    if (owners.some(function(x) { return selected_owners.indexOf(x) >= 0; })) {
      item.classList.add('butler-selected-suggested-owner');
    }
  }
}

Issue.prototype.AddFileHighLightForOwner = function(owner) {
  var items = this.GetFileList();
  for (var i = 0; i < items.length; ++i) {
    var item = items[i];
    var f = item.innerText.trim();
    var owners = this.GetOWNERSForFile(f);
    if (owners.indexOf(owner) != -1)
      item.classList.add('butler-highlight-file');
    else
      item.classList.remove('butler-highlight-file');
  }
}

Issue.prototype.RemoveFileHighLightForOwner = function(owner) {
  var items = this.GetFileList();
  for (var i = 0; i < items.length; ++i) {
    var item = items[i];
    item.classList.remove('butler-highlight-file');
  }
}

/** Adds the list of directories in this patch owned by |owner| in the
 * userinfo-popup. */
Issue.prototype.AddOwnerDetailsInPopup = function(owner) {
  this.user_popup_for = owner;
  this.mutationObserver.disconnect();

  var div = $(USER_POPUP_ID);
  if (!div)
    return;
  this.mutationObserver.observe(div, { attributes: true });
}

Issue.prototype.RemoveOwnerDetailsInPopup = function(owner) {
  this.user_popup_for = null;
}

/** Callback from the mutation-observer for the userinfo-popup. */
Issue.prototype.UserInfoAttributeChanged = function(mutations) {
  if (!this.user_popup_for)
    return;

  if ($(USER_POPUP_ID).style.display == 'none')
    return;

  var header = document.createElement('b');
  header.textContent = 'Owner of: ';
  $(USER_POPUP_ID).appendChild(header);

  var details = document.createElement('ul');
  for (var path in this.owners) {
    var owner = this.owners[path];
    if (owner.owners.indexOf(this.user_popup_for) >= 0) {
      var p = document.createElement('li');
      p.textContent = path;
      details.appendChild(p);
    } else {
      var perfiles = [];
      for (var perfile in owner.perfiles) {
        var o = owner.perfiles[perfile];
        if (o.owners.indexOf(this.user_popup_for) >= 0)
          perfiles.push(perfile);
      }
      if (perfiles.length > 0) {
        var p = document.createElement('li');
        p.textContent = path + ' (perfile):';

        // Create a sublist for per-files.
        var sublist = document.createElement('ul');
        p.appendChild(sublist);
        perfiles.forEach(function(perfile) {
          var sub = document.createElement('li');
          sub.textContent = perfile;
          sublist.appendChild(sub);
        });

        details.appendChild(p);
      }
    }
  }

  $(USER_POPUP_ID).appendChild(details);

  // Add review-score too in the info box.
  header = document.createElement('b');
  header.textContent = 'Review score: ';
  $(USER_POPUP_ID).appendChild(header);

  var scoreElement = document.createTextNode('');
  $(USER_POPUP_ID).appendChild(scoreElement);
  if (this.user_popup_for in this.reviewer_scores) {
    var score = parseFloat(this.reviewer_scores[this.user_popup_for]);
    if (!isNaN(score)) {
      // |score| is an actual score.
      scoreElement.textContent = score;
      return;
    }
  } else {
    var reviewer = this.user_popup_for;
    this.reviewer_scores[reviewer] = '...';
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
      if (request.readyState != 4)
        return;
      if (request.status != 200)
        return;
      try {
        var info = JSON.parse(request.responseText);
        if (info && 'score' in info) {
          var score = parseFloat(info.score);
          if (!isNaN(score)) {
            this.reviewer_scores[reviewer] = score.toFixed(2);
            scoreElement.textContent = score.toFixed(2);
          }
        }
      } catch (e) {
      }
    }.bind(this);
    try {
      var url = '/user/' + reviewer + '/stats_json/30';
      request.open("GET", url, true);
      request.send();
    } catch (e) {
    }
  }

  scoreElement.textContent = '...';
}

/** Callback for when the 'Add reviewer' page is loaded in the overlay. */
Issue.prototype.AddReviewerFrameLoaded = function(doc) {
  var selected_owners = this.GetSelectedSuggestedOwners();
  if (!selected_owners.length)
    return;

  var reviewers = doc.getElementById('id_reviewers');
  if (reviewers) {
    if (reviewers.value.length > 0)
      reviewers.value += ', ';
    reviewers.value += selected_owners.join(', ');
  }

  // If only a single new reviewer is being added, and there aren't any existing
  // reviewer, then it's likely that the reviewer is expected to review the
  // whole CL. Don't pre-populate a review-request message in this case.
  if (selected_owners.length == 1 && this.reviewers.length == 0)
    return;

  var msg = doc.getElementById('id_message');
  if (msg) {
    const REVIEW_REQUEST = ': Please review changes in \n\n';
    msg.value = selected_owners.join(REVIEW_REQUEST) + REVIEW_REQUEST;
    msg.focus();
  }
}

////////////////////////////////////////////////////////////////////////////////
// Overlay

/** Creates a document overlay, containing an iframe that loads |url|. |loadcb|
 * is invoked when the page is done loading.
 */
function Overlay(url, loadcb, donecb) {
  this.url = url;

  this.overlay = document.createElement('div');
  this.overlay.setAttribute('id', 'overlay');
  this.overlay.addEventListener('click', function(event) {
    event.preventDefault();
    this.close();
  }.bind(this));

  var iframe = document.createElement('iframe');
  iframe.setAttribute('src', url);
  iframe.setAttribute('id', 'overlay-iframe');
  this.overlay.appendChild(iframe);
  document.body.appendChild(this.overlay);

  this.frame = window.frames['overlay-iframe'];
  this.frame.contentDocument.body.onload = function() {
    loadcb(this.frame.contentDocument);

    this.frame.contentDocument.body.onunload = function() {
      window.setTimeout(function() {
        if (this.overlay) {
          this.close();
          window.location.reload();
        }
      }.bind(this), 0);
    }.bind(this);
  }.bind(this);
}

Overlay.prototype.close = function() {
  if (this.overlay) {
    this.overlay.parentNode.removeChild(overlay);
    this.overlay = null;
  }
}

function ExtractIssueNum() {
  var path = document.location.pathname;
  var match = path.match('^/([0-9]+)/?$');
  return match ? match[1] : null;
}

function ProcessHash(num) {
  /** For now, only support the latest patchset. For earlier patchsets, I am not
   * sure if it makes sense to do anything. Let them be. */
  return;
  var hash = window.document.location.hash;
  var match = hash.match('^#ps([0-9]+)$');
  if (!match)
    return;

  var issue = new Issue(num, match[1]);
  issue.Start();
}

function SetupHelp() {
  var help_container = document.querySelector('#help');
  help_container.appendChild(document.createElement('hr'));

  var help = document.createElement('div');
  var title = document.createElement('div');
  title.textContent = 'Chromite-Butler Settings';
  title.classList.add('butler-help-heading');
  help.appendChild(title);
  help.appendChild(document.createElement('hr'));

  var table = document.createElement('table');
  help.appendChild(table);

  var row = document.createElement('tr');
  table.appendChild(row);
  row.appendChild(document.createElement('td'));

  var th = document.createElement('th');
  th.textContent = 'Legend';
  row.appendChild(th);

  var legends = [
    [ ['unknown'], "The extension doesn't yet know who owns this file." ],
    [ ['no-owner'], 'None of the assigned reviewers is an owner for this file.' ],
    [ ['no-owner', 'butler-selected-suggested-owner'],
        'One of the owners selected from the owner-list on the left is an owner for this file.'],
    [ ['owner-lgtm'], 'An owner for this file has LGTMed this CL.' ],
    [ ['owner-reviewer'], 'An owner for this file is in the reviewer list.' ],
    [ ['owner-reviewer', 'self-owner'],
        'An owner for this file is in the reviewer list. The CL author is also ' +
        ' an owner for this file.' ],
    [ ['owner-creator'], 'The CL author is an owner for this file.' ],
    [ ['owner-creator', 'has-lgtm'],
        'The CL author is an owner for this file, and a non-owner reviewer has LGTMed the CL.' ]
  ];
  legends.forEach(function(legend) {
    var row = document.createElement('tr');
    var td = document.createElement('td');
    var div = document.createElement('div');
    div.classList.add('common');
    legend[0].forEach(function(l) { div.classList.add(l); });
    td.appendChild(div);
    row.appendChild(td);

    td = document.createElement('td');
    td.textContent = legend[1];
    row.appendChild(td);

    table.appendChild(row);
  });

  help_container.appendChild(help);
}

var num = ExtractIssueNum();
if (num) {
  var issue = new Issue(num);
  issue.Start();

  SetupHelp();

  ProcessHash(num);
  window.onhashchange = function() {
    ProcessHash(num);
  }
}
