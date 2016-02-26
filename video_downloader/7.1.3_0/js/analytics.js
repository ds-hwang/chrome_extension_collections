var _gaq = [];

(function() {
  var SEND_REPORT_EVERY = 24*3600*1000, // 24 hours
      ANALYTICS_CODE = "UA-52981568-1";      

  /** load google analytics **/
  _gaq.push(['_setAccount', ANALYTICS_CODE]);  
  (function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = 'https://ssl.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
  })();
  
  // initialize analytics
  
  function setLastAnalyticsTime() {
    localStorage["_analytics_last_time"] = new Date().getTime();
  }
  
  function getLastAnalyticsTime() {
    var v = localStorage["_analytics_last_time"];
    v = parseInt(v);
    if(isNaN(v)) {
      v = 0;
    }
    return v;
  }  
  
  // check need send analytic report once per minute
  setInterval(function() {
    var lastSendTime = getLastAnalyticsTime(),
        now = new Date().getTime();
    if(now - lastSendTime > SEND_REPORT_EVERY) {
      _gaq.push(['_trackPageview']);      
      setLastAnalyticsTime();
    }
  }, 60000);
})();

