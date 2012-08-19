---
layout: post
title: "Mevernote Introduce &amp; Develop Log"
date: 2012-08-19 17:56
comments: true
categories: ["BlackBerry","HTML5","Mevernote"]
---

Mevernote
=======

> Checkout latest source at <https://github.com/geogeo/Mevernote> :)
By Mevernote, you can write down you note in Markdown language, preview it
in HTML format, and push it to Evernote™. And later feature will include  sync Markdown Source with Dropbox™

>一直在找合适的Markdown记事本, 可以同步Evernote™及Dropbox™, 无奈自己写一个

>under MIT License, 欢迎随便pull request以改进或修正bugs. 时间仓促, 代码很乱, 找完工作有时间收拾,  欢迎各种pull

Writen in pure HTML5, so you can checkout live demo at  <http://geogeo.github.com/Mevernote>  with any **WebKit** Browser like Chrome, Safari or any of your Smart Phone.

## Features:
* Syntax Highlight of you Markdown code
* HTML output for review with Syntax highlight as well
* Clip output HTML to Evernote™
* Sync Markdown source file with Dropbox™(TODO)

## UI
![Main Page](http://geogeo.github.com/images/blog/08132012/main-page.png)
![Edit Page](http://geogeo.github.com/images/blog/08132012/edit-page.png)
![Preview Page](http://geogeo.github.com/images/blog/08132012/preview-page.png)
![SideView Option](http://geogeo.github.com/images/blog/08132012/sideview-option.png)
![Output Page](http://geogeo.github.com/images/blog/08132012/output-page.png)
![Syntax Page](http://geogeo.github.com/images/blog/08132012/syntax-page.png)

Log
-------
### Aug 11, 2012

Confirm using [wink] tool kit and [showndown].

I've used [JQM], [Lungojs], and [JQT] before.

Exciting in trying something new;)

* [wink] have some awesome 3d features like cover flow

* [showdown] is javascript port of Markdown

### Aug 12, 2012

Got some Scroller problem. List 肿么不会滚动捏, 总结如下:

官方文档只需两步即可使一个控件变成Scrollable
```javascript
var properties = {
  target: "targetElementId",
  direction: "y"
};
scroller = new wink.ui.layout.Scroller(properties);
```
但是其实没有这么简单

Keys to create a scroller:
1. 必须声明上一层div wrapper的height
2. 加上这句``scroller autoRefresh({true,1000})``
true表示开启自动刷新, 1000指check的最长时间. 

## Aug 15, 2012
前两天陪媳妇玩....木哈哈.
继续
用``wink.api.Storage``解决本地存储
```javascript
var descriptor =
{
    name: 'dummy_db',
    tables:
    {
        contacts:
        {
            lastname : wink.api.storage.fieldtypes.TEXT,
            firstname : wink.api.storage.fieldtypes.TEXT,
            age : wink.api.storage.fieldtypes.INTEGER,
            phone : wink.api.storage.fieldtypes.TEXT,
            email : wink.api.storage.fieldtypes.TEXT
        }
    }
}
 
storage = new wink.api.Storage();
 
storage.connect(descriptor);

storage.insert(...);
storage.update(...);
```

### Aug 16, 2012

* Use Evernote Bookmarklet to clip note without SDK.
Evernote没有javascript的sdk....擦

肿么办, 
突然想到evernote bookmarklet不是javascript么

bookmarkClipper下下来, 改几行代码...搞定:)

* ace [Cloud9 editor]
太出名了,有木有....github的编辑器也是这. 
直接解决代码编辑及高亮问题. 

### Aug 17,2012

解决SideView scroll的问题

### Aug 18, 2012

Release PrePackage
试试打包成Playbook程序

**各位童鞋注意了**

程序icon大小一定要86x86
, 我用了114x114 iphone icon的大小

尼玛Playbook虚拟机黑屏了有木有

搞了我一下午没发现到底代码哪错了有木有

最后发现图片不对害我错改了一堆代码有木有

害人不浅啊....也木有个提示, 就给我来个Something Wrong

Wrong你妹啊, 谁知道Something是啥玩意

## Today

弄手机上发现ace editor不能往下翻页.......
擦.....加虚拟键盘


  [wink]: http://www.winktoolkit.org
  [JQM]: http://jquerymobile.com/
  [JQT]: http://jqtouch.com/
  [Lungojs]: http://lungojs.com/
  [showdown]: https://github.com/coreyti/showdown
  [Cloud9 editor]: http://ace.ajax.org/
        
