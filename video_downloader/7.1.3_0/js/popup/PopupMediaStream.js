(function(){
	
	var PopupMediaStream = function(){
		
		var self = this;
		
		// ----------------------------------------------
		this.show = function( item, media ){		
		
			function fbc( className ){
				return item.getElementsByClassName(className)[0];
			}
		
			var m = fvdSingleDownloader.Media.Storage.getDataForHash( media.yt_hash );
			if (m && m.status == 'start') {
				media.status = m.status;				
			}
			
			fbc("info").setAttribute( "streamHash", media.yt_hash );
			fbc("download_url").setAttribute( "status", media.status );
			if (media.status == 'stop') {
				fbc("text").textContent = 'Start';
				fbc("text").parentNode.style['background'] = '-webkit-linear-gradient(90deg, #4da5d8, #58d2fd)';
				if( media.size )  {
					fbc("size").removeAttribute( "loading" );
					fbc("size").textContent = str_download_size(media.size);
				}
				else  {
					fbc("size").setAttribute( "loading", 2 );
				} 
			}	
			else {
				fbc("text").textContent = 'Stop';
				fbc("text").parentNode.style['background'] = '-webkit-linear-gradient(90deg, #FC2B53, #F9869C)';
				fbc("size").removeAttribute( "loading" );
				fbc("size").textContent = str_download_size(media.size);
				
			}	
			
			if (media.icons) extImage = 'images/formats/'+media.icons;
		};

		// ----------------------------------------------
		this.click = function( item, media ){		
		
			console.log('fvdSingleDownloader.Popup.PopuMediaStream', item, media);
			
			var e_url =	item.getElementsByClassName("download_url")[0];								
			var e_txt =	item.getElementsByClassName("text")[0];								
			var e_siz =	item.getElementsByClassName("size")[0];								
			var st = e_url.getAttribute( "status" );
			
			if ( st == 'stop') {
				fvdSingleDownloader.Media.startCombineDownload( media, function(size) { 
					e_siz.textContent = str_download_size(size);
					media.size = size;
				});
				e_url.setAttribute( "status", 'start' );
				e_txt.textContent = 'Stop';
				e_txt.parentNode.style['background'] = '-webkit-linear-gradient(90deg, #FC2B53, #F9869C)';
				fvdSingleDownloader.Media.Storage.setTwitch( media.yt_hash, 'start', null );
				media.status = 'start';
			}
			else {
				fvdSingleDownloader.Media.stopCombineDownload( media );
				e_url.setAttribute( "status", 'stop' );
				e_txt.textContent = 'Start';
				e_txt.parentNode.style['background'] = '-webkit-linear-gradient(90deg, #4da5d8, #58d2fd)';
				fvdSingleDownloader.Media.Storage.setTwitch( media.yt_hash, 'stop', null );
				media.status = 'stop';
			}	
			e_siz.removeAttribute( "loading" );
				
		};		
		
		// ---------------------------------------------- 
		function str_download_size( size ) {
		
			if (size<1073741824)    return fvdSingleDownloader.Utils.bytesToMb(size) + "MB";
			        else return fvdSingleDownloader.Utils.bytesToGb(size) + "GB";
		
		}
		// ---------------------------------------------- 

		
	}
	
	this.PopupMediaStream = new PopupMediaStream();
	
}).apply( fvdSingleDownloader.Popup );
