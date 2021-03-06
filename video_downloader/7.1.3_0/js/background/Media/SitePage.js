(function(){

	var SitePage = function(){		
	
		var self = this;
		
		const TITLE_MAX_LENGTH  = 96;
	
		var mediaDetectCallbacks = [];

		// ----------------------------------------------------------
		function get_JSON_param( name, val ){			
		
			var x = '"' + name + '"\s*:\s*"([^\"]+?)"';
			var rxe = new RegExp( x, 'i');
			var m  = rxe.exec(val);
			if (m)	return m[1];
			return null;
		}
		
		// --------------------------------------------------------------------------
		function prepareMedia( media ){

			var u = fvdSingleDownloader.Utils.convertURL(media.url);
			
			if (u.type)
			{
				if ( !media.type )  media.type = u.type;
				else if ( media.type == "link" )  media.type = u.type;
			}	
			
			if ( !fvdSingleDownloader.Utils.check_enable_type(media.type) )  return null;
			
			var result = {				
				url: media.url,
				title: media.title,
				ext: u.ext,
				format: "",
				downloadName: u.name,
				type: media.type,
				size: "",
				priority: 0,
				groupId: 0,
				orderField: 0
			};

			return result;
		}
		
		// --------------------------------------------------------------------------------
		function storeMedia( media, tabId ){
			
			media.forEach(function( item ){
			
						item.tabId = tabId;
						if (!item.priority) item.priority = 1;
						item.vubor = 0;
						
						if ( !('source' in item) )	item.source = "SitePage";
				
					});
					
			mediaDetectCallbacks.forEach( function( callback ){
						callback( media );
					} );
					
		}
		// --------------------------------------------------------  
		function parse_str(str){
			var glue1 = '=';
			var glue2 = '&';
			var array2 = str.split(glue2);
			var array3 = [];
			for(var x=0; x<array2.length; x++)
			{
				var tmp = array2[x].split(glue1);
				array3[unescape(tmp[0])] = unescape(tmp[1]).replace(/[+]/g, ' ');
			}
			return array3;
		}
		
		// --------------------------------------------------------------------------------
		function asyncOpen( url, callback ){

			var ajax = new XMLHttpRequest();
				
			ajax.open('GET', url);
			ajax.setRequestHeader('Cache-Control', 'no-cache');
				
			ajax.onreadystatechange = function()  {
							try
							{
								if  ( (this.readyState == 4) && (this.status == 200))
								{
									var text = ajax.response;
									if (text)
									{
										callback(text);
										return text;
									}	
									else
									{
										callback( null );
										return null;
									}	
								}
							}
							catch (e) {}
						};
			ajax.onerror = function(){
							callback( null );
							return null;
						};
				
			ajax.send(null);
		}
		
		// --------------------------------------------------------------------------------
		this.check_VK_Video = function( tabId, answer, url, link, callback ){
		
			var parsedMediaList = [];
			for (var i = 0; i < link.length; i++) 
			{
				if( link[i].id && link[i].id == "video_player" )
				{
					var flvVars = link[i].value;

					if (flvVars != null)	
					{
						var param_js = parse_str(flvVars);
						var title = fvdSingleDownloader.Utf8.decode( param_js['md_title'] );
						
						var url;

						if (param_js['hd']=="0")
						{
							if (param_js['no_flv']=="")
							{
								var proverka=param_js["host"].search(/(vkadre.ru)/i);
								if (proverka!=-1)
								{
									url = 'http://'+param_js["host"]+'/assets/videos/'+param_js["vtag"]+param_js["vkid"]+'.vk.flv';
									name = param_js["vkid"]+'.vk.flv';
									parsedMediaList.push( { url: url, title: title,	ext: "flv",	format: "Low[240p]",  quality: "240p",	downloadName: name,  type: "video", groupId: 0, 	orderField: 0} );
								}
								else
								{
									url = 'http://cs'+param_js["host"]+'.vk.com/u'+param_js["uid"]+'/videos/'+param_js["vtag"]+'.flv';
									name = param_js["vtag"]+'.flv';
									parsedMediaList.push( { url: url, title: title,	ext: "flv",	format: "Low[240p]",  quality: "240p",	downloadName: name,  type: "video", groupId: 0, 	orderField: 0} );
								}
							}
							if (param_js['no_flv']=="0")
							{
								var proverka=param_js["host"].search(/(vkadre.ru)/i);
								if (proverka!=-1)
								{
									url = 'http://'+param_js["host"]+'/assets/videos/'+param_js["vtag"]+param_js["vkid"]+'.vk.flv';
									name = param_js["vkid"]+'.vk.flv';
									parsedMediaList.push( { url: url, title: title,	ext: "flv",	format: "Low[240p]",  quality: "240p",	downloadName: name,  type: "video", groupId: 0, 	orderField: 0} );
								}
								else
								{
									url = 'http://cs'+param_js["host"]+'.vk.com/u'+param_js["uid"]+'/videos/'+param_js["vtag"]+'.flv';
									name = param_js["vtag"]+'.flv';
									parsedMediaList.push( { url: url, title: title,	ext: "flv",	format: "Low[240p]",  quality: "240p",	downloadName: name,  type: "video", groupId: 0, 	orderField: 0} );
								}
							}
							if (param_js['no_flv']=="1")
							{
								url = 'http://cs'+param_js["host"]+'.vk.com/u'+param_js["uid"]+'/videos/'+param_js["vtag"]+'.240.mp4';
								name = param_js["vtag"]+'.240.mp4';
								parsedMediaList.push( { url: url, title: title,	ext: "mp4",	format: "SD[240p]",  quality: "240p",	downloadName: name,  type: "video", groupId: 0, 	orderField: 0} );
							}
						}
						else if (param_js['hd']=="1")
						{       
							url = 'http://cs'+param_js["host"]+'.vk.com/u'+param_js["uid"]+'/videos/'+param_js["vtag"]+'.360.mp4';
							name = param_js["vtag"]+'.360.mp4';
							parsedMediaList.push( { url: url, title: title,	ext: "mp4",	format: "HD[360p]",  quality: "360p",	downloadName: name,  type: "video", groupId: 0, 	orderField: 0} );
								
							url = 'http://cs'+param_js["host"]+'.vk.com/u'+param_js["uid"]+'/videos/'+param_js["vtag"]+'.240.mp4';
							name = param_js["vtag"]+'.240.mp4';
							parsedMediaList.push( { url: url, title: title,	ext: "mp4",	format: "HD[240p]",  quality: "240p",	downloadName: name,  type: "video", groupId: 0, 	orderField: 0} );
						} 
						else if (param_js['hd']=="2")
						{      
							url = 'http://cs'+param_js["host"]+'.vk.com/u'+param_js["uid"]+'/videos/'+param_js["vtag"]+'.480.mp4';
							name = param_js["vtag"]+'.480.mp4';
							parsedMediaList.push( { url: url, title: title,	ext: "mp4",	format: "HD[480p]",  quality: "480p",	downloadName: name,  type: "video", groupId: 0, 	orderField: 0} );
								
							url = 'http://cs'+param_js["host"]+'.vk.com/u'+param_js["uid"]+'/videos/'+param_js["vtag"]+'.360.mp4';
							name = param_js["vtag"]+'.360.mp4';
							parsedMediaList.push( { url: url, title: title,	ext: "mp4",	format: "HD[360p]",  quality: "360p",	downloadName: name,  type: "video", groupId: 0, 	orderField: 0} );
								
							url = 'http://cs'+param_js["host"]+'.vk.com/u'+param_js["uid"]+'/videos/'+param_js["vtag"]+'.240.mp4';
							name = param_js["vtag"]+'.240.mp4';
							parsedMediaList.push( { url: url, title: title,	ext: "mp4",	format: "HD[240p]",  quality: "240p",	downloadName: name,  type: "video", groupId: 0, 	orderField: 0} );
						} 
						else if (param_js['hd']=="3")
						{       
							url = 'http://cs'+param_js["host"]+'.vk.com/u'+param_js["uid"]+'/videos/'+param_js["vtag"]+'.720.mp4';
							name = param_js["vtag"]+'.720.mp4';
							parsedMediaList.push( { url: url, title: title,	ext: "mp4",	format: "HD[720p]",  quality: "720p",	downloadName: name,  type: "video", groupId: 0, 	orderField: 0} );

							url = 'http://cs'+param_js["host"]+'.vk.com/u'+param_js["uid"]+'/videos/'+param_js["vtag"]+'.480.mp4';
							name = param_js["vtag"]+'.480.mp4';
							parsedMediaList.push( { url: url, title: title,	ext: "mp4",	format: "HD[480p]",  quality: "480p",	downloadName: name,  type: "video",	groupId: 0, 	orderField: 0} );
								
							url = 'http://cs'+param_js["host"]+'.vk.com/u'+param_js["uid"]+'/videos/'+param_js["vtag"]+'.360.mp4';
							name = param_js["vtag"]+'.360.mp4';
							parsedMediaList.push( { url: url, title: title,	ext: "mp4",	format: "HD[360p]",  quality: "360p",	downloadName: name,  type: "video", groupId: 0, 	orderField: 0} );
								
							url = 'http://cs'+param_js["host"]+'.vk.com/u'+param_js["uid"]+'/videos/'+param_js["vtag"]+'.240.mp4';
							name = param_js["vtag"]+'.240.mp4';
							parsedMediaList.push( { url: url, title: title,	ext: "mp4",	format: "HD[240p]",  quality: "240p",	downloadName: name,  type: "video", groupId: 0, 	orderField: 0} );
						} 		   			 
					}	
				}
			}	
			
			if ( parsedMediaList.length > 0 )
			{
				callback( parsedMediaList, tabId );

				if ( _b(fvdSingleDownloader.Prefs.get( "fvd.display_vk_button" ) )) {			
					fvdSingleDownloader.ContentScriptController.processMessage( tabId, {
										action: "insertVKButton",
										media: parsedMediaList
									} );				
				}					
			}	
			return true;
		}
		
		// --------------------------------------------------------------------------------
		this.check_VK_Audio = function( tabId, answer, url, link, callback ){
	
			var parsedMediaList = [];
			for (var i = 0; i < link.length; i++) 
			{
				if( link[i].type == "audio" )
				{
					var m = fvdSingleDownloader.Utils.convertURL(link[i].url);

					var result = {				
									url: link[i].url,
									title: link[i].title,
									ext: m.ext,
									format: link[i].value,
									downloadName: link[i].title + "." + m.ext,
									type: "audio",
									size: null,
									groupId: 0,
									orderField: 0
								};
									
					parsedMediaList.push(result);
				}	
				else
				{
					var m = prepareMedia( link[i] );
						
					if (m) parsedMediaList.push(m);
				}
			}
			
			if ( parsedMediaList.length > 0 )
			{
				callback( parsedMediaList, tabId );

				fvdSingleDownloader.ContentScriptController.processMessage( tabId, {
									action: "insertVKIcon",
									media: parsedMediaList
								} );				
			}	

		}
		
		// --------------------------------------------------------------------------------
		function convertEscapedCodesToCodes(str, prefix, base, num_bits) {
			var parts = str.split(prefix);
			parts.shift();  // Trim the first element.
			var codes = [];
			var max = Math.pow(2, num_bits);
			for (var i = 0; i < parts.length; ++i) 
			{
				var code = parseInt(parts[i], base);
				if (code >= 0 && code < max) 
				{
					codes.push(code);
				} 
				else 
				{
					// Malformed code ignored.
				}
			}
			return codes;
		}

		function convertEscapedUtf16CodesToUtf16Codes(str) {
			return convertEscapedCodesToCodes(str, "\\u", 16, 16);
		}

		function convertUtf16CodesToString(utf16_codes) {
			var unescaped = '';
			for (var i = 0; i < utf16_codes.length; ++i) 
			{
				unescaped += String.fromCharCode(utf16_codes[i]);
			}
			return unescaped;
		}
		
		function unescapeFromUtf16(str)  {
			var utf16_codes = convertEscapedUtf16CodesToUtf16Codes(str);
			return convertUtf16CodesToString(utf16_codes);
		}

		// --------------------------------------------------------------------------------
		this.check_DM_Video = function( tabId, answer, url, videoId, callback ){
		
			// send request to DailyMotion
			var ajax = new XMLHttpRequest();
			ajax.open('GET', "http://www.dailymotion.com/embed/video/"+videoId, true);
			ajax.setRequestHeader('Cache-Control', 'no-cache');
			
			ajax.onload = function(){
						var content = this.responseText;
						
						var m=/var *info *= *(.*),/.exec(content);
						var mediaFound = false;
						var parsedMediaList = [];
						
						if(m)	{
							var info=JSON.parse(m[1]);
						
							var tags={	"h264": 		{  	label: "MEDIUM",		},
										"h264_hd1080": 	{	label: "HD1080",		},
										"h264_hd720": 	{	label: "HD720",			},
										"h264_hq": 		{	label: "HQ",			},
										"h264_hd": 		{	label: "HD",			},
										"h264_sd": 		{	label: "SD",			},
										"h264_ld": 		{	label: "LD",			},
									}
									
							for(var tag in tags) 	{

								var url=info['stream_'+tag+'_url'];

								if( url )  {
								
									var title = info['title'];
									if (title) baseFileName = title;		
									var label=tags[tag].label;
									var extension="flv";
									var mExt=/\.([0-9a-zA-Z]+)(?:$|\?)/.exec(url);
									if(mExt)  extension=mExt[1];

									var media =  {
												url: url,
												title: title,
												downloadName: "["+label+"] "+baseFileName+"."+extension,
												displayName: baseFileName + "." + extension,
												quality: label,
												ext: extension,
												format: label,
												type: "video",
												size: null,
												groupId: 0,
												orderField: 0
											};
                   
									parsedMediaList.push(media);
					                mediaFound = true;
								}
							}
							
							if ( parsedMediaList.length > 0 )	{
								callback( parsedMediaList, tabId );

								fvdSingleDownloader.ContentScriptController.processMessage( tabId, {
													action: "insertDMButton",
													media: parsedMediaList
												} );				
							}	
							return true;
							

							if ( mediaFound )	callback( parsedMediaList );
						} 
						
			}
			
			ajax.onerror = function(){
				callback( null );
			}
			
			ajax.send( null );
		
		}
		
		// --------------------------------------------------------------------------------
/*		this.check_FB_Video = function( tabId, answer, url, link, title, callback ){

			var mediaFound = false;
			var parsedMediaList = [];
			
			if (!link || link.length == 0) return;

			var param = link[0].value;
			var list = {};
			param.split('&').forEach(function(el, i, a){
							var mk = el.split('=');
							if (mk.length == 2) {
							  list[mk[0]] = decodeURIComponent(mk[1]);
							}
						  });
			console.log(list);						  
			param = JSON.parse(list['params']);		
			console.log(param);			
			
			if ('video_data' in param && param['video_data']['progressive'].length>0) {
			
				var videoData = param['video_data']['progressive'][0];
				var url = videoData['sd_src'];
				var videoId = videoData['video_id'];
				
				var extension = "mp4";
				var m = url.split('?');
				var k = m[0].lastIndexOf('.');
				if (k != -1) extension = m[0].substring(k+1);
				
				title = title.replace(" | Facebook", "");
				m  = /^\"(.*)\"$/.exec(title);
				if (m)	title = m[1];
				
				
				console.log(title);
				
				var media =  {
							url:    url,
							title:  title,
							downloadName: videoId+"."+extension,
							displayName: videoId + "." + extension,
							ext: extension,
							format: title,
							type: "video",
							size: null,
							groupId: 0,
							orderField: 0
						};
						
				parsedMediaList.push(media);
				mediaFound = true;	
			}	
					
			if ( mediaFound )	callback( parsedMediaList, tabId );
		
		}*/
		
		// --------------------------------------------------------------------------------
		this.getPage_All_URLs = function( url, tab, callback ){
			
			if( (url.toLowerCase().indexOf( "vk.com/video" ) != -1) && (url.length > 19) )		{
				fvdSingleDownloader.Media.Storage.removeTabSourceData( tab.id, "SitePage" );
				callback( { command: "Get_VK_Video", tip: "embed", answer: "vk_video", tabId: tab.id } );
				return "vk_video";
			}
			else if ( /http(s)?:\/\/vk\.com\/search\?([^\.\/]+)\&z=video/i.test(url) )	{
				fvdSingleDownloader.Media.Storage.removeTabSourceData( tab.id, "SitePage" );
				callback( { command: "Get_VK_Video", tip: "embed", answer: "vk_video", tabId: tab.id } );
				return "vk_video";
			}
			else if ( /(www\.)?dailymotion(\.co)?\.([^\.\/]+)\//i.test(url) )	{
				fvdSingleDownloader.Media.Storage.removeTabSourceData( tab.id, "SitePage" );
				callback( { command: "Get_DM_Video", tip: "meta", answer: "dm_video", tabId: tab.id } );
				return "dm_video";
			}
/* 			else if ( /www\.facebook\.com\/(.*)\/videos/i.test(url) )	{
				fvdSingleDownloader.Media.Storage.removeTabSourceData( tab.id, "SitePage" );
				callback( { command: "Get_Links", tip: "embed", answer: "fb_video", tabId: tab.id } );
				return "fb_video";
			} */
			
		}
		
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
		
		
		const DISPLAY_FVDSD_RATE_SHOW = 3600 * 24 * 1 * 1000; // one day
		//const DISPLAY_FVDSD_RATE_SHOW = 1000; // test
		
		// --------------------------------------------------------------------------------
		this.Rate_Message = function( tabId, type, url ){

			var xx = "rate.display_"+type;
			var flag = _b(fvdSingleDownloader.Prefs.get( xx ));
			
			if (flag) {
				var xx = "rate.last_show_"+type;
				var last = parseInt(fvdSingleDownloader.Prefs.get( xx ));

				last += DISPLAY_FVDSD_RATE_SHOW;
				
				var current_dt = new Date();
				var current_time = current_dt.getTime();
				
				if (last > current_time) flag = false;
			}
			
			if (flag)	{
				fvdSingleDownloader.Prefs.set( xx, current_time );
				
				fvdSingleDownloader.ContentScriptController.processMessage( tabId, {
									action: "canShowRateDialog",
									type: type,
									url: url
								} );				
			}
		}
		
		// --------------------------------------------------------------------------------
		this.Dont_Rate_Message = function( type ){
		
			var xx ="rate.display_"+type;
			fvdSingleDownloader.Prefs.set( xx, false );
		
		}
		
		// --------------------------------------------------------------------------------
		this.checkPage_Change = function( data, callback ){
			
			var url = data.url;
			
			if (url.indexOf("vk.com/al_audio.php?__query=audio") != -1)  return true;
			
			if ( /www\.facebook\.com\/(.*)\/videos/i.test(url) )	  return true;
			
			return false;
		}
		
		
		// --------------------------------------------------------------------------------
		this.getContentFromYoutubePage = function( videoId, callback ){
			getContentFromYoutubePage( videoId, callback );
		}
		
		// --------------------------------------------------------------------------------
		this.onMediaDetect = {
						addListener: function( callback ){
						
									if( mediaDetectCallbacks.indexOf( callback ) == -1 )
									{
										mediaDetectCallbacks.push( callback );
									}
									
								}
					}
		
		// --------------------------------------------------------------------------------
		this.isEqualItems = function( item1, item2 ){
			
			if(  item1.url == item2.url  )
			{
				return true;
			}	
			
			return false;
			
		}
		
		// --------------------------------------------------------------------------------
		chrome.extension.onRequest.addListener ( function(request, sender, sendResponse) {        
	
						if(request.akce=="Page_URL")	{
							self.getPage_All_URLs(request.url, sender.tab, sendResponse );  
						}
						else if(request.akce=="Get_VK_Audio")	{
							if (request.tabId == sender.tab.id)		{
								self.check_VK_Audio(request.tabId, request.answer, request.url, request.link, function( mediaToSave, tabId )  {

																if( mediaToSave )	{
																	storeMedia( mediaToSave, tabId );
																}
																
															} );
							}	
						}
						else if(request.akce=="Get_VK_Video")	{
						
							if (request.tabId == sender.tab.id)		{

								if( request.link )	{
									storeMedia( request.link, request.tabId );
									
									if ( _b(fvdSingleDownloader.Prefs.get( "fvd.display_vk_button" ) )) {			
										fvdSingleDownloader.ContentScriptController.processMessage( request.tabId, {
														action: "insertVKButton",
														media: request.link
													} );				
									}				
									
								}
							}	
						}
/* 						else if(request.akce=="Get_VK_Video")	{
						
							if (request.tabId == sender.tab.id)		{
								self.check_VK_Video(request.tabId, request.answer, request.url, request.link, function( mediaToSave, tabId )  {

																if( mediaToSave )	{
																	storeMedia( mediaToSave, tabId );
																}
																
															} );
							}	
						}*/
 						else if(request.akce=="Get_DM_Video")	{
							if (request.tabId == sender.tab.id)  	{
								self.check_DM_Video(request.tabId, request.answer, request.url, request.videoId, function( mediaToSave, tabId ){

																if( mediaToSave )	{
																	storeMedia( mediaToSave, tabId );
																}
																
															} );
							}	
						}
						else if(request.akce=="dontDisplayRateMessage")		{
						
							self.Dont_Rate_Message(request.type);
							
						}
 						else if(request.akce=="Get_Links")	{
							if (request.tabId == sender.tab.id)		{
			
/*  								self.check_FB_Video(request.tabId, request.answer, request.url, request.link, request.title, function( mediaToSave, tabId )  {

																if( mediaToSave )	{
																	storeMedia( mediaToSave, tabId );
																}
																
															} );  */
							}	
						}
						
					});
					
					
        chrome.webRequest.onResponseStarted.addListener(function(data){

 							self.checkPage_Change( data ); 
			
					}, {
						urls: ["<all_urls>"],
						types: ["main_frame", "sub_frame", "stylesheet", "script", "image", "object",  "xmlhttprequest", "other"]
						}, ["responseHeaders"]);					
	
	}
	
	this.SitePage = new SitePage();
	
}).apply( fvdSingleDownloader.Media );
