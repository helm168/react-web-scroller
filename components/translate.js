import EventEmitter from 'events';

let _elementStyle = document.createElement('div').style;

let _vendor = (function() {
    var vendors = ['t', 'webkitT', 'MozT', 'msT', 'OT'],
        transform,
        i = 0,
        l = vendors.length;

    for (; i < l; i++) {
        transform = vendors[i] + 'ransform';
        if (transform in _elementStyle) return vendors[i].substr(0, vendors[i].length - 1);
    }

    return false;
})();

function _prefixStyle(style) {
    if (_vendor === false) return false;
    if (_vendor === '') return style;
    return _vendor + style.charAt(0).toUpperCase() + style.substr(1);
}

let vendorStyle = {
    transform: _prefixStyle('transform'),
    transitionTimingFunction: _prefixStyle('transitionTimingFunction'),
    transitionDuration: _prefixStyle('transitionDuration'),
    transitionDelay: _prefixStyle('transitionDelay'),
    transformOrigin: _prefixStyle('transformOrigin')
};

class Translate extends EventEmitter {

    constructor(el) {
        super();
        this._el = el;
        this.transitionEnd = this.transitionEnd.bind(this);
    }

    _doTranslate(x = 0, y = 0) {
        let el = this._el;
        if (el) {
            el.style[vendorStyle.transform] = `translate3d(${x}px, ${y}px, 0px)`;
        }
    }

    _getElPosition(el) {
        var transformStyle = window.getComputedStyle(el)['transform'];
        var matrix = transformStyle.split(')')[0].split(',');
        var translateX, translateY;
        translateX = Number(matrix[4]);
        translateY = Number(matrix[5]);
        return {
            x: translateX,
            y: translateY,
        };
    }

    transitionEnd() {
        let el = this._el;
        if (el) {
            el.removeEventListener('transitionend', this.transitionEnd);
            el.style[vendorStyle.transitionDuration] = '0ms';
            this._inAnimate = false;
            let position = this._getElPosition(el);
            this.emit('easingEnd', position);
        }
    }

    translate(x, y) {
        this._doTranslate(x, y);
    }

    translateAnimation(animation) {
        let easingX = animation.easingX;
        let easingY = animation.easingY;
        let cssTransition = animation.cssTransition;
        let el = this._el;

        if (el) {
            let x, y, styleX, styleY, durationX, durationY;
            if (easingX) {
                x = easingX.getEndValue();
                styleX = easingX.getOptions('style');
                durationX = easingX.getDuration();
            } else {
                x = 0;
                durationX = 0;
            }

            if (easingY) {
                y = easingY.getEndValue();
                styleY = easingY.getOptions('style');
                durationY = easingY.getDuration();
            } else {
                y = 0;
                durationY = 0;
            }

            if (cssTransition) {
                let style = styleX || styleY;
                let duration = Math.max(durationX, durationY);
                el.style[vendorStyle.transitionTimingFunction] = style;
                el.style[vendorStyle.transitionDuration] = `${duration}ms`;
                el.addEventListener('transitionend', this.transitionEnd, false);
                this._inAnimate = true;
            } else {
                // todo
            }
            this._doTranslate(x, y);
        }
    }

    stopAnimation() {
        if (this._inAnimate) {
            this._inAnimate = false;

            let el = this._el;
            let currentPosition = this._getElPosition(el);
            this._doTranslate(currentPosition.x, currentPosition.y);
            this.transitionEnd();
        }
    }
}

export default Translate;
