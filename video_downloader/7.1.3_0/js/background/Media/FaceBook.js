(function(){
	
	var FaceBook = function(){		
	
		const TITLE_MAX_LENGTH  = 96;
		
		// --------------------------------------------------------------------------------
		const MEDIA_URL_FACEBOOK = [   
				{	type:	'parse_facebook',
					icons:	'facebook.png',
					url: 	'facebook\.com\/[^\/]+\/videos\/([^\?]+)\/',
					id:		'\/(.*)\/',
					title:	null,
				},
			];
		
	
		var mediaDetectCallbacks = [];

		// --------------------------------------------------------------------------------
		function checkUrlFaceBook( media ){
return null;			
 			var url = media.url;
			var root_url = media.tab.url;
			
			// проверим на main адрес
			for (var i in MEDIA_URL_FACEBOOK) {		 
				if( url.match( new RegExp(MEDIA_URL_FACEBOOK[i].url,'g') ) )		{
					return MEDIA_URL_FACEBOOK[i];
				}	
			}

			return null;	
		}
		
		// --------------------------------------------------------------------------------
		function parseMediaFaceBook( media, options, callback ){
		
			tabInfo = media.tab;
			console.log("compiledMediaFaceBook: ", media, options );
			
			var url = media.url;
			var root_url = media.tab.url;
			var m = url.match( new RegExp(options.url,'i') );
			if (m.length<2) return;

			var par = [];

			getAJAX( url, function(content){
				
				var params = content.match( /\["params","([^"]+)"\]/gm );
				for (var i=0; i<params.length; i++) {
 					var x = params[i].match( /\["params","(.*)"\]/i );
					params[i] = fvdSingleDownloader.Utils.decode_unicode(x[1]);
					var x = JSON.parse(params[i])	
					_add(x);
 				}
				
				var title = get_JSON_param( 'ownerName', content );
				if (title) title = title.replace(/\\/g,'').replace(/\"/g,'')
					
				par['title'] = title;
				
				compiledFaceBook( par, callback )
			
			});
			
			// ----
			function _add( o ) {
				for (var k in o) {
					if ( typeof o[k] == 'object')  _add( o[k] );
					else   par[k] = o[k];
				}	
			}	
			// ----
	
		}	
		
		// ----------------------------------------------------------
		function compiledFaceBook( params, callback ){	

			var mediaFound = false;
			var parsedMediaList = [];
		
			var video_id = params['video_id'];
			var title = params['title'];
			
			if (params['hd_src']) 	_create( 'hd', params['hd_src'] );
				
			if (params['sd_src']) 	_create( 'sd', params['sd_src'] );
			
			if ( mediaFound )	callback( parsedMediaList );
			
 			// -----
			function _create( label, url ) {
				
				url = url.replace(/\\/g,'');
				
				var extension="mp4";
				var mExt=/\.([0-9a-zA-Z]+)(?:$|\?)/.exec(url);
				if(mExt)  extension=mExt[1];

				var media =  {
							url: 			url,
							title: 			title,
							downloadName: 	"["+label+"] "+title+"."+extension,
							displayName: 	title + "." + extension,
							quality: 		label,
							ext: 			extension,
							format: 		label,
							type: 			"video",
							size: 			null,
							groupId: 		0,
							orderField: 	0
						};
						
				parsedMediaList.push(media);
				mediaFound = true;
			}

		}
		
		// ----------------------------------------------------------
		function get_JSON_param( name, val ){			
		
			var x = '"' + name + '"\s*:([^\,]+)';
			var rxe = new RegExp( x, 'i');
			var m  = rxe.exec(val);
			if (m)  {
				if ( m[1] == "null" ) return null;
				return m[1].substring(1, m[1].length-1);
			}	
			return null;
		}
		
		
		// -----------------------------------------------------------
		function storeMedia( media, data ){
			
			media.forEach(function( item ){
				item.tabId = data.tabId;
				item.priority = 1;
				item.source = "FaceBook";
			});
			
			mediaDetectCallbacks.forEach( function( callback ){
						callback( media );
					} );
			
			// событие
			fvdSingleDownloader.ContentScriptController.processMessage( data.tabId, {
							action: "insertFBButton",
							media: media,
						} );				

		}
		
		this.onMediaDetect = {
			addListener: function( callback ){
				if( mediaDetectCallbacks.indexOf( callback ) == -1 )
				{
					mediaDetectCallbacks.push( callback );
				}
			}
		}
		
		this.isEqualItems = function( item1, item2 )		{
		
			if( item1.type == item2.type && item1.displayName == item2.displayName) {
				try {
					if (item1.url.split('?')[0] == item2.url.split('?')[0] )	return true;
				}
				catch (e) {
					return false;
				}	
			}
			return false;
		}
		
		// --------------------------------------------------------------------------------
		function getAJAX( url, callback ){
			
			var ajax = new XMLHttpRequest();
			ajax.open('GET', url, true);
			ajax.setRequestHeader('Cache-Control', 'no-cache');
			
			ajax.onload = function(){
						var content = this.responseText;
						callback( content );
			}
			
			ajax.onerror = function(){
				callback( null );
			}
			
			ajax.send( null );
		
		}
		
		// ------------------------------------------------------------------------
        chrome.webRequest.onResponseStarted.addListener(function(data){
		
			if( data.tabId < 0 )		return false;
		
			chrome.tabs.get( data.tabId, function( tab ){

				if (!tab) return false;
			
				var tabInfo = tab;
				data.tab = tabInfo;
				
				if (!tabInfo.url) return false;
				
				var opt = checkUrlFaceBook(data);
				
				if ( opt )		{
					
					parseMediaFaceBook( data, opt, function( mediaToSave, videoId )  {
									if( mediaToSave )	{
										data.tab.streamId = videoId;
										storeMedia( mediaToSave, data );
									}
					});
					
				}

			});
		
		}, {
			urls: ["<all_urls>"],
			types: ["main_frame", "sub_frame", "stylesheet", "script", "image", "object", "other"	, "xmlhttprequest"]
		}, ["responseHeaders"]);
				
	}
	
	this.FaceBook = new FaceBook();
	
}).apply( fvdSingleDownloader.Media );
