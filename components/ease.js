import EventEmitter from 'events';
import objectAssign from 'object-assign';

function Ease(options) {
    this.options = options || {};
}

Ease.prototype.setOptions = function(options) {
    objectAssign(this.options, options);
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
    options = objectAssign({
        style: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        minVelocity: 1,
        bounce: true,
    }, options);

    Ease.call(this, options);
}

Quadratic.prototype.setOptions = function(options) {
    objectAssign(this.options, options);

    this.getMomentum().setOptions({
        startValue: this.options.startValue,
        startTime: this.options.startTime,
        startVelocity: this.options.startVelocity,
    });
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
    this._isEnded = false;
    this._isOutOfBound = false;
    this._isBouncingBack = false;
}

Quadratic.prototype._calculate = function() {
    let momentum = this.momentum(this.options.position, this.options.flickStartPosition,
            this.options.flickTime, this.options.maxPosition, this.options.wrapperSize);
    this._endValue = momentum.destination;
    this._duration = momentum.duration;
}

Quadratic.prototype.momentum = function(current, start, time, lowerMargin, wrapperSize, deceleration) {
    let distance = current - start,
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

Quadratic.prototype.getBounce = function(options) {
    if (!this._bounce) {
        this._bounce = new Bounce(options);
    }
    return this._bounce;
};

Quadratic.prototype.getMomentum = function(options) {
    if (!this._momentum) {
        this._momentum = new Momentum(options);
    }
    return this._momentum;
};

Quadratic.prototype.getValue = function() {
    let momentum = this.getMomentum(),
        bounce = this.getBounce(),
        options = this.options,
        startVelocity = options.startVelocity,
        direction = startVelocity > 0 ? 1 : -1,
        minValue = options.minMomentumValue,
        maxValue = options.maxMomentumValue,
        bounceValue = (direction === 1) ? maxValue : minValue,
        lastValue = this._lastValue,
        value, velocity;

    if (startVelocity === 0 || this._isEnded) {
        this._isEnded = true;
        return options.startValue;
    }

    if (!this._isOutOfBound) {
        value = momentum.getValue();
        velocity = momentum.getVelocity();
        if (Math.abs(velocity) < options.minVelocity) {
            this._isEnded = true;
        }

        if (value >= minValue && value <= maxValue) {
            return value;
        } else {
            if (!this.options.bounce) {
                this._isEnded = true;
                if (value < minValue) return minValue;
                if (value > maxValue) return maxValue;
            }
        }

        this._isOutOfBound = true;

        bounce.setOptions({
            startTime: Date.now(),
            startVelocity: velocity,
            startValue: bounceValue,
        });
    }

    value = bounce.getValue();

    if (!this._isEnded) {
        if (!this._isBouncingBack) {
            if (lastValue !== null) {
                if ((direction === 1 && value < lastValue) || (direction === -1 && value > lastValue)) {
                    this._isBouncingBack = true;
                }
            }
        } else {
            if (Math.round(value) === bounceValue) {
                this._isEnded = true;
            }
        }
    }

    this._lastValue = value;

    return value;
};

Quadratic.prototype.isEnded = function() {
    return this._isEnded;
}

Object.setPrototypeOf(Quadratic.prototype, Ease.prototype);

function Circular(options) {
    options = objectAssign({
        style: 'cubic-bezier(0.1, 0.57, 0.1, 1)', // Not properly "circular" but this looks better, it should be (0.075, 0.82, 0.165, 1)
        exponent: 4,
        duration: 400,
    }, options);
    Ease.call(this, options);
}

Circular.prototype.getValue = function() {
    let options = this.options,
        deltaTime = Date.now() - options.startTime,
        duration = options.duration,
        startValue = options.startValue,
        endValue = options.endValue,
        distance = this._distance,
        theta = deltaTime / duration,
        thetaC = 1 - theta,
        thetaEnd = 1 - Math.pow(thetaC, options.exponent),
        currentValue = startValue + (thetaEnd * distance);

    if (deltaTime >= duration) {
        this._isEnded = true;
        return endValue;
    }

    return currentValue;
}

Circular.prototype.reset = function() {
    this._isEnded = false;
}

Circular.prototype.setOptions = function(options) {
    objectAssign(this.options, options);
    this._distance = this.options.endValue - this.options.startValue;
}

Circular.prototype.setEndValue = function(endValue) {
    this.setOptions('endValue', endValue);
}

Circular.prototype.getEndValue = function() {
    return this.getOptions('endValue');
}

Circular.prototype.getDuration = function() {
    return this.getOptions('duration');
}

Circular.prototype.isEnded = function() {
    return this._isEnded;
}

Object.setPrototypeOf(Circular.prototype, Ease.prototype);

function Bounce(options) {
    options = objectAssign({
        springTension: 0.3,
        acceleration: 30,
        startVelocity: 0
    }, options);
    Ease.call(this, options);
}

Bounce.prototype.getValue = function() {
    let options = this.options,
        deltaTime = Date.now() - options.startTime,
        theta = (deltaTime / options.acceleration),
        powTime = theta * Math.pow(Math.E, -options.springTension * theta);

    return options.startValue + (options.startVelocity * powTime);
}

Object.setPrototypeOf(Bounce.prototype, Ease.prototype);

function Momentum(options) {
    options = objectAssign({
        friction: 0.5,
        acceleration: 50,
        startVelocity: 0
    }, options);
    Ease.call(this, options);
}

Momentum.prototype.setOptions = function(options) {
    objectAssign(this.options, options);

    this._velocity = this.options.startVelocity * this.options.acceleration;
    this._theta = Math.log(1 - (this.options.friction / 10));
    this._alpha = this._theta / this.options.acceleration;
}

Momentum.prototype.getValue = function() {
    return this.options.startValue - this._velocity * (1 - this.getFrictionFactor()) / this._theta;
}

Momentum.prototype.getFrictionFactor = function() {
    let deltaTime = Date.now() - this.options.startTime;

    return Math.exp(deltaTime * this._alpha);
}

Momentum.prototype.getVelocity = function() {
    return this.getFrictionFactor() * this._velocity;
}

export default {Quadratic, Circular};
