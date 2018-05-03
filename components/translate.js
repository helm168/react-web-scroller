import EventEmitter from 'events';

const _elementStyle = document.createElement('div').style;

const _vendor = (function () {
  const vendors = ['t', 'webkitT', 'MozT', 'msT', 'OT'];
  let transform;
  let i = 0;
  const l = vendors.length;

  for (; i < l; i++) {
    transform = `${vendors[i]}ransform`;
    if (transform in _elementStyle) return vendors[i].substr(0, vendors[i].length - 1);
  }

  return false;
}());

function _prefixStyle(style) {
  if (_vendor === false) return false;
  if (_vendor === '') return style;
  return _vendor + style.charAt(0).toUpperCase() + style.substr(1);
}

const vendorStyle = {
  transform: _prefixStyle('transform'),
  transitionTimingFunction: _prefixStyle('transitionTimingFunction'),
  transitionDuration: _prefixStyle('transitionDuration'),
  transitionDelay: _prefixStyle('transitionDelay'),
  transformOrigin: _prefixStyle('transformOrigin')
};

window.requestAnimationFrame = (function () {
  return window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (fn) {
      return setTimeout(fn, 1000 / 60);
    };
}());

window.cancelAnimationFrame = (function () {
  return window.cancelAnimationFrame ||
    window.webKitCancelAnimationFrame ||
    window.mozCancelAnimationFrame ||
    window.oCancelAnimationFrame ||
    window.msCancelAnimationFrame ||
    function (rafId) {
      clearTimeout(rafId);
    };
}());

class Translate extends EventEmitter {
  constructor(el) {
    super();
    this._el = el;
    this.transitionEnd = this.transitionEnd.bind(this);
    this._doAnimationFrame = this._doAnimationFrame.bind(this);
  }

  _doTranslate(x = 0, y = 0) {
    const el = this._el;
    if (el) {
      el.style[vendorStyle.transform] = `translate3d(${x}px, ${y}px, 0px)`;
    }
  }

  _getElPosition(el) {
    const transformStyle = window.getComputedStyle(el)[vendorStyle.transform];
    const matrix = transformStyle.split(')')[0].split(',');
    const translateX = Number(matrix[4]);
    const translateY = Number(matrix[5]);
    return {
      x: translateX,
      y: translateY
    };
  }

  transitionEnd() {
    const el = this._el;
    if (el) {
      el.removeEventListener('transitionend', this.transitionEnd);
      el.style[vendorStyle.transitionDuration] = '0ms';
      this._inAnimate = false;
      const position = this._getElPosition(el);
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
    this.emit('easingEnd', { x: this.x, y: this.y });
  }

  translateAnimation(animation) {
    const cssTransition = this._cssTransition = animation.cssTransition;
    const el = this._el;

    if (el) {
      this._activeEasingX = animation.easingX;
      this._activeEasingY = animation.easingY;
      this._inAnimate = true;
      if (cssTransition) {
        this._doCssAnimation(animation);
      } else {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = requestAnimationFrame(this._doAnimationFrame);
      }
    }
  }

  _doCssAnimation() {
    let x;
    let y;
    let styleX;
    let styleY;
    let durationX;
    let durationY;

    const easingX = this._activeEasingX;
    const easingY = this._activeEasingY;
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

    const style = styleX || styleY;
    const duration = Math.max(durationX, durationY);
    const el = this._el;
    el.style[vendorStyle.transitionTimingFunction] = style;
    el.style[vendorStyle.transitionDuration] = `${duration}ms`;
    el.addEventListener('transitionend', this.transitionEnd, false);
    this._doTranslate(x, y);
  }

  _doAnimationFrame() {
    const easingX = this._activeEasingX;
    const easingY = this._activeEasingY;
    let x;
    let y;

    if (!this._inAnimate) {
      return;
    }

    this.animationFrameId = requestAnimationFrame(this._doAnimationFrame);

    if (!easingX && !easingY) {
      this.stopAnimation();
      return;
    }
    if (easingX) {
      x = Math.round(easingX.getValue());
      this.x = x;

      if (easingX.isEnded()) {
        this._activeEasingX = null;
      }
    } else {
      x = this.x || 0;
    }
    if (easingY) {
      y = Math.round(easingY.getValue());
      this.y = y;

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

      this.emit('easing', { x, y });
    }
  }

  stopAnimation() {
    if (this._inAnimate) {
      this._inAnimate = false;

      if (this._cssTransition) {
        const el = this._el;
        const currentPosition = this._getElPosition(el);
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
