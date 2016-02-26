(function(){
	
	var LiveStream = function(){		
	
		const TITLE_MAX_LENGTH  = 96;
	
		var mediaDetectCallbacks = [];
		
		var self = this;

		// --------------------------------------------------------------------------------
		const LIVESTREAM_URL_STREAM = [   ];
		
		var mediaStream = [];
		
		var sizeOfVideo = {};
		
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
		this.addLiveStream = function( str )		{
			
			for (var i in mediaStream) {
				if ( mediaStream[i].hash == str.hash ) return false;
			}
			
			mediaStream.push(str);
			
			return true;	
		}		
		
		// --------------------------------------------------------------------------------
		this.clearLiveStream = function( tabId )		{
			
			var l = [];
			
			for (var i in mediaStream) {
				if ( mediaStream[i].tabId != tabId ) l.push(mediaStream[i]);
			}
			mediaStream = l;
			
			return true;	
		}		
		
		// --------------------------------------------------------------------------------
		this.isLiveStream = function( hash )		{
			
			for (var i in mediaStream) {
				if ( mediaStream[i].hash == hash ) return i;
			}
			
			return -1;	
		}		
		
		// --------------------------------------------------------------------------------
		this.startCombine = function( media )		{
			
			fvdSingleDownloader.Media.Storage.setStream( media.yt_hash, 'start', null );
			
			for (var i in mediaStream) {
				if ( mediaStream[i].hash == media.yt_hash ) {
					mediaStream[i].status = 'start';
					sizeOfVideo[media.yt_hash] = 0;
					
					console.log(mediaStream[i]);
					
					for(var j = 0; j < mediaStream[i].file.length; j++)     	{
						console.log ( 'mediaStream[i].file: j = '+j );
						if (mediaStream[i].file[j].stream == null) loadStreamFile(media.yt_hash, mediaStream[i].file[j].url, j);
					}
					
					return true;
				}	
			}
			
			return false;	
		}		
		
		// --------------------------------------------------------------------------------
		this.stopCombine = function( hash, callback )		{
			
			for (var i in mediaStream) {
				if ( mediaStream[i].hash == hash ) {
					mediaStream[i].status = 'stop';

 					var data = '';	
					for(var j = 0; j < mediaStream[i].file.length; j++)     	{
						if (mediaStream[i].file[j].stream == null)   break;
						data += mediaStream[i].file[j].stream;
					}
					
					var blob = b64toBlob(data, 'video/mp2t');
					var c = mediaStream[i].file.length;
					var r = sizeOfVideo[hash];
					
					callback(false, blob, c, r);
					
					delete sizeOfVideo[hash];
					
					return true;
				}	
			}
			
			fvdSingleDownloader.Media.Storage.setStream( hash, 'stop', null );
			
			
			return false;	
		}		
		
		function loadStreamFile(hash, url, index)  {
			console.log ( 'loadStreamFile: '+index,hash, '\n', url );
			try	{
				var httpRequest = new XMLHttpRequest(); 
				httpRequest.open ("GET", url, false);
				httpRequest.ind = index;
				httpRequest.hash = hash;
				httpRequest.overrideMimeType("text/plain; charset=x-user-defined");  
				httpRequest.onreadystatechange = function() {
						if (httpRequest.readyState==4) {
							if (IsRequestSuccessful (httpRequest)) 	{
								
 								for (var i in mediaStream) {
									if ( mediaStream[i].hash == hash ) {
										mediaStream[i].file[httpRequest.ind].stream = httpRequest.responseText;
									}	
								}
 								
								sizeOfVideo[hash] += roughSizeOfObject(httpRequest.responseText);
								
								fvdSingleDownloader.Media.Storage.setStream( hash, null, sizeOfVideo[hash] );
								
							}
							else 	{
								console.log('===============ERROR===================== httpRequest ==========');
								//self.postMessage({'msg': 'error', 'error':"Failed to get .ts file!"});
							}
						}
				};
				httpRequest.send();
			}
			catch(err)	{
				console.log('===============CATCH===================== httpRequest ==========');
				//self.postMessage({'msg': 'error', 'error':"Failed to load .ts file!"});
			}
		}
		
		
		// -------------------------------------------------------------------
		function b64toBlob(b64Data, contentType, sliceSize)	{
			contentType = contentType || '';
			sliceSize = sliceSize || 512;

			var byteArrays = [];
			for (var offset = 0; offset < b64Data.length; offset += sliceSize) 
			{
				var slice = b64Data.slice(offset, offset + sliceSize);

				var byteNumbers = new Array(slice.length);
				for (var i = 0; i < slice.length; i++) 
				{
					byteNumbers[i] = slice.charCodeAt(i);
				}

				var byteArray = new Uint8Array(byteNumbers);
				byteArrays.push(byteArray);
			}

			var blob = new Blob(byteArrays, {type: contentType});
			return blob;
		}
		
		
		// --------------------------------------------------------------------------------
		function checkUrlLiveStream( media ){
			
			var url = media.url;
			var root_url = media.tab.url;
			
			// проверим на main адрес
			for (var i in LIVESTREAM_URL_STREAM) {		 
				if( url.match( new RegExp(LIVESTREAM_URL_STREAM[i].url,'g') ) )		{
					self.clearLiveStream( media.tab.id );	
					fvdSingleDownloader.Media.Storage.removeTabData( media.tab.id );
				}	
			}
			
			for (var i in LIVESTREAM_URL_STREAM) {
				if( url.match( new RegExp(LIVESTREAM_URL_STREAM[i].stream,'g') )
					&& root_url.match( new RegExp(LIVESTREAM_URL_STREAM[i].url,'g') ) )		return LIVESTREAM_URL_STREAM[i];
			}
			
			return null;	
		}		
		
		// --------------------------------------------------------------------------------
		function checkLiveStreamStream( media, options, callback ){
		
			tabInfo = media.tab;
			//console.log("STREAM TEST FOUND STREAM: ", media, mediaStream );
			
			var url = media.url;
			var root_url = media.tab.url;
			
			var videoId = null;
			try {		
				var k = root_url.indexOf('?');
				if (k != -1) 	root_url = root_url.substring(0, k);
				videoId =/([^\/]+)$/.exec(root_url)[1];
			}
			catch( ex )	{
				dump( "Exception videoId: " + ex +'\n' );
			}
			//console.log('videoId = ',videoId);
			
			var parsedMediaList = [];
			var mediaFound = false;
			var videoTitle  = media.tab.title;
			var k = videoTitle.indexOf(' ', 35);
			if ( k != -1 ) videoTitle = videoTitle.substring(0, k);
			//console.log('videoTitle = ',videoTitle);
			
			var ext = 'flv';
			var hash = videoId;
			
			var start = false;
			if ( url.indexOf(options.start) != -1 ) start = true;
			
			// проверка stream
			var k = self.isLiveStream( hash );
			if ( k != -1 ) {
				if (start) {
					mediaStream[k].file = [];	
				}	
				mediaStream[k].file.push( { url: url,  stream: null } );
				
				if (mediaStream[k].status == 'start') {
					loadStreamFile(hash, url, mediaStream[k].file.length-1);
				}	
				return false;
			}	
			
			if (!start) {
				console.log('ERROR start', media);
				return false;
			}	
			
			self.addLiveStream( { hash:  	hash,
								  title: 	videoTitle,
								  videoId:	videoId, 
								  status:	'stop',
								  tabId:	tabInfo.id,	
								  file: 	[{ url: 		url,
											  stream: 	null }]
								});
			
			var m = {
					streamId:		videoId,
					url: 			url,
					title: 			videoTitle,
					displayName: 	videoId + "." + ext,
					downloadName: 	videoId + "." + ext,
					ext: 			ext,
					yt_hash: 		hash,
					size: 			0,
					type: 			"video",
					groupId: 		0,
					orderField:		0,
					icons:			options.icons,
			};
			console.log(m);
			
			parsedMediaList.push(m);
			mediaFound = true;

			callback( parsedMediaList, videoId );		
			
		}
		
		function roughSizeOfObject( object ) {

			var objectList = [];

			var recurse = function( value )
			{
				var bytes = 0;

				if ( typeof value === 'boolean' ) {
					bytes = 4;
				}
				else if ( typeof value === 'string' ) {
					bytes = value.length * 2;
				}
				else if ( typeof value === 'number' ) {
					bytes = 8;
				}
				else if
				(
					typeof value === 'object'
					&& objectList.indexOf( value ) === -1
				)
				{
					objectList[ objectList.length ] = value;

					for( i in value ) {
						bytes+= 8; // an assumed existence overhead
						bytes+= recurse( value[i] )
					}
				}

				return bytes;
			}

			return recurse( object );
		}
		
		
		function IsRequestSuccessful (httpReq) {
			// Fix for IE: sometimes 1223 instead of 204
			var success = (httpReq.status == 0 || 
				(httpReq.status >= 200 && httpReq.status < 300) || 
				httpReq.status == 304 || httpReq.status == 1223);

			return success;
		}
		

		// -----------------------------------------------------------
		function storeMedia( media, data ){
			
			if (media)	{	
				if( media.length ) 	 {							
					media.forEach(function( item ){
											item.tabId = data.tabId;
											item.streamId = data.tab.streamId;
											item.priority = 1;
											item.source = "LiveStream";
											item.status = "stop";
										});
				}
				else	{							
					media.tabId = data.tabId;
					media.streamId = data.tab.streamId;
					media.priority = 1;
					media.source = "LiveStream";
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
		
			if( item1 && item2 && item1.url == item2.url )	{
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
					
					var opt = checkUrlLiveStream(data);
					
					if (opt) {
						checkLiveStreamStream( data, opt, function( mediaToSave, videoId )  {
										if( mediaToSave )	{
											data.tab.streamId = videoId;
											storeMedia( mediaToSave, data );
										}
						});
					}	
					
				}	

			});
		}, {
			urls: ["<all_urls>"],
			types: ["main_frame", "other"]
		}, ["responseHeaders"]);
				
	};
	
	this.LiveStream = new LiveStream();
	
}).apply( fvdSingleDownloader.Media );
