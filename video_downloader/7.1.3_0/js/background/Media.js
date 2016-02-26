if (window == chrome.extension.getBackgroundPage()) {

	(function(){
	
		var Media = function(){

			var self = this;
			
			var textFile = null;
			
			var _onMediaForTabUpdateListeners = [];
			
			const DETECT_MODULES = ["Sniffer", "DailyMotion", "VKontakte", "BreakCom", "SitePage", "Twitch", "MediaStream", "LiveStream"];
			
			// ===============================================================
			this.init = function(){
			
/*				console.log("Media - init ");
				
				chrome.tabs.getSelected(undefined, function(tab) {
								incognito = tab.incognito;
								url = tab.url;
								var types = ['cookies', 'images', 'javascript', 'plugins', 'popups', 'notifications']; // плагины, вспл.окна, оповещения
								
								types.forEach(function(type) {
											chrome.contentSettings[type].get({
															'primaryUrl': url,
															'incognito': incognito
														},
														function(details) {   console.log(type, details.setting);  });
													});				
							});				*/
				
				
				this.Storage.onMediaRemove.addListener(function( tabId ) {

							console.log( "REMOVE ITEM " + tabId );
					
							_onMediaForTabUpdateListeners.forEach(function(listener) {
						
										try
										{
											listener(tabId);							
										}
										catch( ex ){			}
						
									});
				
						});
				
		
				
												
				function mediaDetectListener(media){

					var tabId = null;
					fvdSingleDownloader.Utils.Async.chain ( [
							function( chainCallback ){
						
										chainCallback();
									},
					
							function() {
										if (media)
										{	
											if( media.length )
											{							
												media.forEach(function( item ) {
																tabId = item.tabId;
																self.Storage.addItemForTab(item.tabId, item);							
															});
											}
											else
											{							
												tabId = media.tabId;
												self.Storage.addItemForTab(media.tabId, media);
											}
				
											chrome.extension.sendMessage( {
																		subject: "mediaForTabUpdate",
																		data: tabId
																	} );
				
											_onMediaForTabUpdateListeners.forEach(function(listener){
							
															try
															{
																listener(tabId);							
															}
															catch( ex ){	}
							
														});
										}
									}] );
					
				};
				
				// --------------------------- перебираем модули Sniffer, Youtube
				DETECT_MODULES.forEach( function( module ){
				
					if( self[module] )		{
						self[module].onMediaDetect.addListener(mediaDetectListener);						
					}
					
				} );
				
				// --------------------------- закрытие вкладки  
				chrome.tabs.onRemoved.addListener( function( tabId ){
				
							if( fvdSingleDownloader.Media.Storage.hasDataForTab( tabId ) )
							{
								fvdSingleDownloader.Media.Storage.removeTabData( tabId );
						
								_onMediaForTabUpdateListeners.forEach(function( listener ){
												listener( tabId );
											});
							}
						} );
				
				// --------------------------- изменение вкладки
				chrome.tabs.onUpdated.addListener( function( tabId, changeInfo ){
				
							if( changeInfo.url )
							{
								if( fvdSingleDownloader.Media.Storage.hasDataForTab( tabId ) )
								{
									fvdSingleDownloader.Media.Storage.removeTabData( tabId );
								
								
									_onMediaForTabUpdateListeners.forEach(function( listener ){
												listener( tabId );
											});
								}
							}
					
						} );
				
				// --------------------------- реакция на SendRequest
				chrome.extension.onRequest.addListener ( function(request, sender, sendResponse) {        
				
									if(request.command=="getVideoData")	{
										fvdSingleDownloader.Utils.getActiveTab( function( tab ) {
													if( tab )
													{
														var media = fvdSingleDownloader.Media.Storage.getMedia( tab.id );
														media = fvdSingleDownloader.MainButton.filter_Media( media );
														media = fvdSingleDownloader.MainButton.parsed_Media( media );
														sendResponse(media);
													}
												});	
									}
									else if(request.command=="startDownload")	{
										self.startDownload( request.media );	
									}

								});
				
				
			}
			
			// ----------------------------------------------
			this.display_setting = function(){
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
			// ===============================================================
			this.startDownload = function( media ){
				
				var flag_download = 0;
				var file_name = media.title;	

				fvdSingleDownloader.Utils.Async.chain( [
				
							function( chainCallback ){		// для мобильной версии
							
											if( fvdSingleDownloader.noYoutube == false )	{
												fvdSingleDownloader.FvdMobile.downloadMedia( media, function( result ){
																	if( !result )	{
																		chainCallback();
																	}
																} );						
											}
											else	{
												chainCallback();	
											}
										},
										
							function( chainCallback ){		// настроим скачивание
											
											// изменение по доработке к сайту gogvo.com	
											//if( media.url.toLowerCase().indexOf( "gvovideo.com" ) != -1)  	flag_download = 1;
											//if( media.url.toLowerCase().indexOf( "divxstage.eu" ) != -1)  	flag_download = 1;
											//if( media.url.toLowerCase().indexOf( "videoweed.es" ) != -1)  	flag_download = 1;
											//if( media.url.toLowerCase().indexOf( "novamov.com" ) != -1)  		flag_download = 1;
											
											if( flag_download != 1 && chrome.downloads ) {	// есть API download
											
												if (['Youtube', 'SitePage', 'VKontakte', 'Twitch', 'LiveStream', 'MediaStream'].indexOf(media.source) != -1) {
													flag_download = 3;
													var removeChars = /[\\\/:*?"<>|"']/g;
												}
											}	
											var removeChars = /[\\\/:*?"<>|"']/g;
											if ('downloadName' in media && media.downloadName != "") {
												file_name = media.downloadName.replace(removeChars, "");
											}

											chainCallback();	
										},
										
							function( chainCallback ){			// скачивание методом открытия в новой вкладке
							
											if( flag_download == 1 )	{
												console.log('DOWNLOAD - open');
												chrome.tabs.create({
																url: media.url,
																active: false
															});		
												return;
											}	
											else {
												chainCallback();
											}
											
										},
										
							function( chainCallback ){			// с использованием API
												
											if( flag_download == 3 ) 	{
												console.log('DOWNLOAD - api');	
												chrome.downloads.download({
																		url: media.url,
																		filename: file_name,
																		saveAs: true 
																		},
																		function (downloadId) {
																			console.log('DOWNLOAD', downloadId );
																			chrome.downloads.search({ id:downloadId	},
																						function (result) {
																							console.log('DOWNLOAD', result );
																						}		
																			);
																		}		
																	);
												return;					
											}
											else	{
												chainCallback();
											}						
										},
					
							function( chainCallback ){			// по старинке
												
											if( flag_download == 0 ) 	{
												fvdSingleDownloader.Utils.getActiveTab(function( tab ){
															fvdSingleDownloader.ContentScriptController.processMessage( tab.id, {
																		action: "startDownload",
																		media: media
																	} );
														});
												return;		
											}						
										}
						] );
						
			}

			// ===============================================================
			this.startRecord = function( media, callback ){
console.log('startRecord', media)
				fvdSingleDownloader.Recorder.start( media.yt_hash, media.urlPlayList,
						function(error, countTSFiles, sizeOfVideo)	{ 
						
							if(error) {
								console.log(fvdSingleDownloader.Recorder.getError());
							}
							else  {
								fvdSingleDownloader.Media.Storage.setTwitch( media.yt_hash, null, sizeOfVideo );
								callback(sizeOfVideo);
							}
					}
				);

			}	
			// ===============================================================
			this.stopRecord = function( media ){
console.log('stopRecord', media)
				fvdSingleDownloader.Recorder.stop( media.yt_hash, function(error, file)	{ 
						
								if(error) {
									// If true, get error info
									console.log(fvdSingleDownloader.Recorder.getError());
								}
								else {
									var link_href = saveTSFile(file);
									media.url = link_href;
									self.startDownload( media );
									console.log(link_href);
								}	
						});

			}	
			
			// ===============================================================
			this.startCombine = function( media, callback ){
				fvdSingleDownloader.Media.LiveStream.startCombine( media, callback );
			}	
			// ===============================================================
			this.stopCombine = function( media ){
 				fvdSingleDownloader.Media.LiveStream.stopCombine( media.yt_hash, function(error, file, count, size)	{ 
								if(error) {
									// If true, get error info
									//console.log(fvdSingleDownloader.Combiner.getError());
								}
								else {
 									var link_href = saveTSFile(file);
									media.url = link_href;
									self.startDownload( media );
 								}	
						}); 

			}	
			
			// ===============================================================
			this.startCombineDownload = function( media, callback ){
				fvdSingleDownloader.DownloadStreams.start( {	
													hash:		media.yt_hash,
													playlist: 	media.urlPlayList,	
													filename:	media.downloadName,
													ext:		media.ext,
													id:			media.id,
													tabId:		media.tabId,
												  }, 
					 function(type, hash, data)	{ 
						console.log('== '+type+' ==', hash, data);
						if ( type === 'start' ) {
							fvdSingleDownloader.Media.Storage.setStream( media.yt_hash, 'start', null );
							chrome.extension.sendMessage( {	subject: "start_download_streams", id: data.id	} );
						}	
						else if ( type === 'cancel' ) {
							fvdSingleDownloader.Media.Storage.setStream( media.yt_hash, 'stop', null );
							chrome.extension.sendMessage( {	subject: "finish_download_streams", id: data.id	} );
						}
						else if ( type === 'finish' ) {
							fvdSingleDownloader.Media.Storage.setStream( media.yt_hash, 'stop', null );
							chrome.extension.sendMessage( {	subject: "finish_download_streams", id: data.id	} );
						}
						else if ( type === 'playlist' ) {
							chrome.extension.sendMessage( {	subject: "load_download_streams", id: data.id, count: data.count } );
						}	
						else if ( type === 'load' ) {
							fvdSingleDownloader.Media.Storage.setStream( media.yt_hash, null, data.size );
							chrome.extension.sendMessage( {	subject: "load_download_streams", id: data.id, count: data.count	} );
						}	
					 },									
					 function(error, hash, file, count, size)	{ 
						if ( !error ) {
							var media = self.Storage.getDataForHash(hash);
							if (media) {
								var link_href = saveTSFile(file);
								media.url = link_href;
								self.startDownload( media );
							}			   
						}				   
					}
				);									   
				
			}	
			// ===============================================================
			this.stopCombineDownload = function( media ){
				fvdSingleDownloader.DownloadStreams.stop( media.yt_hash );	
				
			}	
			
			// ===============================================================
			function saveTSFile(data)	{ 	
				// If we are replacing a previously generated file we need to
				// manually revoke the object URL to avoid memory leaks.
				if (textFile !== null) 	{
					window.URL.revokeObjectURL(textFile);
				}
			
				textFile = window.URL.createObjectURL(data);		
				return textFile;
			}
			
			// ===============================================================
			this.onMediaForTabUpdate = {
				addListener: function(callback){
							if (_onMediaForTabUpdateListeners.indexOf(callback) == -1) 
							{
								_onMediaForTabUpdateListeners.push(callback);
							}
						}
			}
		}
		
		this.Media = new Media();
		
	}).apply(fvdSingleDownloader);
	
}
else
{
	fvdSingleDownloader.Media = chrome.extension.getBackgroundPage().fvdSingleDownloader.Media;
}
