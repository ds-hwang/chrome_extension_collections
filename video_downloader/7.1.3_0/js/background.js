
window.addEventListener( "load", function(){
	
	fvdSingleDownloader.Media.init();
	fvdSingleDownloader.MainButton.refreshMainButtonStatus();
	
	if( fvdSingleDownloader.Utils.isVersionChanged() && !fvdSingleDownloader.noWelcome )	{
		var url = null;

		if( fvdSingleDownloader.noYoutube ) 	{
			
			if (fvdSingleDownloader.Prefs.get("install_time") == 0)  {
				//url = "http://fvd-downloader.everhelper.me/";
				url = "http://www.fvddownloader.com/";
			}
			else {
				//url = "http://www.fvddownloader.com/";
			}			
			
		}	
		else {
			
			if (fvdSingleDownloader.Prefs.get("install_time") == 0) 	{
				url = "http://fvdmedia.com/to/s/welcome_chrome/";
				
			}
			else	{
				//url = "http://www.fvddownloader.com/";
				
			}			
		}	
		
		if( url )	{
			chrome.tabs.create({
						url: url,
						active: true
					});			
		}

	}
	
	if( fvdSingleDownloader.Prefs.get( "install_time" ) == 0 )	{
		fvdSingleDownloader.Prefs.set( "install_time", new Date().getTime() )
	}
	
	// устанавливаем страницу при удаление
	chrome.runtime.setUninstallURL("http://fvdmedia.com/to/s/dwunstl");
	
}, false );

// ------------------------------------
chrome.management.getAll(function(extensions){

        for (var i in extensions) {
//            if (extensions[i].enabled) 	{
				if ( extensions[i].name.indexOf("FVD Suggestions") != -1) {
//console.log(extensions[i]);
					if ('MainButton' in fvdSingleDownloader) {
						fvdSingleDownloader.MainButton.isGtaSuggestion = true;
					}	
				}	
				if ( extensions[i].name.indexOf("Smart Pause for YouTube") != -1) {
					if ('MainButton' in fvdSingleDownloader) {
						fvdSingleDownloader.MainButton.isSmartPause = true;
					}	
				}	
//            }
        }
		
});


// ---------------------------------------- ОПЦИИ  --------------------------
function display_settings(  )  {

	chrome.tabs.query( 	{
							url: chrome.extension.getURL( "/options.html" )
						}, function( tabs ){

									if( tabs.length > 0 )
									{
										foundTabId = tabs[0].id;
										chrome.tabs.update( foundTabId, {
																		active: true
																		} );
									}
									else
									{
										chrome.tabs.create( {	active: true,
																url: chrome.extension.getURL("/options.html")
															}, function( tab ){ }
														);
									}
					} );
}
	
// ------------------------------------


