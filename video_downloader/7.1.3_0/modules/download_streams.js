if (window == chrome.extension.getBackgroundPage()) {
	
	(function(){
	
		var DownloadStreams = function(){		
		
			var isRun = false;
 
			var downloadStream = {};
 
 
			// -------------------------------------------------------------------
			this.start = function( params, callbackMessage, callbackFinish ){
				
				console.log('DownloadStreams.start', params);
				
				callbackMessage('start', params.hash, {id: params.id});
				
				downloadStream[ params.hash ] = { 	hash:  	 	params.hash,
													playlist: 	params.playlist,
													filename:	params.filename, 
													status:	 	'start',
													size:		0,
												    file: 		[]		};
				
				if ( typeof params.playlist == 'object' ) {
					
					if ( downloadStream[ params.hash ].status  == 'start' ) {
			
						callbackMessage('playlist', params.hash, {count: params.playlist.length, id: params.id });
				
						for(var j = 0; j < params.playlist.length; j++)  {
							downloadStream[params.hash].file.push( { url: params.playlist[j],  stream:  null } );
						}	
						
						start_load( );
					}
					else {	
						callbackMessage('cancel', params.hash, {id: params.id });
						callbackFinish(true);
					}
					
				}
				else {	
					loadPlayListFile(params.hash, params.playlist, function(listFile){
						
								if ( downloadStream[ params.hash ].status  == 'start' ) {
						
									callbackMessage('playlist', params.hash, {count: listFile.length, id: params.id });
							
									for(var j = 0; j < listFile.length; j++)  {
										downloadStream[params.hash].file.push( { url: listFile[j],	   stream:  null } );
									}	
									
									start_load( );

								}
								else {	
									callbackMessage('cancel', params.hash, {id: params.id });
									callbackFinish(true);
								}
					});
				}	

				// ---------------------
				function start_load( ) {

					var j = 0;
					fvdSingleDownloader.Utils.Async.arrayProcess( downloadStream[params.hash].file, function( f, apCallback ){

									setTimeout( function() {
										
										loadStreamFile(params.hash, f.url, j, load_end);
										
										j++;
										
										apCallback();
										
									}, 100);		
								}, 
								function(){		} 
					 );

				}	
				
				// ---------------------
				function load_end( error, hash, index) {
				
					if ( !error ) {
						
						if ( downloadStream[ hash ].status  == 'start' ) {
						
							var fend = true, k = 0;;	
							for (var j=0; j<downloadStream[hash].file.length; j++) {
								if (downloadStream[hash].file[j].stream == null) {
									fend = false;
									k++;
								}	
							}

							if (fend) {
								union(hash);
							}
							else {
								callbackMessage('load', hash, {size: downloadStream[hash].size, count: k, id: params.id});
							}	
						}
						else if ( downloadStream[ hash ].status  == 'cancel' ) {
							callbackMessage('cancel', hash, {id: params.id});
							downloadStream[ hash ].status = 'stop'
							
							var ff = [], fl = true;
							for (var j=0; j<downloadStream[hash].file.length; j++) {
								if (downloadStream[hash].file[j].stream) {
									if (fl)  ff.push(downloadStream[hash].file[j]);
								}
								else {
									downloadStream[hash].file[j].req.abort();	
									fl = false;
								}	
							}
							
							
							downloadStream[hash].file = ff;
							union(hash);
						}	
						else {
							console.log(downloadStream[ hash ].status);	
						}	
					}
					else {
						callbackMessage('error', hash, {url: downloadStream[hash].file[index].url});
					}	
				}
				// ---------------------
				function union( hash ) {
 					var data = '';	
					for(var j = 0; j < downloadStream[hash].file.length; j++)     	{
						if (downloadStream[hash].file[j].stream) {
							data += downloadStream[hash].file[j].stream;
						}
						else {
							break;
						}	
					}
					
					var blob = b64toBlob(data, 'video/mp4');
					var c = downloadStream[hash].file.length;
					var r = downloadStream[hash].size;
					
					delete downloadStream[hash];
					
					callbackMessage('finish', hash, {size: r, count: c, id: params.id});
					
					callbackFinish(false, hash, blob, c, r);
				}	
				// ---------------------
				
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
			
			// -------------------------------------------------------------
			function loadPlayListFile(hash, url, callback)  {
				
				var host = url;
				var k = host.lastIndexOf('/');
				if ( k != -1) {
					host = host.substr(0, k+1);
				}		
				
				getAJAX( url, function(content){
					var results = [];
					content.split('\n').forEach(function( item ){
							if ( item.substring(0,1) == '#' )   return;
							item = item.trim();
							if ( !item )   return;	 
							var u = item;
							if (u.indexOf('http') != 0)  u = host + u;
							results.push( u );
					});	
					
					callback(results);	
				});
			}
			
			// -------------------------------------------------------------
			function loadStreamFile(hash, url, index, callback)  {
				//console.log ( 'loadStreamFile: '+index, hash, url );
				try	{
					var httpRequest = new XMLHttpRequest(); 
					downloadStream[hash].file[index].req = httpRequest;					
					httpRequest.open ("GET", url, true);
					httpRequest.ind = index;
					httpRequest.hash = hash;
					httpRequest.overrideMimeType("text/plain; charset=x-user-defined");  
					httpRequest.onreadystatechange = function() {
							if (httpRequest.readyState==4) {
								if (IsRequestSuccessful (httpRequest)) 	{
									var h = httpRequest.hash;
									var i = httpRequest.ind;
									
									if (downloadStream[h] && downloadStream[ hash ].status != 'stop') {
										downloadStream[h].file[i].stream = httpRequest.responseText;
										downloadStream[h].size += httpRequest.responseText.length;
										
										callback(false, h, i);
									}	
								}
								else 	{
									console.log('===============ERROR===================== httpRequest ==========');
									callback(true);
								}
							}
					};
					httpRequest.send();
				}
				catch(err)	{
					console.log('===============CATCH===================== httpRequest ==========');
					callback(true);
				}
			}
			
			function IsRequestSuccessful (httpReq) {
				var success = (httpReq.status == 0 || (httpReq.status >= 200 && httpReq.status < 300) || httpReq.status == 304 || httpReq.status == 1223);
				return success;
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
			
			
			// -------------------------------------------------------------------
			this.stop = function( hash ){
				
				console.log('DownloadStreams.stop', hash);
				
				downloadStream[hash].status = 'cancel';
				
			}
			
		}
		
		this.DownloadStreams = new DownloadStreams();
		
	}).apply(fvdSingleDownloader);
}
else{
	fvdSingleDownloader.DownloadStreams = chrome.extension.getBackgroundPage().fvdSingleDownloader.DownloadStreams;
}

