(function(){
	
	var BreakCom = function(){		
	
		const TITLE_MAX_LENGTH  = 96;
	
		var mediaDetectCallbacks = [];

//Seg   	http://www.break.com/video/chubby-korean-baby-dance-2614601   		
// 			http://www.break.com/video/high-school-football-player-hurdles-defender-181429		
		
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
		function getEmbedFromBreackCom( id, callback ){
			
			var url = 'http://www.break.com/embed/'+id+'/';
			
			// send request to Break.Com
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
		function checkBreakCom( media, callback ){
		
			tabInfo = media.tab;
		
			var k = media.url.lastIndexOf('-');
			if ( /Seg[0-9]-Frag[0-9]/i.test(media.url.toLowerCase()) )		{
			
				var url = tabInfo.url;
				
				var k = url.lastIndexOf('-');
				if ( k != -1) {
					var id = url.substr(k+1);

					getEmbedFromBreackCom( id, function( content ) {  
				
						var AuthToken = content.match( /"AuthToken"\s*:\s*"(.+?)"/i );
						var videoUri = content.match( /"videoUri"\s*:\s*"(.+?)"/i );
						var contentName = content.match( /"contentName"\s*:\s*"(.+?)"/i );
						var pageUri = content.match( /"pageUri"\s*:\s*"(.+?)"/i );
						
						var uri = videoUri[1] + "?" + AuthToken[1];
						var title = contentName[1];
						var ext = fvdSingleDownloader.Utils.extractExtension( videoUri[1] );
						var name = pageUri[1];

						var frmt = "no name";
						if (title) 	{
							frmt = title;
							if ( frmt.length > 10) frmt = frmt.substr(0,10)+"...";
						}
						
						var result = {				
							url: uri,
							tabId: media.tabId,
							frameId: media.frameId,
							ext: ext,
							
							title: title,
							format: frmt,
							
							downloadName: name + "." + ext,
							priority: 0,
							vubor:  0,
							size: null,
							type: "video",
							groupId: 0,
							orderField: 0
						};

						callback( result );		
				
					});
				}
					
			}
			else {
			
				if( fvdSingleDownloader.Media.Sniffer.isMedia( media ) )	{				

					if ( media.type != 'script')		storeBreakCom( media, callback );
			
				}
				
			}
		}
		
		// --------------------------------------------------------------------------------
		function storeBreakCom( media, callback ){

			ext = getExtByContentType( getHeaderValue( "content-type", media ) );
			
			if( !ext )		ext = fvdSingleDownloader.Utils.extractExtension( media.url );
			ext = ext.toLowerCase();
			if(TRANSLATE_EXT[ext])		ext = TRANSLATE_EXT[ext];
			
			var size = getHeaderValue( "Content-Length", media );
			
			var fileName = getFileName( media );	
			
			var title = fileName;
			downloadName = title;			
			var frmt = "no name";
			if (title) 	{
				frmt = title;
				if ( frmt.length > 10) frmt = frmt.substr(0,10)+"...";
			}
			
			var result = {				
				url: media.url,
				tabId: media.tabId,
				frameId: media.frameId,
				ext: ext,
				
				title: title,
				format: frmt,
				
				downloadName: downloadName ? downloadName : "media." + ext,
				priority: 0,
				vubor:  0,
				size: size,
				type: "video",
				groupId: 0,
				orderField: 0
			};

			callback( result );		
		
		}
		
		// -----------------------------------------------------------
		function storeMedia( media, data ){
			
			if (media)	{	
				if( media.length ) 	 {							
					media.forEach(function( item ){
											item.tabId = data.tabId;
											item.priority = 1;
											item.source = "BreakCom";
										});
				}
				else	{							
					media.tabId = data.tabId;
					media.priority = 1;
					media.source = "BreakCom";
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
					
					if ( /break.com\/video\/([^.]*)/i.test(tabInfo.url.toLowerCase()) )		{

						
									checkBreakCom( data, function( mediaToSave )  {
									
												if( mediaToSave )	{
													storeMedia( mediaToSave, data );
												}
												
									} );
						
				
					}
				}	

			});
		}, {
			urls: ["<all_urls>"],
			types: ["main_frame", "sub_frame", "stylesheet", "script", "image", "object",  "xmlhttprequest", "other"]
		}, ["responseHeaders"]);
				
	};
	
	this.BreakCom = new BreakCom();
	
}).apply( fvdSingleDownloader.Media );
