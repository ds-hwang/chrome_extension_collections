function loadFiles(n,t){var u,r,f,i;if(t&&(u=t,u.gLocalFilesArray||(u.gLocalFilesArray=[]),n&&n.items&&n.items.length>0))for(i=0;i<n.items.length;i++)if(r=n.items[i].entry,r&&r.isFile){for(f=n.items[i].type,console.log("adding",r.name,f),i=0;i<u.gLocalFilesArray.length;++i)if(u.gLocalFilesArray[i].fullPath==r.fullPath)return;r.isLocal=!0;r.mimeType=f;u.gLocalFilesArray.push(r)}}function checkBetaProgram(n,t){if(n){var i=(new Date).getTime(),r=chrome.i18n.getUILanguage?chrome.i18n.getUILanguage()=="uk":!1;betaActivated=n;betaExtended=t;chromecastMode=!0;a=betaActivated&&(r||i<n)}}function loadState(n){try{chrome.storage.sync.get({betaProgramExpirationDate:0,betaProgramProlongationDate:0},function(t){t&&checkBetaProgram(t.betaProgramExpirationDate,t.betaProgramProlongationDate);chrome.storage.local.get("lastApplicationState",function(t){n&&n(t.lastApplicationState)})})}catch(t){}}function onStorageChange(n,t){if(t=="sync"&&n.betaProgramExpirationDate){var i=n.betaProgramProlongationDate&&n.betaProgramProlongationDate.oldValue,r=n.betaProgramProlongationDate&&n.betaProgramProlongationDate.newValue;n.betaProgramExpirationDate.oldValue&&(i||!r)&&n.betaProgramExpirationDate.newValue>n.betaProgramExpirationDate.oldValue?(checkBetaProgram(n.betaProgramExpirationDate.oldValue,i),chrome.storage.onChanged.removeListener(onStorageChange),chrome.storage.sync.set({betaProgramExpirationDate:n.betaProgramExpirationDate.oldValue},function(){console.log("Expiration Date reverted!");chrome.storage.onChanged.addListener(onStorageChange)})):checkBetaProgram(n.betaProgramExpirationDate.newValue,r)}}var gLastState=null,contentWindow;self.console={info:function(){},log:function(){},debug:function(){},warn:function(){},error:function(){}};contentWindow=null;chromecastMode=!0;a=!1;betaActivated=!0;betaExtended=!1;launchInTab=function(n){gLastState="tab";var t=this;contentWindow=null;this.createTab("player.html",function(i){i&&(i.__interactive=n||!(t.launchData&&t.launchData.items&&t.launchData.items.length>0),i.gCastMode=chromecastMode?"tab":"none",loadFiles(t.launchData,i),i.addEventListener("beforeunload",function(){t.contentWindow=null}),i.addEventListener("load",function(){t.contentWindow=i}))})};launchInDesktop=function(n){gLastState="desktop";var t=this;chrome.app.window.create("player.html",{id:"Video Player",minWidth:320,minHeight:200,state:"maximized",width:Math.min(1280,window.screen.width),height:Math.min(720,window.screen.height)},function(i){i&&i.contentWindow&&(i.contentWindow.__interactive=n||!(t.launchData&&t.launchData.items&&t.launchData.items.length>0),i.contentWindow.gCastMode=chromecastMode?"desktop":"none",loadFiles(t.launchData,i.contentWindow),i.onClosed.addListener(function(){contentWindow=null}),i.contentWindow.addEventListener("load",function(){contentWindow=i.contentWindow}))})};createTab=function(n,t){var i=this;chrome.app.window.create("empty.html",{id:"Dummy",state:"minimized",hidden:!0},function(i){t&&t(window.open(n));setTimeout(function(){i.contentWindow.close()},1e3)})};chrome.app.runtime.onLaunched.addListener(function(n){this.launchData=n;!contentWindow||contentWindow.closed?loadState(function(n){console.log("launching app with state ",n);chromecastMode&&n&&(n.castMode=="tab"||n.castMode!="desktop")?launchInTab():launchInDesktop()}):(contentWindow.focus(),contentWindow.postMessage({message:"new_window"},"*"),loadFiles(n,contentWindow),contentWindow.playLocalFile(!0))});chrome.runtime.onMessage.addListener(function(n,t,i){if(console.info("message received from player: "+n.message),n&&n.message)switch(n.message){case"switch_tab":i({farewell:"close"});setTimeout(function(){loadState(function(){chromecastMode?launchInTab(!0):launchInDesktop(!0)})},100);break;case"switch_desktop":i({farewell:"close"});setTimeout(function(){loadState(function(){launchInDesktop(!0)})},100)}});chrome.storage.onChanged.addListener(onStorageChange);chrome.app.window.onClosed.addListener(function(){console.log("closed window")});chrome.app.runtime.onRestarted.addListener(function(){});chrome.runtime.onStartup.addListener(function(){});chrome.runtime.onInstalled.addListener(function(){});chrome.runtime.onSuspend.addListener(function(){});chrome.runtime.onSuspendCanceled.addListener(function(){})