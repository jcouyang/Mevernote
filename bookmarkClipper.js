/*******************************************************************************
 * Copyright 2008, Evernote Corporation. All Rights Reserved.
 * 
 * @author Philip Constantinou, pasha@evernote.com
 */

var logEnabled = false;
EN_CLIP_HOST = 'http://www.evernote.com';
/** ************** Inheritence *************** */
Function.prototype._FunctionOverrides = {};
if (typeof Function.prototype.inherit == 'function') {
  Function.prototype._FunctionOverrides.inherit = Function.prototype.inherit;
}
if (typeof Function.prototype.inherits == 'function') {
  Function.prototype._FunctionOverrides.inherits = Function.prototype.inherits;
}
Function.prototype.inherit = function(parentClassOrObject,
    includeConstructorDefs) {
  if (parentClassOrObject.constructor == Function) {
    // Normal Inheritance
    this.prototype = new parentClassOrObject;
    this.prototype.constructor = this;
    this.prototype.parent = parentClassOrObject.prototype;
    this.constructor.parent = parentClassOrObject;
  } else {
    // Pure Virtual Inheritance
    this.prototype = parentClassOrObject;
    this.prototype.constructor = this;
    this.prototype.parent = parentClassOrObject;
    this.constructor.parent = parentClassOrObject;
  }
  if (includeConstructorDefs) {
    for ( var i in parentClassOrObject.prototype.constructor) {
      if (i != "parent"
          && i != "prototype"
          && parentClassOrObject.constructor[i] != parentClassOrObject.prototype.constructor[i]) {
        this.prototype.constructor[i] = parentClassOrObject.prototype.constructor[i];
      }
    }
  }
  if (typeof this.prototype.handleInheritance == 'function') {
    this.prototype.handleInheritance.apply(this, arguments);
  }
  if (typeof this._FunctionOverrides == 'function') {
    this._FunctionOverrides.apply(this, arguments);
  }
  return this;
};
Function.prototype.inherits = function(parentClass) {
  return (typeof this.prototype.parent != 'undefined' && this.prototype.parent.constructor == parentClass);
};

/** ************** Clip *************** */
function Clip(aWindow, stylingStrategy) {
  this.initialize(aWindow, stylingStrategy);
}

Clip.constants = {
  isIE :(navigator.appVersion.indexOf("MSIE", 0) != -1),
  isSafari :(navigator.appVersion.indexOf("WebKit", 0) != -1),
  isFirefox :(navigator.userAgent.indexOf("Firefox", 0) != -1),
  isIpad: (navigator.userAgent.indexOf("WebKit") > 0 && navigator.userAgent.indexOf("iPad") > 0),
  isIphone: (navigator.userAgent.indexOf("WebKit") > 0 && navigator.userAgent.indexOf("iPhone") > 0),
  //defaultClipperURL :"http://evernote.local:8080"
   defaultClipperURL :"https://www.evernote.com"
};

Clip.NOKEEP_NODE_ATTRIBUTES = {
  "style" : null,
  "class" : null,
  "id" : null,
  "onclick": null,
  "onsubmit": null,
  "onmouseover": null,
  "onmouseout": null
};
Clip.NOKEEP_NODE_NAMES = {
  "style" : null,
  "script" : null,
  "input" : null,
  "select" : null,
  "option" : null,
  "textarea" : null
};
Clip.SELF_CLOSING_NODE_NAMES = {
  "base" : null,
  "basefont" : null,
  "frame" : null,
  "link" : null,
  "meta" : null,
  "area" : null,
  "br" : null,
  "col" : null,
  "hr" : null,
  "img" : null,
  "input" : null,
  "param" : null
};
Clip.NODE_NAME_TRANSLATIONS = {
  "body" : "div",
  "form" : "div"
};
Clip.LIST_NODE_NAMES = {
  "ul" : null,
  "ol" : null
};
Clip.HTMLEncode = function(str) {
  var result = "";
  for ( var i = 0; i < str.length; i++) {
    var charcode = str.charCodeAt(i);
    var aChar = str[i];
    if (charcode > 0x7f) {
      result += "&#" + charcode + ";";
    } else if (aChar == '>') {
      result += "&gt;";
    } else if (aChar == '<') {
      result += "&lt;";
    } else if (aChar == '&') {
      result += "&amp;";
    } else {
      //result += str[i];
      result += str.charAt(i);
    }
  }
  return result;
};
Clip.unicodeEntities = function(str) {
  var result = "";
  if (typeof str == 'string') {
    for (var i=0; i<str.length; i++) {
      var c = str.charCodeAt(i);
      if (c > 127) {
        result += "&#" + c + ";";
      } else {
        result += str.charAt(i);
      }
    }
  }
  return result;
};

Clip.prototype.title = null;
Clip.prototype.location = null;
Clip.prototype.baseHref = null;
Clip.prototype.window = null;
Clip.prototype.selectionFinder = null;
Clip.prototype.deep = true;
Clip.prototype.clipperURL = null;
Clip.prototype.stylingStrategy = null;

// Declares the content and source of a web clip
Clip.prototype.initialize = function(aWindow, stylingStrategy) {
  this.title = (typeof aWindow.document.title == 'string') ? (aWindow.document.title.replace(/[\s\t\n]+/g, " ").replace(/^\s+/, "").replace(/\s+$/, "")) : "";
  this.location = aWindow.location;
  this.window = aWindow;
  this.selectionFinder = new SelectionFinder(aWindow.document);
  this.range = null;
  this.initDocBase();
  if (stylingStrategy) {
    this.setStylingStrategy(stylingStrategy);
  }
};

Clip.prototype.isFullPage = function() {
  return !this.hasSelection();
};

Clip.prototype.hasSelection = function() {
  if (this.selectionFinder.hasSelection()) {
    return true;
  } else {
    this.findSelection();
    return this.selectionFinder.hasSelection();
  }
};
Clip.prototype.findSelection = function() {
  this.selectionFinder.find(this.deep);
};
Clip.prototype.getSelection = function() {
  if (this.hasSelection()) {
    return this.selectionFinder.selection;
  }
  return null;
};
Clip.prototype.getRange = function(idx) {
  if (this.hasSelection()) {
    return this.selectionFinder.getRange(idx);
  }
  return null;
};
Clip.prototype.hasBody = function() {
  return (this.window && this.window.document && this.window.document.body && this.window.document.body.tagName
      .toLowerCase() == "body");
};
Clip.prototype.hasContentToClip = function() {
  return (this.hasBody() || this.hasSelection());
};

/**
 * Captures all the content of the document
 */
Clip.prototype.clipBody = function() {
  if (!this.hasBody()) {
    if (logEnabled)
      console.log("Document has no body...");
    return false;
  }
  var s = 0;
  var e = 0;
  if (logEnabled) {
    console.log("Getting body text: " + this);
    s = new Date().getTime();
  }
  this.content = this.serializeDOMNode(wink.byId('previewPane'));

  /*
  if (Clip.constants.isIE) {
    this.content = Clip.unicodeEntities(this.window.document.body.innerHTML);
  } else {
    this.content = this.serializeDOMNode(this.window.document.body);
  }
  */
  if (logEnabled) {
    e = new Date().getTime();
    console.log("Clipped body in " + (e - s) + " seconds");
  }
  if (typeof this.content != 'string') {
    return false;
  }
  return true;
};

/**
 * Captures selection in the document
 */
Clip.prototype.clipSelection = function() {
  if (!this.hasSelection()) {
    if (logEnabled)
      console.log("No selection to clip");
    return false;
  }
  if (Clip.constants.isIE) {
    this.content = this.selectionFinder.selection.htmlText;
    return true;
  }
  var s = 0;
  var e = 0;
 
  var result = false;
  if (logEnabled) {
	s = new Date().getTime();
  }
 
  for (var i=0; i< this.selectionFinder.getRangeCount() ; i++) {
	  this.range = this.getRange(i);
	  if (this.range) {
	    if(!this.content ) {
			this.content = '';
  		}
	    this.content += this.serializeDOMNode(this.range.commonAncestorContainer);
	    result = true;
	  }
  }
  this.range = null;
  if (logEnabled) {
     if(result) {
   		e = new Date().getTime();
	    console.log("Success...");
	    console.log("Clipped selection in " + (e - s) + " seconds");
	 } else {
	 	console.log("Failure");
	 }
  }
  return result;
};

Clip.prototype.rangeIntersectsNode = function(node) {
  if (this.range) {
    var nodeRange = node.ownerDocument.createRange();
    try {
      nodeRange.selectNode(node);
    }
    catch (e) {
      nodeRange.selectNodeContents(node);
    }
  
    return this.range.compareBoundaryPoints(Range.START_TO_END, nodeRange) == 1 
      && this.range.compareBoundaryPoints(Range.END_TO_START, nodeRange) == -1;
  }
  return false;
};

Clip.prototype.serializeDOMNode = function(node, parentNode) {
  var str = "";
  if (this.range && !this.rangeIntersectsNode(node)) {
    if (logEnabled)
      console.log("Skipping serialization of node: " + node.nodeName
          + " cuz it's not in range...");
    return str;
  }
  if (!this.keepNode(node)) {
    if (logEnabled)
      console.log("Skipping seralization of node: " + node.nodeName
          + " cuz it's a no-keeper");
    return str;
  }
  if (logEnabled)
    console.log("SerializeDOMNode: " + node.nodeName);
  if (node.nodeType == 3) { // Text block
    if (logEnabled)
      console.log("Serializing text node...");
    if (this.range) {
      if (this.range.startContainer == node
          && this.range.startContainer == this.range.endContainer) {
        str += this.constructor.HTMLEncode(node.nodeValue.substring(
            this.range.startOffset, this.range.endOffset));
      } else if (this.range.startContainer == node) {
        str += this.constructor.HTMLEncode(node.nodeValue
            .substring(this.range.startOffset));
      } else if (this.range.endContainer == node) {
        str += this.constructor.HTMLEncode(node.nodeValue.substring(0,
            this.range.endOffset));
      } else if (this.range.commonAncestorContainer != node) {
        str += this.constructor.HTMLEncode(node.nodeValue);
      }
    } else {
      str += this.constructor.HTMLEncode(node.nodeValue);
    }
  } else if (node.nodeType == 1) {
    // ignore range ancestor as long as it's not a list container
    if (this.range && this.range.commonAncestorContainer == node
        && this.range.startContainer != this.range.commonAncestorContainer
        && !this.isListNode(node)) {
      if (logEnabled)
        console.log("Ignoring range ancestor: " + node.nodeName);
    } else {
      // serialize node
      if (logEnabled)
        console.log("Serializing node: " + node.nodeName);
      var translatedNodeName = this.translateNodeName(node);
      str += "<" + translatedNodeName;
      // include attrs
      var attrStr = this.nodeAttributesToString(node);
      if (attrStr.length > 0)
        str += " " + attrStr;
      // include style
      if (this.stylingStrategy) {
        if (logEnabled)
          console.log("Styling node: " + node.nodeName);
        var nodeStyle = this.stylingStrategy.styleForNode(node, parentNode);
        if (logEnabled)
          console.dir(nodeStyle);
        if (nodeStyle instanceof ClipStyle && nodeStyle.length > 0) {
          str += " style=\"" + nodeStyle.toString() + "\"";
        } else if (logEnabled) {
          console.log("Empty style...");
        }
      }
      if (!node.hasChildNodes() && this.isSelfClosingNode(node)) {
        if (logEnabled)
          console.log("Closing self-closing tag: " + node.nodeName);
        str += "/>";
      } else {
        str += ">";
      }
    }
    // recurse children
    if (node.nodeName.toLowerCase() != "iframe" && node.hasChildNodes()) {
      var children = node.childNodes;
      for ( var j = 0; j < children.length; j++) {
        var child = children[j];
        if (child != null && child.nodeType > 0 && child.nodeName != 'SCRIPT'
            && child.nodeName != 'IFRAME') {
          var childStr = this.serializeDOMNode(child, node);
          if (childStr && childStr.length > 0)
            str += childStr;
        }
      }
    }
    if (this.range && this.range.commonAncestorContainer == node
        && !this.isListNode(node)) {
      if (logEnabled)
        console.log("Ignoring range ancestor: " + node.nodeName);
    } else if (node.hasChildNodes() || !this.isSelfClosingNode(node)) {
      str += "</" + translatedNodeName + ">";
    }
  }
  return str;
};

Clip.prototype.keepNodeAttr = function(attrName) {
  return (typeof attrName == 'string' && typeof Clip.NOKEEP_NODE_ATTRIBUTES[attrName
      .toLowerCase()] == 'undefined');
};
Clip.prototype.keepNode = function(node) {
  if (node) {
    if (node.nodeType == 3) {
      return true;
    } else if (node.nodeType == 1) {
      if (node.nodeName.indexOf('#') == 0 || !this.isNodeVisible(node))
        return false;
      return (typeof Clip.NOKEEP_NODE_NAMES[node.nodeName.toLowerCase()] == 'undefined');
    }
  }
  return false;
};
Clip.prototype.isNodeVisible = function(node) {
  var display = this.getNodeStylePropertyValue(node, "display");
  return (display && display != "none");
};
Clip.prototype.isSelfClosingNode = function(node) {
  return (node && typeof Clip.SELF_CLOSING_NODE_NAMES[node.nodeName
      .toLowerCase()] != 'undefined');
};
Clip.prototype.isListNode = function(node) {
  return (node && node.nodeType == 1 && typeof Clip.LIST_NODE_NAMES[node.nodeName
      .toLowerCase()] != 'undefined');
};

Clip.prototype.nodeAttributesToString = function(node) {
  var str = "";
  var attrs = node.attributes;
  if (attrs != null) {
    for ( var i = 0; i < attrs.length; i++) {
      var a = attrs[i].nodeName.toLowerCase();
      var v = attrs[i].nodeValue;
      if (a == "href" && v.toLowerCase().indexOf("javascript:") == 0) {
        continue;
      }
      if (this.baseHref != null && (a == "src" || a == "href") && v != null &&  v.toLowerCase().indexOf("http") != 0) {
    	v = this.absoluteUrl(v, this.baseHref);
	  }
      if (this.keepNodeAttr(a) && v != null && v.length > 0) {
        str += attrs[i].nodeName + '=' + '"' + v + '" ';
      }
    }
  }
  return str.replace(/\s+$/, "");
};
Clip.prototype.translateNodeName = function(node) {
  if (typeof Clip.NODE_NAME_TRANSLATIONS[node.nodeName.toLowerCase()] != 'undefined') {
    return Clip.NODE_NAME_TRANSLATIONS[node.nodeName.toLowerCase()];
  }
  return node.nodeName;
};

Clip.prototype.initDocBase = function() {
	if(this.baseHref != null || this.window == null) {
      return;
	}
	
	var baseTags = this.window.document.getElementsByTagName("base");
	if (baseTags != null && baseTags.length > 0) {
		for ( var i = 0; i < baseTags.length; i++) {
			var url = baseTags[i].href;
			if (typeof url == "string" && url.indexOf("http") == 0) {
				this.baseHref = url;
			}
			if (this.baseHref != null) {
				break;
			}
		}
	}
	
};


Clip.prototype.absoluteUrl = function(url, base) {
	if (url.indexOf("//") == 0) {
		url = base.replace(/^([^:]+):.*$/, "$1") + ":" + url;
	} else {
		if (url.indexOf("/") == 0) {
			url = base.replace(/^(.*:\/\/[^\/]+).*$/, "$1") + url;
		} else {
			if (url.match(/^\.+\//)) {
				url = base.replace(/^(.*:\/\/[^\/]+).*$/, "$1") + "/" + url;
			} else {
				url = (base.charAt(base.length - 1) == "/") ? base + url : base + "/" + url;
			}
		}
    }
	return url;
};

/**
 * Returns CSS style for the given node as a ClipStyle object. If computed is
 * true, the style will be computed, otherwise - it would only contain style
 * attributes matching the node.
 */
Clip.prototype.getNodeStyle = function(node, computed, filter) {
  return ClipStyle.getNodeStyle(node, computed, filter);
};
Clip.prototype.getNodeStylePropertyValue = function(node, propName) {
  if (node && typeof node.nodeType == 'number' && node.nodeType == 1 && typeof propName == 'string') {
    var doc = node.ownerDocument;
    var view = null;
    try {
      view = (doc.defaultView) ? doc.defaultView : this.window;
    } catch(e) {
      if (logEnabled) {
        console.log("Could not obtain parent window... using default");
        view = this.window;
      }
    }
    if (typeof view.getComputedStyle == 'function') {
      var style = view.getComputedStyle(node, null);
      return style.getPropertyValue(propName);
    } else if (typeof node.currentStyle == 'object' && node.currentStyle != null){
      return node.currentStyle[propName];
    }
  }
  return null;
};

Clip.prototype.setStylingStrategy = function(strategy) {
  if (typeof strategy == 'function' && strategy.inherits(ClipStylingStrategy)) {
    this.stylingStrategy = new strategy(this.window);
  } else if (strategy instanceof ClipStylingStrategy) {
    this.stylingStrategy = strategy;
  } else if (strategy == null) {
    this.stylingStrategy = null;
  }
};
Clip.prototype.getStylingStrategy = function() {
  return this.stylingStrategy;
};

/**
 * Draw a floating div over the current page
 * 
 * @param clip
 * @param clippingForm
 * @param baseURL
 * @return
 */
Clip.prototype.showClipperPanel = function() {
  var panel;
  panel = this.div("e_clipper");
  panel.style.position = "absolute";
  panel.style.right = "0px";
  panel.style.zIndex = 100000;
  panel.style.margin = "10px";
  panel.style.top = this.scrollTop(this.window) + "px";

  var data;
  data = this.div("e_data", panel);
  data.style.position = "absolute";
  data.style.width = "0px";
  data.style.height = "0px";
  data.style.zIndex = 0;
  data.style.margin = "0px";
  data.style.top = "0px";

  var view;
  view = this.div("e_view", panel);
  view.style.backgroundColor = "white";
  view.style.zIndex = 2;
  view.style.width = "500px";
  view.style.height = "370px";
  view.style.border = "solid rgb(180,180,180)";
  view.style.borderWidth = "6px";
  view.style.overflow = "hidden";
  view.style.textOverflow = "clip";
  view.style.position = "fixed";
  view.style.top = "6px";
  view.style.right = "6px";
  view.innerHTML = '<iframe id="e_iframe" '
      + ' onLoad="p = document.getElementById(\'e_data\'); if (p && p.style) {c = p.style.zIndex; if (c==7) {p.parentNode.parentNode.removeChild(p.parentNode);} p.style.zIndex = ++c;}" ' 
      + 'name="e_iframe" src="'
      + this.clipperURL
      + '/loadingClip.html" scrolling="no" frameborder="0" style="width:100%; height:100%; '
      + 'border:1px; padding:0px; margin:0px;"></iframe>';
  this.window.document.body.appendChild(panel);
  this.window.document.body.appendChild(this.formContainer);
  this.form.submit();
};

Clip.prototype.scrollTop = function() {
  return this
      .filterResults(
          this.window.pageYOffset ? this.window.pageYOffset : 0,
          this.window.document.documentElement ? this.window.document.documentElement.scrollTop
              : 0,
          this.window.document.body ? this.window.document.body.scrollTop
              : 0);
};

Clip.prototype.filterResults = function(n_win, n_docel, n_body) {
  var n_result = n_win ? n_win : 0;
  if (n_docel && (!n_result || (n_result > n_docel)))
    n_result = n_docel;
  return n_body && (!n_result || (n_result > n_body)) ? n_body : n_result;
};

Clip.prototype.addQuicknote = function() {
  var quicknote = this.makeElement('input', this.form);
  quicknote.name = 'quicknote';
  quicknote.value = true;
  quicknote.type = 'text';
};

Clip.prototype.makeElement = function(elementName, parentElement) {
  var element;
  element = this.window.document.createElement(elementName);
  if (parentElement) {
    parentElement.appendChild(element);
  }
  return element;
};

Clip.prototype.addClippedText = function() {
  var body = this.makeElement('textarea', this.form);
  body.name = 'body';
  body.value = this.content;

  var title = this.makeElement('input', this.form);
  title.name = 'title';
  title.value = this.title;
  title.type = 'text';
};

Clip.prototype.makeForm = function() {
  var form;
  var target = 'e_iframe';
  var div = this.makeElement('div');
  div.style.display = 'none';
  div.id = "evernote_clip_form";
  form = this.makeElement('form', div);

  form.action = this.clipperURL + '/clip.action';
  form.method = 'POST';
  form.target = target || '_top';
  form.enctype = "multipart/form-data";
  form.acceptCharset = "UTF-8";
  form.name = "en_clip_form";

  var url = this.makeElement('input', form);
  url.name = 'url';
  url.value = this.location.href;
  url.type = 'text';
  
  var format = this.makeElement('input', form);
  format.name = 'format';
  format.value = 'microclip';
  format.type = 'text';

  this.form = form;
  this.formContainer = div;
};

Clip.prototype.div = function(id, parentElement) {
  var d = this.makeElement("div", parentElement);
  d.id = id;
  d.style.border = "0";
  d.style.margin = "0";
  d.style.padding = "0";
  d.style.position = "relative";

  return d;
};

Clip.prototype.setClipperURL = function(clipperURL) {
  // Convert post URL to SSL if the source page uses HTTPs and the Evernote
  // server
  // supports HTTPs.

  if (clipperURL.indexOf(':', 6) == -1) {
    clipperURL = "https:" + clipperURL.substring(5, clipperURL.length);
  }
  this.clipperURL = clipperURL;
};

Clip.prototype.toString = function() {
  return "Clip[" + this.location.href + "] " + this.title;
};

// return POSTable length of this Clip
Clip.prototype.getLength = function() {
  var total = 0;
  var o = this.toDataObject();
  for ( var i in o) {
    total += ("" + o[i]).length + i.length + 2;
  }
  total -= 1;
  return total;
};

Clip.prototype.toDataObject = function() {
  return {
    "content" : this.content,
    "title" : this.title,
    "url" : this.location.href,
    "fullPage" : this.isFullPage()
  };
}

/** ************** ClipStyle *************** */
/**
 * ClipStyle is a container for CSS styles. It is able to add and remove
 * CSSStyleRules (and parse CSSRuleList's for rules), as well as
 * CSSStyleDeclaration's and instances of itself.
 * 
 * ClipStyle provides a mechanism to serialize itself via toString(), and
 * reports its length via length property. It also provides a method to clone
 * itself and expects to be manipulated via addStyle and removeStyle.
 */
function ClipStyle(css, filter) {
  this.initialize(css, filter);
}
ClipStyle.stylePrefix = function(style) {
  if (typeof style == 'string') {
    var i=0;
    if ((i=style.indexOf("-")) > 0) {
      return style.substring(0,i);
    }
  }
  return style;
}
ClipStyle.prototype.length = 0;
ClipStyle.prototype.filter = null;
ClipStyle.prototype.initialize = function(css, filter) {
  if (filter)
    this.setFilter(filter);
  try {
    if (CSSRuleList && css instanceof CSSRuleList) {
      if (css.length > 0) {
        for ( var i = 0; i < css.length; i++) {
          this.addStyle(css[i].style);
        }
      }
    } else if (CSSStyleRule && css instanceof CSSStyleRule) {
      this.addStyle(css.style);
    } else if (CSSStyleDeclaration && css instanceof CSSStyleDeclaration) {
      this.addStyle(css);
    } else if (CSSCurrentStyleDeclaration && css instanceof CSSCurrentStyleDeclaration) {
      this.addStyle(css);
    }
  } catch(e) {
    if (logEnabled) {
      console.log("Error initializing ClipStyle: " + e);
    }
  }
};
ClipStyle.prototype.addStyle = function(style) {
  if (CSSStyleDeclaration && style instanceof CSSStyleDeclaration && style.length > 0) {
    for ( var i = 0; i < style.length; i++) {
      var prop = style[i];
      if (typeof this.filter == 'function' && !this.filter(prop)) {
        continue;
      }
      var val = style.getPropertyValue(prop);
      if (typeof this[prop] == 'undefined') {
        this.length++;
      }
      this[prop] = val;
    }
  } else if (CSSCurrentStyleDeclaration && style instanceof CSSCurrentStyleDeclaration) {
    for (var prop in style) {
      if (typeof this.filter == 'function' && !this.filter(prop))
        continue;
      this[prop] = style[prop];
    }
  } else if (style instanceof ClipStyle) {
    for ( var prop in style) {
      if (typeof this.constructor.prototype[prop] == 'undefined') {
        if (typeof this.filter == 'function' && !this.filter(prop)) {
          continue;
        }
        this[prop] = style[prop];
      }
    }
  } else if (typeof style == 'object' && style != null) {
    for ( var i in style) {
      if (typeof this.filter == 'function' && !this.filter(i)) {
        continue;
      }
      if (typeof style[i] != 'function'
          && typeof this.constructor.prototype[i] == 'undefined') {
        if (typeof this[i] == 'undefined') {
          this.length++;
        }
        this[i] = style[i];
      }
    }
  }
};
ClipStyle.prototype.removeStyle = function(style, fn) {
  var self = this;
  function rem(prop, value) {
    if (typeof self[prop] != 'undefined'
        && typeof self.constructor.prototype[prop] == 'undefined'
        && (typeof fn == 'function' || self[prop] == value)) {
      if (typeof fn != 'function'
          || (typeof fn == 'function' && fn(prop, self[prop], value))) {
        if (delete (self[prop]))
          self.length--;
      }
    }
  }
  if (style instanceof CSSStyleDeclaration && style.length > 0) {
    for ( var i = 0; i < style.length; i++) {
      var prop = style[i];
      rem(prop, style.getPropertyValue(prop));
    }
  } else if (style instanceof ClipStyle && style.length > 0) {
    for ( var prop in style) {
      rem(prop, style[prop]);
    }
  }
};
ClipStyle.prototype.removeStyleIgnoreValue = function(style) {
  this.removeStyle(style, function(prop, propValue, value) {
    return true;
  });
};
ClipStyle.styleInArray = function(style, styleArray) {
  if (typeof style != 'string' || !(styleArray instanceof Array))
    return false;
  var i = -1;
  var style = style.toLowerCase();
  var styleType = ((i = style.indexOf("-")) > 0) ? style.substring(0, i)
      .toLowerCase() : style.toLowerCase();
  for ( var i = 0; i < styleArray.length; i++) {
    if (styleArray[i] == style || styleArray[i] == styleType)
      return true;
  }
  return false;
};
/**
 * Derives to smaller set of style attributes by comparing differences with
 * given style and makes sure that style attributes in matchSyle are preserved.
 * This is useful for removing style attributes that are present in the parent
 * node. In that case, the instance will contain combined style attributes, and
 * the first argument to this function will be combined style attributes of the
 * parent node. The second argument will contain matched style attributes. The
 * result will contain only attributes that are free of duplicates while
 * preserving uniqueness of the style represented by this instance.
 */
ClipStyle.prototype.deriveStyle = function(style, matchStyle, keepArray) {
  this.removeStyle(style, function(prop, propValue, value) {
    if (keepArray instanceof Array && ClipStyle.styleInArray(prop, keepArray))
      return false;
    return (typeof matchStyle[prop] == 'undefined' && propValue == value);
  });
};
ClipStyle.prototype.setFilter = function(filter) {
  if (typeof filter == 'function') {
    this.filter = filter;
  } else if (filter == null) {
    this.filter = null;
  }
};
ClipStyle.prototype.getFilter = function() {
  return this.filter;
};
ClipStyle.prototype.mergeStyle = function(style, override) {
  if (style instanceof ClipStyle && style.length == 0) {
    for (var i in style) {
      if (typeof this.constructor.prototype[i] != 'undefined') {
        continue;
      }
      if (typeof this[i] == 'undefined' || override) {
        this[i] = style[i];
      }
    }
  }
};
ClipStyle.prototype.clone = function() {
  var clone = new ClipStyle();
  for ( var prop in this) {
    if (typeof this.constructor.prototype[prop] == 'undefined') {
      clone[prop] = this[prop];
    }
  }
  clone.length = this.length;
  return clone;
};
ClipStyle.prototype.toString = function() {
  var str = "";
  if (this.length > 0) {
    for ( var i in this) {
      if (typeof this[i] != 'string'
          || typeof this.constructor.prototype[i] != 'undefined'
          || this[i].length == 0)
        continue;
      str += i + ":" + this[i] + ";";
    }
  }
  return str;
};
ClipStyle.getNodeStyle = function(node, computed, filter) {
  var style = new ClipStyle();
  if (logEnabled)
    console.log(">>> NODE: " + node.nodeName + "/" + node.nodeType);
  if (node && typeof node.nodeType == 'number' && node.nodeType == 1) {
    var doc = node.ownerDocument;
    var view = null;
    try {
      view = (doc.defaultView) ? doc.defaultView : this.window;
    } catch (e) {
      if (logEnabled) {
        console.log("Could not obtain default view... using default window");
        view = this.window;
      }
    }
    if (computed) {
      if (logEnabled) {
        console.log(">>> Getting computed style");
      }
      if (typeof view.getComputedStyle == 'function') {
        style = new ClipStyle(view.getComputedStyle(node, null), filter);
      } else if (typeof node.currentStyle == 'object' && node.currentStyle != null) {
        style = new ClipStyle(node.currentStyle, filter);
      }
    } else if (typeof view.getMatchedCSSRules == 'function') {
      if (logEnabled)
        console.log(">>> Getting matched rules");
      style = new ClipStyle(view.getMatchedCSSRules(node), filter);
    } else {
      try {
        if (CSSStyleDeclaration && node.style instanceof CSSStyleDeclaration && node.style.length > 0) {
          style = new ClipStyle(node.style, filter);
        }
      } catch(e) {
        if (logEnabled) {
          console.log("Could not retrieve node style: " + e);
        }
      }
    }
  }
  if (logEnabled)
    console.log(">>> " + node.nodeName + " style: " + style.toString());
  return style;
};

/** ************** SelectionFinder *************** */
/**
 * SelectionFinder provides mechanism for finding selection on the page via
 * find(). It is able to traverse frames in order to find a selection. It will
 * report whether there's a selection via hasSelection(). After doing find(),
 * the selection is stored in the selection property, and the document property
 * will contain the document in which the selection was found. Find method will
 * only recurse documents if it was invoked as find(true), specifying to do
 * recursive search. You can use reset() to undo find().
 */
function SelectionFinder(document) {
  this.initDocument = document;
  this.document = document;
}
SelectionFinder.prototype.initDocument = null;
SelectionFinder.prototype.document = null;
SelectionFinder.prototype.selection = null;

SelectionFinder.prototype.findNestedDocuments = function(doc) {
  var documents = new Array();
  var frames = null;
  var iframes = null;
  try {
    frames = doc.getElementsByTagName("frame");
  } catch (e) {
    if (logEnabled) {
      console.log("Could not get all the frames in the document");
    }
  }
  if (frames && frames.length > 0) {
    for ( var i = 0; i < frames.length; i++) {
      documents.push(frames[i].contentDocument);
    }
  }
  try {
    iframes = doc.getElementsByTagName("iframe");
  } catch (e) {
    if (logEnabled) {
      console.log("Could not get all iframes in document");
    }
  }
  try {
    if (iframes && iframes.length > 0) {
      for ( var i = 0; i < iframes.length; i++) {
        var doc = iframes[i].contentDocument;
        if (doc) {
          documents.push(doc);
        }
      }
    }
  } catch (e) {
  }
  return documents;
};
SelectionFinder.prototype.reset = function() {
  this.document = this.initDocument;
  this.selection = null;
};
SelectionFinder.prototype.hasSelection = function() {
  if (Clip.constants.isIE) {
    return (this.selection && this.selection.htmlText && this.selection.htmlText.length > 0);
  }
  var range = this.getRange();
  if (range
      && (range.startContainer != range.endContainer || (range.startContainer == range.endContainer && range.startOffset != range.endOffset))) {
    return true;
  }
  return false;
};
SelectionFinder.prototype.find = function(deep) {
  var sel = this._findSelectionInDocument(this.document, deep);
  this.document = sel.document;
  this.selection = sel.selection;
};

SelectionFinder.prototype.getRange = function(idx) {
  if (!this.selection || this.selection.rangeCount == 0) {
    return null;
  }
  if(!idx) {
    idx = 0;
  } 
  if (typeof this.selection.getRangeAt == 'function') {
    return this.selection.getRangeAt(idx);
  } else {
    var range = this.document.createRange();
    range.setStart(this.selection.anchorNode, this.selection.anchorOffset);
    range.setEnd(this.selection.focusNode, this.selection.focusOffset);
    return range;
  }
  return null;
};
SelectionFinder.prototype.getRangeCount = function() {
	if (!this.selection) {
		return 0;
	}
	if (typeof this.selection.getRangeAt == 'function') {
		return this.selection.rangeCount ;
	} else {
		return 1;
	}
};
SelectionFinder.prototype._findSelectionInDocument = function(doc, deep) {
  var sel = null;
  var hasSelection = false;
  var win = null;
  try {
    win = (doc.defaultView) ? doc.defaultView : window;
  } catch (e) {
    if (logEnabled) {
      console.log("Could not retrieve default view... using default window");
    }
    win = window;
  }
  if (typeof win.getSelection == 'function') {
    sel = win.getSelection();
    if (sel && typeof sel.rangeCount != 'undefined' && sel.rangeCount > 0) {
      hasSelection = true;
    }
  } else if (win.selection && typeof win.selection.createRange == 'function') {
    sel = win.selection.createRange();
    if (typeof win.selection.type == 'Text' && typeof sel.htmlText == 'string' && sel.htmlText.length > 0) {
      hasSelection = true;
    }
  } else if (doc.selection && doc.selection.createRange) {
    sel = doc.selection.createRange();
    if (typeof doc.selection.type == 'Text' && typeof sel.htmlText == 'string' && sel.htmlText.length > 0) {
      hasSelection = true;
    }
  }
  if (sel && !hasSelection && deep) {
    if (logEnabled)
      console.log("Empty range, trying frames");
    var nestedDocs = this.findNestedDocuments(doc);
    if (logEnabled)
      console.log("# of nested docs: " + nestedDocs.length);
    if (nestedDocs.length > 0) {
      for ( var i = 0; i < nestedDocs.length; i++) {
        if (nestedDocs[i]) {
          if (logEnabled)
            console.log("Trying nested doc: " + nestedDocs[i]);
          var framedSel = this._findSelectionInDocument(nestedDocs[i], deep);
          if (framedSel && framedSel.selection && framedSel.selection.rangeCount > 0) {
            return framedSel;
          }
        }
      }
    }
  }
  return {
    document : doc,
    selection : sel
  };
};

/** ************** ClipStylingStrategy *************** */
function ClipStylingStrategy(window) {
  this.initialize(window);
};
ClipStylingStrategy.prototype.initialize = function(window) {
  this.window = window;
};
ClipStylingStrategy.prototype.styleForNode = function(node, parentNode) {
  return null;
};
ClipStylingStrategy.prototype.getNodeStyle = function(node, computed, filter) {
  return ClipStyle.getNodeStyle(node, computed, filter);
};

function ClipTextStylingStrategy(window) {
  this.initialize(window);
};
ClipTextStylingStrategy.inherit(ClipStylingStrategy);
ClipTextStylingStrategy.FORMAT_NODE_NAMES = {
  "b" : null,
  "big" : null,
  "em" : null,
  "i" : null,
  "small" : null,
  "strong" : null,
  "sub" : null,
  "sup" : null,
  "ins" : null,
  "del" : null,
  "s" : null,
  "strike" : null,
  "u" : null,
  "code" : null,
  "kbd" : null,
  "samp" : null,
  "tt" : null,
  "var" : null,
  "pre" : null,
  "listing" : null,
  "plaintext" : null,
  "xmp" : null,
  "abbr" : null,
  "acronym" : null,
  "address" : null,
  "bdo" : null,
  "blockquote" : null,
  "q" : null,
  "cite" : null,
  "dfn" : null
};
ClipTextStylingStrategy.STYLE_ATTRS = {
  "font" : null,
  "text" : null,
  "color": null
};
ClipTextStylingStrategy.prototype.isFormatNode = function(node) {
  return (node && node.nodeType == 1 && typeof ClipTextStylingStrategy.FORMAT_NODE_NAMES[node.nodeName
      .toLowerCase()] != 'undefined');
};
ClipTextStylingStrategy.prototype.hasTextNodes = function(node) {
  if (node && node.nodeType == 1 && node.childNodes.length > 0) {
    for ( var i = 0; i < node.childNodes.length; i++) {
      if (node.childNodes[i].nodeType == 3) {
        if (logEnabled) {
          console.log("Node " + node.nodeName + " has text nodes");
        }
        return true;
      }
    }
  }
  return false;
};
ClipTextStylingStrategy.prototype.styleFilter = function(style) {
  var s = ClipStyle.stylePrefix(style.toLowerCase());
  if (typeof ClipTextStylingStrategy.STYLE_ATTRS[s] != 'undefined') {
    return true;
  } else if (logEnabled){
    console.log("Filter excluding: " + style);
  }
};
ClipTextStylingStrategy.prototype.styleForNode = function(node, parentNode) {
  var nodeStyle = null;
  if (this.isFormatNode(node) || this.hasTextNodes(node)) {
    nodeStyle = this.getNodeStyle(node, true, this.styleFilter);
  }
  return nodeStyle;
};

function ClipFullStylingStrategy(window) {
  this.initialize(window);
};
ClipFullStylingStrategy.inherit(ClipStylingStrategy);
ClipFullStylingStrategy.ALWAYS_KEEP = {
    "*": [ "font", "text", "color", "margin", "padding" ],
    "img": ["width", "height", "border"],
    "li": ["list", "margin", "padding"],
    "ul": ["list", "margin", "padding"],
    "dl": ["margin", "padding"],
    "dt": ["margin", "padding"],
    "h1": ["margin", "padding"],
    "h2": ["margin", "padding"],
    "h3": ["margin", "padding"],
    "h4": ["margin", "padding"],
    "h5": ["margin", "padding"],
    "h6": ["margin", "padding"],
    "h7": ["margin", "padding"],
    "h8": ["margin", "padding"],
    "h9": ["margin", "padding"],
    "form": ["height", "width", "margin", "padding"]
};
ClipFullStylingStrategy.prototype.styleForNode = function(node, parentNode) {
  var nodeStyle = null;
  if (node && node.nodeType == 1) {
    nodeStyle = this.getNodeStyle(node, true);
    if (parentNode) {
      if (logEnabled)
        console.log("Deriving style...");
      var nodeMatchedStyle = this.getNodeStyle(node, false);
      var parentStyle = this.getNodeStyle(parentNode, true);
      var keepers = (typeof ClipFullStylingStrategy.ALWAYS_KEEP[node.nodeName.toLowerCase()] != 'undefined') ? ClipFullStylingStrategy.ALWAYS_KEEP[node.nodeName.toLowerCase()] : ClipFullStylingStrategy.ALWAYS_KEEP["*"];
      if (nodeMatchedStyle && nodeMatchedStyle.length > 0 && parentStyle && parentStyle.length > 0) {
        nodeStyle.deriveStyle(parentStyle, nodeMatchedStyle, keepers);
      }
    }
  }
  return nodeStyle;
};

function debugObj(label, obj) {
  return ;
  var str = "";
  for ( var p in obj) {
    str += (p + ":" + obj[p] + "\n\n");
  }
  alert(label + "*******\n" + str);
}

/*******************************************************************************
 * ClipManager
 */

function ClipManager(clipURL, stylingStrategy) {
  var aWindow = null;
  try {
    aWindow = (typeof window_clipped_to_en != 'undefined') ? window_clipped_to_en : window;
  } catch (e) {
    aWindow = window;
  }
  // Replace beta clipper with real site
  if (clipURL == 'https://www.evernote.com') {
    clipURL = Clip.constants.defaultClipperURL;
  }
  // Test to see if there's selected text
  try {
    this.clip = new Clip(aWindow, stylingStrategy);
    this.clip.setClipperURL(clipURL);
    // change stylingStrategy for mobile devices
    if ((Clip.constants.isIphone || Clip.constants.isIpad)) {
      if (this.clip.hasSelection()) {
        this.clip.setStylingStrategy(ClipFullStylingStrategy);
      } else {
        this.clip.setStylingStrategy(ClipTextStylingStrategy);
      }
    }
  } catch(e) {
    alert("Error: " + e);
  }
}

ClipManager.prototype.quicknote = function() {
  this.clip.makeForm();
  this.clip.addQuicknote();
};

ClipManager.prototype.clipPage = function() {
  if (this.clip.hasSelection() && this.clip.clipSelection()) {
    debugObj("Successful clip of selection", this.clip);
  } else {
    try {
      if (!this.clip.clipBody()) {
        alert('Sorry, Evernote cannot clip this entire page. Please select the portion you wish to clip.');
        return false;
      }
    } catch (e) {
      // Can't construct a clip -- usually because the body is a frame
      alert('Sorry, Evernote cannot clip this entire page. Please select the portion you wish to clip.');
      return false;
    }
  }
  debugObj("Making form");
  this.clip.makeForm();
  debugObj("Adding text");
  this.clip.addClippedText();
  if (this.clip.isFullPage()) {
    debugObj("Adding quicknote.");
    this.clip.addQuicknote();
  }
  return true;
};

ClipManager.prototype.clipSelection = function() {
  var isSelection = this.clip.clipSelection();
  this.clip.makeForm();
  if (isSelection) {
    this.clip.addClippedText();
  } else {
    this.clip.addQuicknote();
  }
  return true;
};


ClipManager.prototype.submit = function() {
  this.clip.showClipperPanel();
};

/**
 * Sends the clip to the provide service's clipping URL
 * 
 * @param clipURL
 */
function EN_clip(clipURL, stylingStrategy) {
  if (typeof stylingStrategy == 'undefined') {
    stylingStrategy = ClipFullStylingStrategy;
  }
  var clipManager = new ClipManager(clipURL, stylingStrategy);
  if (clipManager.clipPage() == false) {
    alert('Sorry, Evernote cannot clip this entire page. Please select the portion you wish to clip.');
  } else {
    clipManager.submit();
  }
}
EN_clip.STYLE_NONE = null;
EN_clip.STYLE_TEXT = ClipTextStylingStrategy;
EN_clip.STYLE_FULL = ClipFullStylingStrategy;

/*******************************************************************************
 * Start clipper
 */
evernoteClip = function(){


var EN_clipPanelShown = false; 
var EN_loaderStarted = new Date().getTime();
var EN_loaderTimeout = 10 * 1000; // wait 10 seconds before timing out while waiting for the page to finish loading
var EN_loader = setInterval(function() {
  var now = new Date().getTime();
  console.log('here')
  if ((typeof document.readyState != 'undefined' && document.readyState == "complete") || now > (EN_loaderStarted + EN_loaderTimeout) ) {
    console.log('meet require')
    clearInterval(EN_loader);
    EN_loader = null;
    try {
      var style = null;
      if (Clip.constants.isSafari) {
        style = ClipTextStylingStrategy;
      } else if (Clip.constants.isFirefox) {
        style = ClipTextStylingStrategy;
      }
      if (typeof EN_CLIP_STYLE == 'string') {
        if (typeof EN_clip["STYLE_" + EN_CLIP_STYLE.toUpperCase()] != 'undefined') {
          style = EN_clip["STYLE_" + EN_CLIP_STYLE.toUpperCase()];
        }
      }
      if(!EN_clipPanelShown) {
       EN_clip(EN_CLIP_HOST, style);
       EN_clipPanelShown = true;
      }
      
    } catch (e) {
      console.log('erre',e)
      debugObj("Clipping error", e);
    }
  }
}, 1000);
}