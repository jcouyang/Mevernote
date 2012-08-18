/**
 * @author:
 * 	--> Jérôme GIRAUD
 */
ks.utils =
{
	/**
	 * 
	 */
	sizeElements: function()
	{
		scrollTo(0, 0, 0);
		
		var _h = window.innerHeight;
		var _w = window.innerWidth;
		
		wink.byId('wrapper').style.height = _h + 'px';
		wink.byId('wrapper').style.width = _w + 'px';
		
		if ( wink.isSet(wink.byId('splash')) )
		{
			wink.byId('splash').style.height = _h + 'px';
		}
		
		wink.byId('tests_scroller').style.height = _h - 64 + 'px';
		wink.byId('tests_scroller').style.width = _w + 'px';
		wink.byId('list_scroller').style.height = _h - 64 + 'px';
		wink.byId('list_scroller').style.width = _w + 'px';
		
		wink.byId('about_scroller').style.height = _h -2 + 'px';
		wink.byId('about_scroller').style.width = _w - 81 + 'px';
		
		wink.byId('container').style.height = _h + 'px';
		wink.byId('inputPane').style.height = _h + 'px';
		wink.byId('outputPane').style.height = _h + 'px';
		wink.byId('outputPane').style.width = '100%';
		wink.byId('syntaxPane').style.height = _h + 'px';
		wink.byId('syntaxPane').style.width = '100%';
		
		wink.byId('options').style.width = (_w - 81) + 'px';
	
		wink.byId('tests').style.width = _w + 'px';
		wink.byId('test').style.width = _w + 'px';
		
		wink.byId('testContent').style.minHeight = _h + 'px';
	}
};