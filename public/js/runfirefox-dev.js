/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

function Tracker() {
  // When start() was called as a DOMTimestamp
  var startTime = null;

  // Array of objects { timestamp, latitude, longitude, altitude, type }
  //  timestamp - number of seconds since startTime as a double
  //  latitude  - double
  //  longitude - double
  //  altitude  - double
  //  type      - start, gps, pause, resume, end
  var path = [];

  // The geolocation watchPosition ID
  var watchId = null;

  // Flag to indicate that we are supposed to start but are still waiting for
  // the initial position to arrive
  var waitingToStart = false;

  this.start = function(onstart, onprogress, onerror) {
    // If we're already waiting to start, just keep waiting
    if (waitingToStart)
      return;

    // If we're still running, then just keep running
    if (watchId)
      return;

    // Start watching
    waitingToStart = true;
    watchId =
      navigator.geolocation.watchPosition(
        function(position) {
          waitingToStart = false;
          // First point
          if (path.length === 0) {
            startTime = position.timestamp;
            addPoint(position, 'start');
            if (onstart) {
              onstart(path[path.length-1], this);
            }
          // Resuming
          } else if (path[path.length-1].type == 'end') {
            path[path.length-1].type = 'pause';
            addPoint(position, 'resume');
            if (onstart) {
              onstart(path[path.length-1], this);
            }
          // Regular point
          } else {
            addPoint(position, 'gps');
            if (onprogress) {
              onprogress(path[path.length-1], this);
            }
          }
        },
        function(error) {
          waitingToStart = false;
          watchId = null;
          if (onerror) {
            onerror(error, this);
          }
        },
        { enableHighAccuracy: true, maximumAge: 0 }
      );
  }

  this.stop = function(oncomplete) {
    // If we're still waiting to start, just keep waiting
    if (waitingToStart) {
      setTimeout(function() { this.stop(oncomplete); }.bind(this), 100);
      return;
    }

    // Ensure we are actually running
    if (watchId === null) {
      if (oncomplete) {
        oncomplete(this);
      }
      return;
    }

    // Cancel watch
    navigator.geolocation.clearWatch(watchId);
    watchId = null;

    // Make sure the last point in the path is 'end'
    if (path.length && path[path.length-1].type == 'gps') {
      // Tweak last point
      var last = path[path.length-1];
      last.type = 'end';
      last.timestamp = Math.max(last.timestamp, Date.now() - startTime);
    } else if (path.length) {
      // Duplicate last point and adjust parameters
      var currentLast = path[path.length-1];
      var newLast =
        { timestamp: Math.max(currentLast.timestamp, Date.now() - startTime),
          latitude: currentLast.longitude,
          longitude: currentLast.longitude,
          altitude: currentLast.altitude,
          type: 'end'
        };
      path.push(newLast);
    }

    // Finish
    if (oncomplete) {
      oncomplete(this);
    }
  }

  this.__defineGetter__("startTime", function(){
    return startTime;
  });

  this.__defineGetter__("path", function(){
    return path;
  });

  function addPoint(position, type) {
    path.push({ timestamp: Math.max(position.timestamp - startTime, 0),
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                altitude: position.coords.altitude,
                type: type });
  }
};
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
if (!(document.register || {}).__polyfill__){

  (function(){
    
    var win = window,
      doc = document,
      tags = {},
      tokens = [],
      domready = false,
      mutation = win.MutationObserver || win.WebKitMutationObserver ||  win.MozMutationObserver,
      _createElement = doc.createElement,
      register = function(name, options){
        if (!tags[name]) tokens.push(name);
        options = options || {};
        if (options.prototype && !('setAttribute' in options.prototype)) {
          throw new TypeError("Unexpected prototype for " + name + " element - custom element prototypes must inherit from the Element interface");
        }
        var lifecycle = options.lifecycle || {},
            tag = tags[name] = {
              'prototype': options.prototype || Object.create((win.HTMLSpanElement || win.HTMLElement).prototype),
              'fragment': options.fragment || document.createDocumentFragment(),
              'lifecycle': {
                created: lifecycle.created || function(){},
                removed: lifecycle.removed || function(){},
                inserted: lifecycle.inserted || function(){},
                attributeChanged: lifecycle.attributeChanged || function(){}
              }
            };
        if (domready) query(doc, name).forEach(function(element){
          upgrade(element, true);
        });
        return tag.prototype;
      };
    
    function typeOf(obj) {
      return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
    }
    
    function clone(item, type){
      var fn = clone[type || typeOf(item)];
      return fn ? fn(item) : item;
    }
      clone.object = function(src){
        var obj = {};
        for (var key in src) obj[key] = clone(src[key]);
        return obj;
      };
      clone.array = function(src){
        var i = src.length, array = new Array(i);
        while (i--) array[i] = clone(src[i]);
        return array;
      };
    
    var unsliceable = ['number', 'boolean', 'string', 'function'];
    function toArray(obj){
      return unsliceable.indexOf(typeof obj) == -1 ? 
      Array.prototype.slice.call(obj, 0) :
      [obj];
    }
    
    function query(element, selector){
      return element && selector && selector.length ? toArray(element.querySelectorAll(selector)) : [];
    }
    
    function getTag(element){
      return element.nodeName ? tags[element.nodeName.toLowerCase()] : false;
    }
    
    function manipulate(element, fn){
      var next = element.nextSibling,
        parent = element.parentNode,
        frag = doc.createDocumentFragment(),
        returned = fn.call(frag.appendChild(element), frag) || element;
      if (next){
        parent.insertBefore(returned, next);
      }
      else{
        parent.appendChild(returned);
      }
    }
    
    function upgrade(element, replace){
      if (!element._elementupgraded && !element._suppressObservers) {
        var tag = getTag(element);
        if (tag) {
          var upgraded = element;
          if (replace) {
            element._suppressObservers = true;
            manipulate(element, function(){
              upgraded = _createElement.call(doc, element.nodeName);
              upgraded._suppressObservers = true;
              while (element.firstChild) upgraded.appendChild(element.firstChild);
              var index = element.attributes.length;
              while (index--) {
                var attr = element.attributes[index];
                upgraded.setAttribute(attr.name, attr.value);
              }
              return upgraded;
            });
          }
          upgraded.__proto__ = tag.prototype;
          upgraded._elementupgraded = true;
          if (!mutation) delete upgraded._suppressObservers;
          tag.lifecycle.created.call(upgraded, tag.prototype);
          if (replace) fireEvent(element, 'elementreplace', { upgrade: upgraded }, { bubbles: false });
          fireEvent(upgraded, 'elementupgrade');
        }
      }
    }
    
    function inserted(element, event){
      var tag = getTag(element);
      if (tag){
        if (!element._elementupgraded) upgrade(element, true);
        else {
          if (element._suppressObservers) {
            delete element._suppressObservers;
            return element;
          }
          if (!element._suppressObservers && doc.documentElement.contains(element)) {
            tag.lifecycle.inserted.call(element);
          }
          insertChildren(element);
        }
      }
      else insertChildren(element);
    }

    function insertChildren(element){
      if (element.childNodes.length) query(element, tokens).forEach(function(el){
        if (!el._elementupgraded) upgrade(el, true);
        getTag(el).lifecycle.inserted.call(el);
      });
    }
    
    function removed(element){
      if (element._elementupgraded) {
        if (element._suppressObservers) delete element._suppressObservers;
        else {
          getTag(element).lifecycle.removed.call(element);
          if (element.childNodes.length) query(element, tokens).forEach(function(el){
            removed(el);
          });
        }
      }
    }
    
    function addObserver(element, type, fn){
      if (!element._records) {
        element._records = { inserted: [], removed: [] };
        if (mutation){
          element._observer = new mutation(function(mutations) {
            parseMutations(element, mutations);
          });
          element._observer.observe(element, {
            subtree: true,
            childList: true,
            attributes: !true,
            characterData: false
          });
        }
        else ['Inserted', 'Removed'].forEach(function(type){
          element.addEventListener('DOMNode' + type, function(event){
            event._mutation = true;
            element._records[type.toLowerCase()].forEach(function(fn){
              fn(event.target, event);
            });
          }, false);
        });
      }
      if (element._records[type].indexOf(fn) == -1) element._records[type].push(fn);
    }
    
    function removeObserver(element, type, fn){
      var obj = element._records;
      if (obj && fn){
        obj[type].splice(obj[type].indexOf(fn), 1);
      }
      else{
        obj[type] = [];
      }
    }
      
    function parseMutations(element, mutations) {
      var diff = { added: [], removed: [] };
      mutations.forEach(function(record){
        record._mutation = true;
        for (var z in diff) {
          var type = element._records[(z == 'added') ? 'inserted' : 'removed'],
            nodes = record[z + 'Nodes'], length = nodes.length;
          for (i = 0; i < length && diff[z].indexOf(nodes[i]) == -1; i++){
            diff[z].push(nodes[i]);
            type.forEach(function(fn){
              fn(nodes[i], record);
            });
          }
        }
      });
    }
      
    function fireEvent(element, type, data, options){
      options = options || {};
      var event = doc.createEvent('Event');
      event.initEvent(type, 'bubbles' in options ? options.bubbles : true, 'cancelable' in options ? options.cancelable : true);
      for (var z in data) event[z] = data[z];
      element.dispatchEvent(event);
    }

    var polyfill = !doc.register;
    if (polyfill) {
      doc.register = register;
      
      doc.createElement = function createElement(tag){
        var element = _createElement.call(doc, tag);
        upgrade(element);
        return element;
      };
      
      var _setAttribute = Element.prototype.setAttribute;   
      Element.prototype.setAttribute = function(attr, value){
        var tag = getTag(this),
            last = this.getAttribute(attr);
        _setAttribute.call(this, attr, value);
        if (tag && last != this.getAttribute(attr)) {
          tag.lifecycle.attributeChanged.call(this, attr, value, last);
        } 
      };
      
      var initialize = function (){
        addObserver(doc.documentElement, 'inserted', inserted);
        addObserver(doc.documentElement, 'removed', removed);
        
        if (tokens.length) query(doc, tokens).forEach(function(element){
          upgrade(element, true);
        });
        
        domready = true;
        fireEvent(doc, 'DOMComponentsLoaded');
        fireEvent(doc, '__DOMComponentsLoaded__');
      };
      
      if (doc.readyState == 'complete') initialize();
      else doc.addEventListener(doc.readyState == 'interactive' ? 'readystatechange' : 'DOMContentLoaded', initialize); 
    }
    
    doc.register.__polyfill__ = {
      query: query,
      clone: clone,
      typeOf: typeOf,
      toArray: toArray,
      fireEvent: fireEvent,
      manipulate: manipulate,
      addObserver: addObserver,
      removeObserver: removeObserver,
      observerElement: doc.documentElement,
      parseMutations: parseMutations,
      _inserted: inserted,
      _createElement: _createElement,
      _polyfilled: polyfill
    };

  })();

}

(function () {

/*** Internal Variables ***/

  var win = window,
    doc = document,
    keypseudo = {
      action: function (pseudo, event) {
        return ~pseudo.value.match(/(\d+)/g).indexOf(String(event.keyCode)) == (pseudo.name == 'keypass');
      }
    },
    touchFilter = function (custom, event) {
      if (custom.listener.touched) return custom.listener.touched = false;
      else {
        if (event.type.match('touch')) custom.listener.touched = true;
      }
    },
    createFlowEvent = function (type) {
      var flow = type == 'over';
      return {
        base: 'OverflowEvent' in window ? 'overflowchanged' : type + 'flow',
        condition: function (custom, event) {
          return event.type == (type + 'flow') ||
          ((event.orient === 0 && event.horizontalOverflow == flow) ||
          (event.orient == 1 && event.verticalOverflow == flow) ||
          (event.orient == 2 && event.horizontalOverflow == flow && event.verticalOverflow == flow));
        }
      };
    },
    prefix = (function () {
      var styles = win.getComputedStyle(doc.documentElement, ''),
        pre = (Array.prototype.slice
          .call(styles)
          .join('') 
          .match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o'])
        )[1],
        dom = ('WebKit|Moz|MS|O').match(new RegExp('(' + pre + ')', 'i'))[1];
      return {
        dom: dom,
        lowercase: pre,
        css: '-' + pre + '-',
        js: pre[0].toUpperCase() + pre.substr(1)
      };

    })(),
    matchSelector = Element.prototype.matchesSelector || Element.prototype[prefix.lowercase + 'MatchesSelector'];
  
/*** Internal Functions ***/

  // Mixins
  
  function mergeOne(source, key, current){
    var type = xtag.typeOf(current);
    if (type == 'object' && xtag.typeOf(source[key]) == 'object') xtag.merge(source[key], current);
    else source[key] = xtag.clone(current, type);
    return source;
  }
  
  function mergeMixin(type, mixin, option) {
    var original = {};
    for (var o in option) original[o.split(':')[0]] = true;
    for (var x in mixin) if (!original[x.split(':')[0]]) option[x] = mixin[x];
  }

  function applyMixins(tag) {
    tag.mixins.forEach(function (name) {
      var mixin = xtag.mixins[name];
      for (var type in mixin) {
        switch (type) {
          case 'lifecycle': case 'methods':
            mergeMixin(type, mixin[type], tag[type]);
            break;
          case 'accessors': case 'prototype':
            for (var z in mixin[type]) mergeMixin(z, mixin[type], tag.accessors);
            break;
          case 'events':
            break;
        }
      }
    });
    return tag;
  }
  
/*** X-Tag Object Definition ***/

  var xtag = {
    defaultOptions: {
      mixins: [],
      events: {},
      methods: {},
      accessors: {},
      lifecycle: {},
      'prototype': {
        xtag: {
          get: function(){
            return this.__xtag__ ? this.__xtag__ : (this.__xtag__ = { data: {} });
          },
          set: function(){
            
          }
        }
      }
    },
    register: function (name, options) {
      var tag = xtag.merge({}, xtag.defaultOptions, options);
      tag = applyMixins(tag);
      for (var z in tag.events) tag.events[z.split(':')[0]] = xtag.parseEvent(z, tag.events[z]);
      for (z in tag.lifecycle) tag.lifecycle[z.split(':')[0]] = xtag.applyPseudos(z, tag.lifecycle[z]);
      for (z in tag.methods) tag.prototype[z.split(':')[0]] = { value: xtag.applyPseudos(z, tag.methods[z]) };
      
      for (var prop in tag.accessors) {
        tag.prototype[prop] = {};
        var accessor = tag.accessors[prop];
        for (z in accessor) {
          var key = z.split(':'), type = key[0];
          if (type == 'get' || type == 'set') {
            key[0] = prop;
            tag.prototype[prop][type] = xtag.applyPseudos(key.join(':'), accessor[z]);
          }
          else tag.prototype[prop][z] = accessor[z];
        }
      }

      var created = tag.lifecycle.created;
      tag.lifecycle.created = function () {
        xtag.addEvents(this, tag.events);
        tag.mixins.forEach(function(mixin){
          if (xtag.mixins[mixin].events) xtag.addEvents(this, xtag.mixins[mixin].events);
        },this);
        return created ? created.apply(this, xtag.toArray(arguments)) : null;
      };
      
      var proto = doc.register(name, {
        'prototype': 'nodeName' in tag.prototype ? tag.prototype : Object.create((win.HTMLSpanElement || win.HTMLElement).prototype, tag.prototype),
        'lifecycle':  tag.lifecycle
      });

      return proto;
    },

  /*** Exposed Variables ***/
    mixins: {},
    prefix: prefix,
    captureEvents: ['focus', 'blur'],
    customEvents: {
      overflow: createFlowEvent('over'),
      underflow: createFlowEvent('under'),
      animationstart: {
        base: [
          'animationstart',
          'oAnimationStart',
          'MSAnimationStart',
          'webkitAnimationStart'
        ]
      },
      transitionend: {
        base: [
          'transitionend',
          'oTransitionEnd',
          'MSTransitionEnd',
          'webkitTransitionEnd'
        ]
      },
      tap: {
        base: ['click', 'touchend'],
        condition: touchFilter
      },
      tapstart: {
        base: ['mousedown', 'touchstart'],
        condition: touchFilter
      },
      tapend: {
        base: ['mouseup', 'touchend'],
        condition: touchFilter
      },
      tapenter: {
        base: ['mouseover', 'touchenter'],
        condition: touchFilter
      },
      tapleave: {
        base: ['mouseout', 'touchleave'],
        condition: touchFilter
      },
      tapmove: {
        base: ['mousemove', 'touchmove'],
        condition: touchFilter
      }
    },
    pseudos: {
      keypass: keypseudo,
      keyfail: keypseudo,
      delegate: {
        action: function (pseudo, event) {
          var target = xtag.query(this, pseudo.value).filter(function (node) {
          return node == event.target ||
            node.contains ? node.contains(event.target) : false;
          })[0];
          return target ? pseudo.listener = pseudo.listener.bind(target) : false;
        }
      },
      preventable: {
        action: function (pseudo, event) {
          return !event.defaultPrevented;
        }
      },
      attribute: {
        action: function (pseudo, value) {
          this.setAttribute(pseudo.value || pseudo.key.split(':')[0], value, true);
        }
      }
    },

  /*** Utilities ***/

    // JS Types
    
    wrap: function (original, fn) {
      return function () {
        var args = xtag.toArray(arguments),
          returned = original.apply(this, args);
        return returned === false ? false : fn.apply(this, typeof returned != 'undefined' ? xtag.toArray(returned) : args);
      };
    },
    
    merge: function(source, k, v){
      if (xtag.typeOf(k) == 'string') return mergeOne(source, k, v);
      for (var i = 1, l = arguments.length; i < l; i++){
        var object = arguments[i];
        for (var key in object) mergeOne(source, key, object[key]);
      }
      return source;
    },

    skipTransition: function(element, fn, bind){
      var duration = prefix.js + 'TransitionDuration';
      element.style[duration] = '0.001s';
      fn.call(bind);
      xtag.addEvent(element, 'transitionend', function(){
        element.style[duration] = '';
      });
    },

    // DOM
    matchSelector: function (element, selector) {
      return matchSelector.call(element, selector);
    },
    
    innerHTML: function (element, html) {
      element.innerHTML = html;
      if (xtag._polyfilled) {
        if (xtag.observerElement._observer) {
          xtag.parseMutations(xtag.observerElement, xtag.observerElement._observer.takeRecords());
        }
        else xtag._inserted(element);
      }
    },

    hasClass: function (element, klass) {
      return element.className.split(' ').indexOf(klass.trim())>-1;
    },

    addClass: function (element, klass) {
      var list = element.className.trim().split(' ');
      klass.trim().split(' ').forEach(function (name) {
        if (!~list.indexOf(name)) list.push(name);
      });
      element.className = list.join(' ').trim();
      return element;
    },

    removeClass: function (element, klass) {
      var classes = klass.trim().split(' ');
      element.className = element.className.trim().split(' ').filter(function (name) {
        return name && !~classes.indexOf(name);
      }).join(' ');
      return element;
    },
    toggleClass: function (element, klass) {
      return xtag[xtag.hasClass(element, klass) ? 'removeClass' : 'addClass'].call(null, element, klass);

    },
    query: function (element, selector) {
      return xtag.toArray(element.querySelectorAll(selector));
    },

    queryChildren: function (element, selector) {
      var id = element.id,
        guid = element.id = id || 'x_' + new Date().getTime(),
        attr = '#' + guid + ' > ';
      selector = attr + (selector + '').replace(',', ',' + attr, 'g');
      var result = element.parentNode.querySelectorAll(selector);
      if (!id) element.id = null;
      return xtag.toArray(result);
    },

    createFragment: function (content) {
      var frag = doc.createDocumentFragment();
      if (content) {
        var div = frag.appendChild(doc.createElement('div')),
          nodes = xtag.toArray(content.nodeName ? arguments : !(div.innerHTML = content) || div.children),
          index = nodes.length;
        while (index--) frag.insertBefore(nodes[index], div);
        frag.removeChild(div);
      }
      return frag;
    },

  /*** Pseudos ***/

    applyPseudos: function (key, fn) {
      var listener = fn;
      if (key.match(':')) {
        var split = key.match(/(\w+(?:\([^\)]+\))?)/g),
            i = split.length;
        while (--i) {
          split[i].replace(/(\w*)(?:\(([^\)]*)\))?/, function (match, name, value) {
            var pseudo = xtag.pseudos[name];
            if (!pseudo) throw "pseudo not found: " + name;
            var last = listener;
            listener = function(){
              var args = xtag.toArray(arguments),
                  obj = {
                    key: key,
                    name: name,
                    value: value,
                    listener: last
                  };
              if (pseudo.action.apply(this, [obj].concat(args)) === false) return false;
              return obj.listener.apply(this, args);
            };
          });
        }
      }
      return listener;
    },

  /*** Events ***/

    parseEvent: function (type, fn) {
      var pseudos = type.split(':'),
        key = pseudos.shift(),
        event = xtag.merge({
          base: key,
          pseudos: '',
          onAdd: function(){},
          onRemove: function(){},
          condition: function(){}
        }, xtag.customEvents[key] || {});
      event.type = key + (event.pseudos.length ? ':' + event.pseudos : '') + (pseudos.length ? ':' + pseudos.join(':') : '');
      if (fn) {
        var chained = xtag.applyPseudos(event.type, fn);
        event.listener = function(){
          var args = xtag.toArray(arguments);
          if (event.condition.apply(this, [event].concat(args)) === false) return false;
          return chained.apply(this, args);
        };
      }
      return event;
    },

    addEvent: function (element, type, fn) {
      var event = typeof fn == 'function' ? xtag.parseEvent(type, fn) : fn;
      event.onAdd.call(element, event, event.listener);
      xtag.toArray(event.base).forEach(function (name) {
        element.addEventListener(name, event.listener, xtag.captureEvents.indexOf(name) > -1);
      });
      return event.listener;
    },

    addEvents: function (element, events) {
      for (var z in events) xtag.addEvent(element, z, events[z]);
    },

    removeEvent: function (element, type, fn) {
      var event = xtag.parseEvent(type);
      event.onRemove.call(element, event, fn);
      xtag.removePseudos(element, event.type, fn);
      xtag.toArray(event.base).forEach(function (name) {
        element.removeEventListener(name, fn);
      });
    }
  };
  
  xtag.typeOf = doc.register.__polyfill__.typeOf;
  xtag.clone = doc.register.__polyfill__.clone;
  xtag.merge(xtag, doc.register.__polyfill__);

  if (typeof define == 'function' && define.amd) define(xtag);
  else win.xtag = xtag;

})();

(function(){

  var transform = xtag.prefix.js + 'Transform';
  function getState(el){
    var selected = xtag.query(el, 'x-slides > x-slide[selected]')[0] || 0;
    return [selected ? xtag.query(el, 'x-slides > x-slide').indexOf(selected) : selected, el.firstElementChild.children.length - 1];
  }

  function slide(el, index){
    var slides = xtag.toArray(el.firstElementChild.children);
    slides.forEach(function(slide){ slide.removeAttribute('selected'); });
    slides[index || 0].setAttribute('selected', null);
    el.firstElementChild.style[transform] = 'translate'+ (el.getAttribute('orientation') || 'x') + '(' + (index || 0) * (-100 / slides.length) + '%)';
  }

  function init(toSelected){    
    var slides = this.firstElementChild;
    if (!slides || !slides.children.length || slides.tagName.toLowerCase() != 'x-slides') return;
    
    var children = xtag.toArray(slides.children),
      size = 100 / (children.length || 1),
      orient = this.getAttribute('orientation') || 'x',
      style = orient == 'x' ? ['width', 'height'] : ['height', 'width'];
    
    slides.style[style[1]] =  '100%';
    slides.style[style[0]] = children.length * 100 + '%';
    slides.style[transform] = 'translate' + orient + '(0%)';
    children.forEach(function(slide){       
      slide.style[style[0]] = size + '%';
      slide.style[style[1]] = '100%';
    });    
    
    if (toSelected) {
      var selected = slides.querySelector('[selected]');
      if (selected) slide(this, children.indexOf(selected) || 0);
    }
  }

  xtag.register('x-slidebox', {
    events:{
      'transitionend': function(e){
        if (e.target == this) xtag.fireEvent(this, 'slideend');
      },
      'elementupgrade': function(e){
        if (e.target == this){
          init();
        }
      }
    },
    accessors:{
      orientation:{
        get: function(){
          return this.getAttribute('orientation');
        },
        set: function(value){
          this.setAttribute('orientation', value.toLowerCase());
          init.call(this, true);
        }
      }
    },
    methods: {
      slideTo: function(index){
        slide(this, index);
      },
      slideNext: function(){
        var shift = getState(this);
          shift[0]++;
        slide(this, shift[0] > shift[1] ? 0 : shift[0]);
      },
      slidePrevious: function(){
        var shift = getState(this);
          shift[0]--;
        slide(this, shift[0] < 0 ? shift[1] : shift[0]);
      }
    }
  });
  
  xtag.register('x-slide', {
    lifecycle:{
      inserted: function(){
        var ancestor = this.parentNode.parentNode;
        if (ancestor.tagName.toLowerCase() == 'x-slidebox') init.call(ancestor, true);
      }
    },
    events:{
      'elementupgrade': function(e){
        if (e.target == this){
          var ancestor = this.parentNode.parentNode;
          if (ancestor.tagName.toLowerCase() == 'x-slidebox') init.call(ancestor, true);
        }
      }
    }
  });
  
})();/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var RunFirefox = window.RunFirefox || {};
RunFirefox.Setting = (function(){

    var Setting = function(account, password){
	this.accout = account;
	this.password = password;

	this.workout_reminder = new WorkoutReminder();
    };

    var WorkoutReminder = function(day, hour){
	this.setDay(day);
	this.setHour(hour);
	this.updateTimeStamp();
    };
    WorkoutReminder.Day = {
	DONT_REMIND_ME: -1,
	TOMORROW: 1,
	IN_2DAYS: 2,
	IN_3DAYS: 3,
	IN_5DAYS: 5
    };
    WorkoutReminder.Hour = {
	AM_6: 6,
	AM_9: 9,
	NOON: 12,
	PM_2: 14,
	PM_5: 17,
	PM_8: 20
    };
    WorkoutReminder.prototype = (function(){
	var DAY_IN_MILLISEC = 86400000;
	var isValidDay = function(day){
	    return values(WorkoutReminder.Day).indexOf(day) > -1;
	};

	var isValidHour = function(hour){
	    return values(WorkoutReminder.Hour).indexOf(hour) > -1;
	};

	var getHourString = function(hour){
	    var ret = hour - 12;
	    if(ret == 0){
		return "正午";
	    }else if(ret < 0){
		return "午前" + hour + "時";
	    }else{
		return "午後" + ret + "時";
	    }
	};
	
	return {
	    updateTimeStamp: function(){
		this.timestamp = new Date();
	    },
	    setDay: function(day){
		if(isValidDay(day)){
		    this.day = day;
		}else{
		    this.day = WorkoutReminder.Day.DONT_REMIND_ME;
		}
	    },
	    setHour: function(hour){
		if(isValidHour(hour)){
		    this.hour = hour;
		}else{
		    this.hour = WorkoutReminder.Hour.AM_6;
		}
	    },
	    getReminedDate: function(){
		if(this.day == WorkoutReminder.Day.DONT_REMIND_ME){
		    return this.timestamp;
		}else{
		    var ret = new Date(this.timestamp.getTime() + this.day * DAY_IN_MILLISEC);
		    ret.setHours(this.hour);
		    return ret;
		}
	    },
	    toString: function(){
		if(this.day == WorkoutReminder.Day.DONT_REMIND_ME){
		    return "Don't remind me.";
		}else{
		    var date = this.getRemindDate();		    
		    return date.getFullYear() + "年" + (date.getMonth + 1) + "月" + date.getDate() + "日" + getHourString();
		}
	    }
	};
    })();

    var AudioCue = function(){
    };

    AudioCue.prototype = (function(){
	var isBoolean = function(val){
	    return val === true || val === false;
	};

	var set = function(tbl, attr, value){
	    if(tbl != null && tbl[attr] != null && isBoolean(value)){
		tbl[attr] = value;
	    }
	};
	
	return {
	    time: false,
	    distance: false,
	    averagePace: false,
	    averageSpeed: false,
	    currentPace: false,
	    currentSpeed: false,
	    splitPace: false,
	    splitSpeed: false,
	    averageHeartrate: false,
	    currentHeartrate: false,
	    heartrateZone: false,
	    setTime: function(flag){
		set(this, "time", flag);
	    },
	    setDistance: function(flag){
		set(this, "distance", flag);
	    },
	    setAveragePace: function(flag){
		set(this, "averagePace", flag);
	    },
	    setAverageSpeed: function(flag){
		set(this, "averageSpeed", flag);
	    },
	    setCurrentPace: function(flag){
		set(this, "currentPace", flag);
	    },
	    setSplitPace: function(flag){
		set(this, "splitPace", flag);
	    },
	    setSplitSpeed: function(flag){
		set(this, "splitSpeed", flag);
	    },
	    setAverageHeartrate: function(flag){
		set(this, "averageHeartrate", flag);
	    },
	    setCurrentHeartrate: function(flag){
		set(this, "currentHeartrate", flag);
	    },
	    setHeartrateZone: function(flag){
		set(this, "heartrateZone", flag);
	    }
	};
    })();

    var AudioTiming = function(){
    };

    var AudioTimingValue = function(){
	this.time = null;
	this.distance = null;
    };

    AudioTimingValue.prototype = (function(){
	var defaultTimeInterval = 5;
	var defaultDistanceInterval = 1.00;

	var set = function(tbl, attr, val, list){
	    if(tbl && tbl[attr] && list.indexOf(val) > 0){
		tbl[attr] = val;
	    }
	};

	return {
	    timeInterval:  [1, 2, 3, 4, 5, 10, 15, 20, 25, 30],
	    timeIntervalUnit: "分",
	    distanceInterval: [0.25, 0.50, 0.75, 1.00, 1.25, 1.50, 1.75, 2.00, 3.00, 4.00, 5.00, 6.00, 7.00, 8.00, 9.00, 10.00],
	    distanceIntervalUnit: "km",
	    enableTime: function(){
		this.time = defaultTimeInterval;
	    },
	    enableDistance: function(){
		this.distane = defaultDistanceInterval;
	    },
	    setOndemandOnly: function(){
		this.time = null;
		this.distance = null;
	    },
	    setTime: function(val){
		set(this, "time", val, this.timeInterval);
	    },
	    setDistance: function(val){
		set(this, "distance", val, this.timeInterval);
	    }
	};
	
    })();

    
    
    return {
	Setting: Setting,
	new: function(){
	    return new Setting();
	}
    };

})();/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
var HomeControls = function() {
  var self = this;
  var listener = function(e) {
    self.selectMenu(e);
  };
  document.getElementById("homeContents").addEventListener('click', listener);
}

HomeControls.prototype.start = function(audioControls) {
  this.audioControls = audioControls;
}

HomeControls.prototype.stop = function() {
}

HomeControls.prototype.run = function() {
  this.audioControls.run();
//  this.audioControls.passKilo(512);
}

HomeControls.prototype.selectMenu = function(e) {
  var action = e.target,
    actionType = action.getAttribute('data-action-type');
  if (actionType) {
    switch(actionType) {
      case 'run':
        this.run();
        break;
    }
  }
}
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
var AudioControls = function(dir) {
  this.loadAll(dir);
}

AudioControls.prototype.loadAll = function(dir) {
  this.sound_table = {};
  this.sound_table["1"] = new Audio(dir+"/1.wav");
  this.sound_table["2"] = new Audio(dir+"/2.wav");
  this.sound_table["3"] = new Audio(dir+"/3.wav");
  this.sound_table["4"] = new Audio(dir+"/4.wav");
  this.sound_table["5"] = new Audio(dir+"/5.wav");
  this.sound_table["6"] = new Audio(dir+"/6.wav");
  this.sound_table["7"] = new Audio(dir+"/7.wav");
  this.sound_table["8"] = new Audio(dir+"/8.wav");
  this.sound_table["9"] = new Audio(dir+"/9.wav");
  this.sound_table["10"] = new Audio(dir+"/10.wav");
  this.sound_table["100"] = new Audio(dir+"/100.wav");
  this.sound_table["kilo"] = new Audio(dir+"/kilo.wav");
  this.sound_table["hashire"] = new Audio(dir+"/hashire.wav");
}

AudioControls.prototype.run = function() {
  this.playAudio("hashire");
}

AudioControls.prototype.passKilo = function(number) {
  var sources = [];
  this.pushNumber(sources, number);
  this.pushAudio(sources, "kilo");
  this.playPluralAudios(sources, 0);
}

AudioControls.prototype.pushAudio = function(sources, name) {
  sources.push(this.sound_table[name]);
}

AudioControls.prototype.pushNumber = function(sources, number) {
  var handled = Math.floor(number/100);
  number -= 100 * handled;
  var ten = Math.floor(number/10);
  number -= 10 * ten;
  if (handled >= 2) {
    this.pushANumber(sources, handled);
    this.pushAudio(sources, "100");
  } else if (handled == 1) {
    this.pushAudio(sources, "100");
  }
  if (ten >= 2) {
    this.pushANumber(sources, ten);
    this.pushAudio(sources, "10");
  } else if (ten == 1) {
    this.pushAudio(sources, "10");
  }
  this.pushANumber(sources, number);
}

AudioControls.prototype.pushANumber = function(sources, number) {
  switch (number) {
    case 1 : {
      this.pushAudio(sources, "1");
      break;
    }
    case 2 : {
      this.pushAudio(sources, "2");
      break;
    }
    case 3 : {
      this.pushAudio(sources, "3");
      break;
    }
    case 4 : {
      this.pushAudio(sources, "4");
      break;
    }
    case 5 : {
      this.pushAudio(sources, "5");
      break;
    }
    case 6 : {
      this.pushAudio(sources, "6");
      break;
    }
    case 7 : {
      this.pushAudio(sources, "7");
      break;
    }
    case 8 : {
      this.pushAudio(sources, "8");
      break;
    }
    case 9 : {
      this.pushAudio(sources, "9");
      break;
    }
  }
}

AudioControls.prototype.playPluralAudios = function(sources, index) {
  var self = this;
  var audio = sources[index];
  audio.play();
  
  var listener = function(e) {
    audio.removeEventListener("ended", listener);
    index += 1;
    if (sources.length != index) {
      self.playPluralAudios(sources, index);
    }
  }
  
  audio.addEventListener("ended", listener);
}

AudioControls.prototype.playAudio = function(source) {
  var audio = this.sound_table[source];
  audio.play();
}/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var RunFirefox = RunFirefox || {};

(function(){
    var MAP_API = "http://maps.googleapis.com/maps/api/js?libraries=geometry&sensor=false";
    if(!RunFirefox.MapView){
	var script = document.createElement("script");
	script.type = "text/javascript";
	script.src = MAP_API;
	script.onload = function(){
	    window.RunFirefox.MapView = window.RunFirefox.__initMapView(google.maps);
	    delete(window.RunFirefox.__initMapView);
	};
	var body = document.getElementsByTagName("body");
	if(body && body.length > 0){
	    body[0].appendChild(script);
	}
    }
})();

RunFirefox.__initMapView = function(maps){

    var MapFactory = function(){
	this.loadMapAPI();
    };

    MapFactory.prototype = (function(){
	var getInitialCenter = function(tracker){
	    var p = tracker.path[0];
	    return new maps.LatLng(p.latitude, p.longitude);
	};

	var getInitialZoom = function(tracker){
	    return 15; // XXX
	};
	
	return {
	    createMap: function(tracker, elm_or_id){
		var elm = elm_or_id;
		if(!(elm_or_id instanceof Element)){
		    elm = document.getElementById(elm_or_id.toString());
		}
		if(elm && this.tracker){
		    var map = new maps.Map(elm, {
			center: getInitialCenter(tracker),
			zoom: getInitialZoom(tracker),
			mapTypeId: "OSM",
			mapTypeControl: false,
			streetViewControl: false
		    });
		    map.mapTypes.set("OSM", new maps.ImageMapType({
			getTileUrl: function(coord, zoom) {
			    return "http://tile.openstreetmap.org/" +
				zoom + "/" +
				coord.x + "/" +
				coord.y + ".png";
			},
			tileSize: new maps.Size(256, 256),
			name: "OpenStreetMap",
			maxZoom: 18
		    }));
		    return map;
		}
		return null;
	    }
	};

    })();

    var MapView = function(tracker, elm_or_id){
	this.tracker = tracker;
	
	if(this.tracker){
	    var factory = new MapFactory();
	    this.map = factory.createMap(this.tracker, elm_or_id);
	}
    };

    MapView.prototype = (function(){
	var MILESTONE_UNIT = 1000;
	var toLatLng = function(list){
	    var ret = [];
	    for(var i = 0; i < list.length; i++){
		var p = list[i];
		if(p.latitude && p.longitude){
		    ret.push(new maps.LatLng(p.latitude, p.longitude));
		}
	    }
	    return ret;
	};

	var extractMilestonesFrom = function(list){
	    var ret = [];
	    if(list && list.length && list.length > 0){
		var total = 0;
		for(var i = 1; i < list.length; i++){
		    total += maps.geometry.spherical.computeDistanceBetween(list[i-1], list[i]);
		    if(total > (ret.length + 1) * MILESTONE_UNIT){
			ret.push(new maps.LatLng(list[i].p));
		    }
		}
	    }
	    return ret;
	};
	
	return {
	    plotPath: function(){
		if(this.tracker && this.map){
		    var path = toLatLng(this.tracker.path);
		    var args = {
			map: this.map,
			path: path
		    };
		    return maps.Polyline(args);
		}
		return null;
	    },
	    plotMilestones: function(){
		var milestones = extractMilestonesFrom(this.tracker.path);
		for(var i = 0; i < milestones.length; i++){
		    milestones[i] = new maps.Marker({
			position: milestones[i],
			map: this.map,
			title: i + "km"
		    });
		}
		return milestones;
	    }
	};
    })();

    return {
	Map: MapView,
	new: function(tracker, elm_or_id){
	    return new MapView(tracker, elm_or_id);
	}
    };
};/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
 
var RunFirefox = RunFirefox || {};

RunFirefox.init = function() {
  RunFirefox.audioControls = new AudioControls("audio");
  RunFirefox.homeControls = new HomeControls();
  var menus = document.getElementById("menus");
  menus.addEventListener('click', RunFirefox.selectMenu);
  for (var i = 0, n = menus.children.length; i < n; i++) {
    var menu = menus.children[i];
    var actionType = menu.getAttribute('data-action-type');
    if (actionType == 'slideHome') {
      RunFirefox.transferControls(RunFirefox.homeControls, menu);
      break;
    }
  }
}

RunFirefox.transferControls = function(controller, element) {
  if (RunFirefox.currentControls) {
    RunFirefox.currentControls.stop();
    RunFirefox.currentTarget.classList.remove("selected");
  }
  RunFirefox.currentTarget = element;
  RunFirefox.currentControls = controller;
  RunFirefox.currentTarget.classList.add("selected");
  RunFirefox.currentControls.start(RunFirefox.audioControls);
}

RunFirefox.selectMenu = function(e) {
  var action = e.target,
    actionType = action.getAttribute('data-action-type');
  if (actionType) {
    var mainContainer = document.getElementById('contents');
    switch(actionType) {
      case 'slideHome':
        RunFirefox.transferControls(RunFirefox.homeControls, action);
        mainContainer.slideTo(0);
        break;
      case 'slideActivity':
        RunFirefox.transferControls({"start":function(){}, "stop":function(){}}, action);
        mainContainer.slideTo(1);
        break;
      case 'slideSetting':
        RunFirefox.transferControls({"start":function(){}, "stop":function(){}}, action);
        mainContainer.slideTo(2);
        break;
    }
  }
}

window.addEventListener("load", function(e) {
    RunFirefox.init();
}, false);
