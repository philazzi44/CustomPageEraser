// Look for "PHIL CHANGE" to see my changes.
var options = {};
var enabled = false;
var cursorUrl = chrome.extension.getURL('cursor24.png');

var win = $(window);
var doc = $(document);
var body = $('body');
var bodyElement = body.get(0);

var highlight;
var highlightElement;
createHighlight();

var overlay;
var overlayElement;
createOverlay();

function onMouseMove(e) {
    overlay.css('pointer-events', 'none');
    var target = $(document.elementFromPoint(e.clientX, e.clientY));
    overlay.css('pointer-events', 'auto');

    if (target.attr('class') !== 'slug') {
        target = nearestNonInline(target);
        var targetElement = target.get(0);

        if (targetElement !== bodyElement) {
            highlight.css({
                top: target.offset().top,
                left: target.offset().left,
                width: target.outerWidth(),
                height: target.outerHeight(),
                'pointer-events': 'none'
            });
            highlight.show();
        } else {
            highlight.hide();

            e.stopPropagation();
            e.preventDefault();
            return false;
        }
    }
}

// eat other mouse events
function onMouseNothing(e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
}

// PHIL CHANGE: Stops the tool if it's running on Right Click
function onMouseDown(e) {
  if (event.which === 3 && enabled)
	{
		enable(false);
		$(document).one('contextmenu',function(e){
			return false;
		});
	}
	e.preventDefault();
	e.stopPropagation();
	return false;
}

function onMouseClick(e) {
    overlay.css('pointer-events', 'none');
    var target = $(document.elementFromPoint(e.clientX, e.clientY));
    overlay.css('pointer-events', 'auto');

    if (target && target.attr('css') !== 'slug') {
        target = nearestNonInline(target);
        var targetElement = target.get(0);

        var targetSelector = generateSelector(target);
		// PHIL CHANGE: Disabling saving altogether.
        //chrome.extension.sendMessage({command:'save_eraser', data: targetSelector});

        removeTarget(target);
        highlight.fadeOut(parseInt(options.fadeSpeed, 10));
    }

    e.stopPropagation();
    e.preventDefault();
    return false;
}

function onDocumentResize(e) {
    resizeOverlay();
}

function onDocumentScroll(e) {
    highlight.hide();
}

function resizeOverlay() {
    overlay.css({
        height: win.height()
    });
}

function createHighlight() {
    highlight = $('<div id="pageeraser_highlight"></div>');
    highlightElement = highlight.get(0);
    highlight.css({
        display: 'block',
        position: 'absolute',
        'z-index': 10000,
        background: 'red',
        opacity: '0.5',
        'pointer-events': 'none'
    });
}

function createOverlay() {
    overlay = $('<div id="pageeraser_overlay">testing</div>');
    overlayElement = overlay.get(0);
    overlay.css({
        display: 'block',
        position: 'fixed',
        top: 0,
        left: 0,
        'z-index': 9000,
        width: '100%',
        height: '200px',
        background: 'black',
        opacity: '0'
    });
}

function createSlug(target) {
    var slug = $('<div class="slug"></div>');
    slug.copyCSS(target);
    slug.height(target.height());
    slug.width(target.width());
    slug.css({
        border: 'none',
        background: 'none',
        'pointer-events': 'none'
    });
    return slug;
}

/*
    Travels up the hierarchy looking for a non-inline parent and returns it.
    If none are found, return the original element.
*/
function nearestNonInline(element) {
    if (element.css('display') !== 'inline') {
        return element;
    }

    var originalElement = element;
    var parent;
    // ignore the body
    while ((parent = element.parent(':not(body)')).length > 0) {
        if (parent.css('display') !== 'inline') {
            return parent;
        } else {
            element = parent;
        }
    }

    return element;
}

/*
    Generates an absolute selector based on all the ancestors of the target.
*/
function generateSelector(target) {
    var sel = '';
    target = $(target);
    var targetElement = target.get(0);

    var ancestors = target.parents().andSelf();
    ancestors.each(function(i, ancestorElement) {
        ancestor = $(ancestorElement);
        var subsel = ancestorElement.tagName.toLowerCase();;

        var id = ancestor.attr('id');
        if (id && id.length > 0) {
            subsel += '#' + id;
        } else {
            var classes = ancestor.attr('class');
            if (classes && classes.length > 0) {
                subsel += '.' + classes.replace(/\s+/g, '.');
            }

            var index = ancestor.index(sel + subsel);
            if ($(sel + subsel).siblings(subsel).length > 0) {
                subsel += ':eq(' + index + ')';
            }
        }

        sel += subsel;

        if (i < ancestors.length - 1) {
            sel += ' > ';
        }
    });

    return sel;
}

function removeTarget(target) {
    var slug = createSlug(target);
    target.fadeOut(parseInt(options.fadeSpeed, 10), function() {
        if (options.maintainStructure === 'true') {
            slug.insertAfter(target);
        }
        target.remove();
    });
}

// shortcut
$(document).on('keydown', function(e) {
    if ((e.ctrlKey) && e.shiftKey && e.which === 69) {
        enable(!enabled);
    }
});

function enable(state) {
    if (state) {
        enabled = true;
        chrome.extension.sendMessage({command: 'update_badge', data: 'on'});
        body.append(overlay);
        overlay.show();
        resizeOverlay();
        body.append(highlight);
        overlay.on('mousemove', onMouseMove);
		// PHIL CHANGE: Removed mouse down.
        doc.on('mouseup', onMouseNothing);
        doc.on('click', onMouseClick);
		// PHIL CHANGE: Added mouse down.
		doc.on('mousedown', onMouseDown);
        win.on('resize', onDocumentResize);
        win.on('scroll', onDocumentScroll);
        if (options.customCursor === 'true') {
            body.css('cursor', 'url(' + cursorUrl + '), auto');
        }

        // remember the old wmode to restore it later
        var flashParams = $('param[name=wmode]');
        flashParams.each(function(item) {
            var item = $(item);
            item.data('originalWmode', item.attr('value'));
            item.attr('wmode', 'transparent');
        });
        var flashEmbeds = $('embed[wmode]');
        flashEmbeds.each(function(item) {
            var item = $(item);
            item.data('originalWMode', item.attr('wmode'));
            item.attr('wmode', 'transparent');
        })
    } else {
        enabled = false;
        chrome.extension.sendMessage({command: 'update_badge', data: ''});
        overlay.off('mousemove', onMouseMove);
		// PHIL CHANGE: Removed mouse down.
        doc.off('mouseup', onMouseNothing);
		// PHIL CHANGE: Added mouse down.
		doc.off('mousedown', onMouseDown);
        doc.off('click', onMouseClick);
        win.off('resize', onDocumentResize);
        win.off('scroll', onDocumentScroll);
        overlay.fadeOut(parseInt(options.fadeSpeed, 10), function() {
            overlay.remove();
        });
        highlight.fadeOut(parseInt(options.fadeSpeed, 10), function() {
            highlight.remove();
        });
        body.css('cursor', 'auto');

        // restore wmode
        var flashParams = $('param[name=wmode]');
        flashParams.each(function(item) {
            var item = $(item);
            var originalWmode = item.data('originalWmode');
            if (originalWmode) {
                item.attr('value', originalWmode);
            }
        });
        var flashEmbeds = $('embed[wmode]');
        flashEmbeds.each(function(item) {
            var item = $(item);
            var originalWmode = item.data('originalWmode');
            if (originalWmode) {
                item.attr('wmode', originalWmode);
            }
        });
    }
}

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    if (request['enabled'] !== undefined) {
        enable(!enabled);
    }
});

$(document).ready(function() {
    chrome.extension.sendMessage({command:'load_options'}, function(response) {
        options = response;

        chrome.extension.sendMessage({command: 'load_erasers'}, function(response) {
            var pages = response;
            for (var key in pages) {
                var page = pages[key];
                for (var i = 0; i < page.erasers.length; i++) {
                    var target = $(page.erasers[i].selector);
                    removeTarget(target);
                }
            }
        });
    });
});
