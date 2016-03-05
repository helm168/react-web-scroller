import EventEmitter from 'events';

function getElPosition(el) {
    var transformStyle = window.getComputedStyle(el)['transform'];
    var matrix = transformStyle.split(')')[0].split(',');
    var translateX, translateY;
    translateX = Number(matrix[4]);
    translateY = Number(matrix[5]);
    return {
        x: translateX,
        y: translateY
    };
}

function Ease(options) {
    this.options = options || {};
}

Ease.prototype.setOptions = function(options) {
    Object.assign(this.options, options);
}

Ease.prototype.getOptions = function(optionKey) {
    return this.options[optionKey];
}

Ease.prototype.clone = function() {
    return new this.constructor(this.options);
}

Ease.prototype.reset = empty;

function empty() {}

function Quadratic(options) {
    options = Object.assign({
        style: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fn: function(k) {
            return k * (2 - k);
        }
    }, options);
    Ease.call(this, options);
}

Quadratic.prototype.setEndValue = function(endValue) {
    this._endValue = endValue;
}

Quadratic.prototype.getEndValue = function() {
    if (this._endValue == undefined) {
        this._calculate();
    }
    return this._endValue;
}

Quadratic.prototype.getDuration = function() {
    if (this._duration == undefined) {
        this._calculate();
    }
    return this._duration;
}

Quadratic.prototype.reset = function() {
    this._duration = undefined;
    this._endValue = undefined;
}

Quadratic.prototype._calculate = function() {
    var momentum = this.momentum(this.options.position, this.options.flickStartPosition,
            this.options.flickTime, this.options.maxPosition, this.options.wrapperSize);
    this._endValue = momentum.destination;
    this._duration = momentum.duration;
}

Quadratic.prototype.momentum = function(current, start, time, lowerMargin, wrapperSize, deceleration) {
    var distance = current - start,
        speed = Math.abs(distance) / time,
        destination,
        duration;

    deceleration = deceleration === undefined ? 0.0006 : deceleration;

    destination = current + (speed * speed) / (2 * deceleration) * (distance < 0 ? -1 : 1);
    duration = speed / deceleration;

    if (destination < lowerMargin) {
        destination = wrapperSize ? lowerMargin - (wrapperSize / 2.5 * (speed / 8)) : lowerMargin;
        distance = Math.abs(destination - current);
        duration = distance / speed;
    } else if (destination > 0) {
        destination = wrapperSize ? wrapperSize / 2.5 * (speed / 8) : 0;
        distance = Math.abs(current) + destination;
        duration = distance / speed;
    }

    return {
        destination: Math.round(destination),
        duration: duration
    };
};

Object.setPrototypeOf(Quadratic.prototype, Ease.prototype);

function Circular(options) {
    options = Object.assign({
        style: 'cubic-bezier(0.1, 0.57, 0.1, 1)', // Not properly "circular" but this looks better, it should be (0.075, 0.82, 0.165, 1)
        fn: function(k) {
            return Math.sqrt(1 - (--k * k));
        }
    }, options);
    Ease.call(this, options);
}

Circular.prototype.setEndValue = function(endValue) {
    this.options.endValue = endValue;
}

Circular.prototype.getEndValue = function() {
    return this.getOptions('endValue');
}

Circular.prototype.getDuration = function() {
    return this.getOptions('duration');
}

Object.setPrototypeOf(Circular.prototype, Ease.prototype);

function Bounce(options) {
    options = Object.assign({
        style: '',
        fn: function(k) {
            if ((k /= 1) < (1 / 2.75)) {
                return 7.5625 * k * k;
            } else if (k < (2 / 2.75)) {
                return 7.5625 * (k -= (1.5 / 2.75)) * k + 0.75;
            } else if (k < (2.5 / 2.75)) {
                return 7.5625 * (k -= (2.25 / 2.75)) * k + 0.9375;
            } else {
                return 7.5625 * (k -= (2.625 / 2.75)) * k + 0.984375;
            }
        }
    }, options);
    Ease.call(this, options);
}

Bounce.prototype.move = function() {
};

Object.setPrototypeOf(Bounce.prototype, Ease.prototype);

let eases = {
    back: {
        style: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        fn: function(k) {
            var b = 4;
            return (k = k - 1) * k * ((b + 1) * k + b) + 1;
        }
    },
    elastic: {
        style: '',
        fn: function(k) {
            var f = 0.22,
                e = 0.4;

            if (k === 0) {
                return 0;
            }
            if (k == 1) {
                return 1;
            }

            return (e * Math.pow(2, -10 * k) * Math.sin((k - f / 4) * (2 * Math.PI) / f) + 1);
        }
    }
};

export default {Quadratic, Circular, Bounce};
