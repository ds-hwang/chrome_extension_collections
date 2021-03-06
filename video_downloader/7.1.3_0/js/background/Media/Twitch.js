(function(){
	
	var Twitch = function(){		
	
		const TITLE_MAX_LENGTH  = 96;
	
		var mediaDetectCallbacks = [];

		// --------------------------------------------------------------------------------
		const VIDEO2EXT = {		
			'mpeg' : 'mp4',
			'm4v': 'mp4',
			'3gpp' : '3gp',
			'flv' : 'flv',
			'x-flv' : 'flv',
			'quicktime' : 'mov',
			'msvideo' : 'avi',
			'ms-wmv' : 'wmv',
			'ms-asf' : 'asf',
			'web' : 'webm'
		};
		
		const AUDIO2EXT = {		
			'realaudio' : 'ra',
			'pn-realaudio' : 'rm',
			'midi' : 'mid',
			'mpeg' : 'mp3',
			'mpeg3' : 'mp3',
			'wav' : 'wav',
			'aiff' : 'aif'
		};
		
		const TRANSLATE_EXT = {
			"m4v" : "mp4"
		};
		
		const TWITCH_URL_STREAM = [
			{	url: "twitch.tv", 	  
				player: '/player.', 
				channel: 'http:\/\/usher\.([a-z]+)\.tv\/api\/channel(.+?)\?',  
				icons:	'twitch.png'   },
				
			{	url: "periscope.tv", 
				player: '/player.', 
				channel: 'http:\/\/periscope\-(.*)\/playlist.m3u8\?',   
				icons: 'periscope.png'  },
			
		];

		const TWITCH_URL_MEDIA = [
			{	url: "periscope.tv", 
				player: '/player.', 
				channel: 'https:\/\/replay\.periscope\.tv\/(.*)\/playlist.m3u8',   
				icons: 'periscope.png'  }
			
		];

		// --------------------------------------------------------------------------------
        function getHeaderValue(name, data){
            name = name.toLowerCase();
            for (var i = 0; i != data.responseHeaders.length; i++) {
                if (data.responseHeaders[i].name.toLowerCase() == name) {
                    return data.responseHeaders[i].value;
                }
            }
            return null;
        }
        
		
		// --------------------------------------------------------------------------------
		function getExtByContentType( contentType ){
			if( !contentType ){
				return null;
			}
			var tmp = contentType.split("/");
			
			if( tmp.length == 2 ){
				switch( tmp[0] ){
					case "audio":
						if( AUDIO2EXT[tmp[1]] ){
							return AUDIO2EXT[tmp[1]];
						}
					break;
					case "video":
						if( VIDEO2EXT[tmp[1]] ){
							return VIDEO2EXT[tmp[1]];
						}						
					break;					
				}
			}			
			
			return null;
		}
		
		// --------------------------------------------------------------------------------
		function getFileName( data ){
			// check disposition name

			var url = data.url;
			var tmp = url.split( "?" );
			url = tmp[0];
			tmp = url.split( "/" );
			tmp = tmp[ tmp.length - 1 ];
			
			if( tmp.indexOf( "." ) != -1 ){
				var replaceExt = getExtByContentType( getHeaderValue( "content-type", data ) );
				if( replaceExt ){
					tmp = tmp.split( "." );
					tmp.pop();
					tmp.push( replaceExt );
					tmp = tmp.join(".");
				}
				
				try{
					return decodeURIComponent(tmp);					
				}
				catch( ex ){
					if( window.unescape ){
						return unescape(tmp);										
					}
					else{
						return tmp;
					}
				}

			}
			
			return  null;		
		};
		
		// --------------------------------------------------------------------------------
		function getPlayListTwitch( id, url, callback ){
			
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

		// --------------------------------------------------------------------------------
		function checkUrlTwitch( url ){
			
			for (var i in TWITCH_URL_STREAM) {
				if( url.match( new RegExp(TWITCH_URL_STREAM[i].channel,'g') ) )		return 1;
			}
			for (var i in TWITCH_URL_MEDIA) {
				if( url.match( new RegExp(TWITCH_URL_MEDIA[i].channel,'g') ) )		return 2;
			}
			
			return 0;	
		}		
		
		// --------------------------------------------------------------------------------
		function checkTwitchStream( media, callback ){
		
			tabInfo = media.tab;
			console.log("TWITCHTEST FOUND STREAM: ", media );
			
			var url = media.url;
			var videoId = null;

			try {		
				var root_url = media.tab.url;
				var k = root_url.indexOf('?');
				if (k != -1) 	root_url = root_url.substring(0, k);
				videoId =/([^\/]+)$/.exec(root_url)[1];
			}
			catch( ex )	{
				//dump( "Exception videoId: " + ex +'\n' );
			}
			if (!videoId) {
				var k = url.indexOf('.m3u8');
				if (k != -1) {
					var t = url.substring(0, k);
					var videoId=/([^\/]+)$/.exec(t)[1];
				}	
			}
			console.log('videoId = ',videoId);
			
			var parsedMediaList = [];
			var mediaFound = false;
			var videoTitle  = media.tab.title;
		
			getPlayListTwitch( videoId, url, function( content ) {  

					var str = content.split('\n');
					var kk = str.length;
					for (var i=0; i<kk; i++) 	{
						if (str[i] == '') continue;

						if (str[i].indexOf('EXT-X-MEDIA:TYPE=VIDEO') != -1) {	
							var m = /NAME="(.*)"/.exec(str[i]);
							var label = m[1];
							var u = str[i+2];

							if (label && u) {
								
								var ft = videoId+" ["+label+"]";
								var ext = "mp4";

								var m = /\_(.*)\/py\-index\-live\.m3u8/.exec(u);										
								var hash = m[1].replace('/','_');
								console.log('hash = ',hash);
								
								var media = twitch_add(videoId, u, label, ft, ext, hash );
								parsedMediaList.push(media);
								mediaFound = true;
							}
						}
						else if (str[i].indexOf('EXT-X-STREAM-INF:BANDWIDTH') != -1) {	

							var label = 'stream';
							var u = str[i+1];
							
							var k = url.indexOf('/playlist');
							if (k != -1) {
								u = url.substring(0, k) + '/' + u;
							}	
							
							var ft = videoTitle;
							var extension="ts";

							var hash = videoId;
							
							var media = twitch_add(videoId, u, label, ft, extension, hash );
							parsedMediaList.push(media);
							mediaFound = true;
						}
						
					}
			
					callback( parsedMediaList, videoId );		
				
			});
			
		}
		
		// --------------------------------------------------------------------------------
		function twitch_add( vId, u, l, ft, ext, hash ){

			var media = {
					twitchId:		vId,
					url: 			u,
					urlPlayList: 	u,
					title: 			ft,
					displayName: 	ft + "." + ext,
					downloadName: 	ft + "." + ext,
					quality: 		l,
					ext: 			ext,
					yt_format: 		l,
					yt_hash: 		hash,
					format: 		l,
					size: 			0,
					type: 			"video",
					groupId: 		0,
					orderField:		0
			};
			return media;		
		}	

		// --------------------------------------------------------------------------------
		function checkTwitchMedia( media, callback ){
		
			tabInfo = media.tab;
			console.log("TWITCHTEST FOUND MEDIA: ", media );
			
			var url = media.url;
			var videoId = null;

			try {		
				var root_url = media.tab.url;
				var k = root_url.indexOf('?');
				if (k != -1) 	root_url = root_url.substring(0, k);
				videoId =/([^\/]+)$/.exec(root_url)[1];
			}
			catch( ex )	{
				//dump( "Exception videoId: " + ex +'\n' );
			}
			if (!videoId) {
				var k = url.indexOf('.m3u8');
				if (k != -1) {
					var t = url.substring(0, k);
					var videoId=/([^\/]+)$/.exec(t)[1];
				}	
			}
			console.log('videoId = ',videoId);
			
			var videoTitle  = media.tab.title;
			var parsedMediaList = [];
			var media = twitch_add(videoId, url, "media", videoTitle, "ts", videoId );
			parsedMediaList.push(media);
			var mediaFound = true;
			
			callback( parsedMediaList, videoId );		
			
		}
		
		// -----------------------------------------------------------
		function storeMedia( media, data ){
			
			if (media)	{	
				if( media.length ) 	 {							
					media.forEach(function( item ){
											item.tabId = data.tabId;
											item.twitchId = data.tab.twitchId;
											item.priority = 1;
											item.source = "Twitch";
											item.status = "stop";
										});
				}
				else	{							
					media.tabId = data.tabId;
					media.twitchId = data.tab.twitchId;
					media.priority = 1;
					media.source = "Twitch";
				}						
			
				mediaDetectCallbacks.forEach( function( callback ){
									callback( media );
								} );
			
			}
		}
		
		// -----------------------------------------------------------
		this.onMediaDetect = {
			addListener: function( callback ){
				if( mediaDetectCallbacks.indexOf( callback ) == -1 )
				{
					mediaDetectCallbacks.push( callback );
				}
			}
		};
		
		// -----------------------------------------------------------
		this.isEqualItems = function( item1, item2 )		{
		
			if( item1.url == item2.url )	{
				return true;
			}
			return false;
		};

		
		// ------------------------------------------------------------------------
        chrome.webRequest.onResponseStarted.addListener(function(data){
			
			if( data.tabId < 0 )		return false;

			chrome.tabs.get( data.tabId, function( tab ){
			
				if (tab && tab.url) {
			
					var tabInfo = tab;
					data.tab = tabInfo;
					
					var t = checkUrlTwitch(data.url);

 					if( t == 1 )   {		
						checkTwitchStream( data, function( mediaToSave, videoId )  {
									if( mediaToSave )	{
										data.tab.twitchId = videoId;
										storeMedia( mediaToSave, data );
									}
						} );
					}
 					else if( t == 2 )   {		
						checkTwitchMedia( data, function( mediaToSave, videoId )  {
									if( mediaToSave )	{
										data.tab.twitchId = videoId;
										storeMedia( mediaToSave, data );
									}
						} );
					}
					
				}	

			});
		}, {
			urls: ["<all_urls>"],
			types: ["other"]
		}, ["responseHeaders"]);
				
	};
	
	this.Twitch = new Twitch();
	
}).apply( fvdSingleDownloader.Media );
