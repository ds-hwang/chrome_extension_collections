var XSRFToken_ = null;
const XSRFFailure = '[ error ]';

function RequestXSRF(success, failure) {
  if (XSRFToken_) {
    if (XSRFToken_ == XSRFFailure)
      failure();
    else
      success(XSRFToken_);
    return;
  }

  console.log('Fetching XSRF token');
  var x = new XMLHttpRequest();
  x.open('GET', '/xsrf_token', true);
  x.setRequestHeader('X-Requesting-XSRF-Token', '');
  x.onload = function() {
    XSRFToken_ = x.responseText;
    success(x.responseText);
  };
  x.onerror = function() {
    XSRFToken_ = XSRFFailure;
    failure();
  };
  x.send(null);
}
