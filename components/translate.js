import EventEmitter from 'events';

let _elementStyle = document.createElement('div').style;

let _vendor = (function() {
    let vendors = ['t', 'webkitT', 'MozT', 'msT', 'OT'],
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

window.requestAnimationFrame = (function() {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function(fn) {
            return setTimeout(fn, 1000 / 60);
        };
})();

window.cancelAnimationFrame = (function() {
    return window.cancelAnimationFrame ||
        window.webKitCancelAnimationFrame ||
        window.mozCancelAnimationFrame ||
        window.oCancelAnimationFrame ||
        window.msCancelAnimationFrame ||
        function(rafId) {
            clearTimeout(rafId);
        }
})();

class Translate extends EventEmitter {

    constructor(el) {
        super();
        this._el = el;
        this.transitionEnd = this.transitionEnd.bind(this);
        this._doAnimationFrame = this._doAnimationFrame.bind(this);
    }

    _doTranslate(x = 0, y = 0) {
        let el = this._el;
        if (el) {
            el.style[vendorStyle.transform] = `translate3d(${x}px, ${y}px, 0px)`;
        }
    }

    _getElPosition(el) {
        let transformStyle = window.getComputedStyle(el)[vendorStyle.transform];
        let matrix = transformStyle.split(')')[0].split(',');
        let translateX, translateY;
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
        this.x = x || 0;
        this.y = y || 0;
        this._doTranslate(this.x, this.y);
    }

    easingEnd() {
        this._inAnimate = false;
        this._activeEasingX = this._activeEasingY = null;
        this.emit('easingEnd', {x: this.x, y: this.y});
    }

    translateAnimation(animation) {
        let easingX = this._activeEasingX = animation.easingX;
        let easingY = this._activeEasingY = animation.easingY;

        let cssTransition = this._cssTransition = animation.cssTransition;
        let el = this._el;

        if (el) {
            this._inAnimate = true;
            if (cssTransition) {
               this._doCssAnimation(animation);
            } else {
                cancelAnimationFrame(this.animationFrameId);
                this._translateArr = [];
                this._type = 'animation';
                this.animationFrameId = requestAnimationFrame(this._doAnimationFrame);

            }
        }
    }

    _doCssAnimation() {
        let easingX, easingY;
        let x, y, styleX, styleY, durationX, durationY;

        easingX = this._activeEasingX;
        easingY = this._activeEasingY;
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

        let style = styleX || styleY;
        let duration = Math.max(durationX, durationY);
        let el = this._el;
        el.style[vendorStyle.transitionTimingFunction] = style;
        el.style[vendorStyle.transitionDuration] = duration + 'ms';
        el.addEventListener('transitionend', this.transitionEnd, false);
        this._doTranslate(x, y);
    }

    _doAnimationFrame() {
        let easingX = this._activeEasingX,
            easingY = this._activeEasingY,
            now = Date.now(),
            x, y;

        if (!this._inAnimate) {
            return;
        }

        this.animationFrameId = requestAnimationFrame(this._doAnimationFrame);

        if (!easingX && !easingY) {
            this.stopAnimation();
            return;
        }
        if (easingX) {
            this.x = x = Math.round(easingX.getValue());

            if (easingX.isEnded()) {
                this._activeEasingX = null;
            }
        } else {
            x = this.x || 0;
        }
        if (easingY) {
            this.y = y = Math.round(easingY.getValue());

            if (easingY.isEnded()) {
                this._activeEasingY = null;
            }
        } else {
            y = this.y || 0;
        }
        if (this._lastX !== x || this._lastY !== y) {
            this._doTranslate(x, y);

            this._lastX = x;
            this._lastY = y;

            this.emit('easing', {x: x, y: y});
        }
    }

    stopAnimation() {
        if (this._inAnimate) {
            this._inAnimate = false;

            if (this._cssTransition) {
                let el = this._el;
                let currentPosition = this._getElPosition(el);
                this._doTranslate(currentPosition.x, currentPosition.y);
                this.transitionEnd();
            } else {
                cancelAnimationFrame(this.animationFrameId);
                this.easingEnd();
            }

        }
    }
}

export default Translate;
