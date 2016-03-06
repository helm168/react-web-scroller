import React      from 'react';
import ReactDOM   from 'react-dom';
import Resize     from 'react-web-resize';
import { Circular, Quadratic }   from './ease';
import Translate from './translate';
import Indicator from './indicator';
import { DIRECTION } from './indicator';
import debounce from 'debounce';
import {
    setLocked,
    clearLocked,
    hasLocked,
    hasLockedWith,
} from './lock-manager';

let {
    Component,
} = React;

// todo
// 1. stop wheel
// 3. props 判断是否update
// 4. 事件节流

class Scroller extends Component {
    constructor(props) {
        super(props);
        this._startPosition = {
            x: 0,
            y: 0,
        };

        this._dragStartPosition = {
            x: 0,
            y: 0,
        };

        this._flickStartPosition = {
            x: 0,
            y: 0,
        };

        this._flickStartTime = {
            x: 0,
            y:0,
        };

        this._position = {
            x: 0,
            y: 0,
        };

        this._axisEnabledFlag = {
            x: true,
            y: true,
        };

        this._inDragging = false;

        this._listener = {};

        // debounce resize
        this._resize = debounce(this._doResize.bind(this), 100);
    }

    static defaultProps = {
        distanceToMove: 15,
        outOfBoundRestrictFactor: 0.5,
        //direction lock
        //n: short for none
        //b: short for both
        //v: short for vertical
        //h: short for horizontal
        direction: 'v',
        showIndicator: true,
        lock: false,
        boundTime: 600,
        flickResetTime: 300,
        momentumVelocity: 0.3,
        useCssTransition: true,
    }

    // easy pubsub
    on(type, listener) {
        if (!this._listener[type]) {
            this._listener[type] = [];
        }
        this._listener[type].push(listener);
    }

    off(type, listener) {
        if (this._listener[type]) {
            this._listener[type] = this._listener[type].filter(each => each !== listener);
        }
    }

    trigger(type, ...args) {
        let listeners = this._listener[type];
        if (listeners) {
            listeners.forEach(each => each(...args));
        }
    }

    _getPosition(evt) {
        let position = {
            x: 0,
            y: 0,
        };
        if(evt.touches) {
            let touch = evt.touches[0];
            position.x = touch.pageX;
            position.y = touch.pageY;
        } else {
            position.x = evt.pageX;
            position.y = evt.pageY;
        }
        return position;
    }

    _onTouchStart(evt) {
        evt.preventDefault();
        this._translate.stopAnimation();
        this._stopAnimationIndicators();

        this._inDragging = true;
        this._triggerStart = false;
        let elPosition = this._getPosition(evt);
        this._dragStartPosition = elPosition;
        this._flickStartPosition = {
            x: this._position.x,
            y: this._position.y,
        };
        var now = Date.now();
        this._flickStartTime = {
            x: now,
            y: now,
        };
        this._startPosition = {
            x: this._position.x,
            y: this._position.y,
        };
    }

    _onAxisMove(axis, delta, movePosition) {
        if(!this._axisEnabledFlag[axis])
            return;

        let startPosition = this._startPosition[axis],
            maxPosition = this._maxPosition[axis],
            minPosition = this._minPosition[axis],
            flickStartPosition = this._flickStartPosition[axis],
            flickStartTime = this._flickStartTime[axis],
            currentPosition, restrict;

        restrict = this.props.outOfBoundRestrictFactor;

        currentPosition = startPosition - delta;
        if(currentPosition > maxPosition) {
            currentPosition = (currentPosition - maxPosition) * restrict + maxPosition;
        } else if(currentPosition < minPosition) {
            currentPosition = (currentPosition - minPosition) * restrict + minPosition;
        }

        let now = Date.now(),
            flickResetTime = this.props.flickResetTime;

        if(now - flickStartTime >= flickResetTime) {
            this._flickStartPosition[axis] = this._position[axis];
            this._flickStartTime[axis] = now;
        }

        movePosition[axis] = currentPosition;
    }

    _onTouchMove(evt) {
        if(!this._inDragging) return;
        let elPosition = this._getPosition(evt),
            dragStartPosition = this._dragStartPosition,
            startPosition = this._startPosition,
            absDistanceX, absDistanceY, distanceToMove,
            deltaX, deltaY;

        deltaX = elPosition.x - dragStartPosition.x;
        deltaY = elPosition.y - dragStartPosition.y;

        absDistanceX = Math.abs(deltaX);
        absDistanceY = Math.abs(deltaY);
        distanceToMove = this.props.distanceToMove;
        let moveX, moveY;
        //移动距离超过一定距离才继续执行
        if (absDistanceX < distanceToMove && absDistanceY < distanceToMove) {
            return;
        } else if (absDistanceX >= distanceToMove) {
            moveX = true;
        } else {
            moveY = true;
        }

        // 是否需要lock住
        if (this.props.lock) {
            if ((moveX && this.props.direction === 'h')
                    || (moveY && this.props.direction === 'v')) {
                setLocked(this);
            }
        }

        // 让当前事件执行完，不然在其他的scroll lock前，第一个lock判断会无效, 导致触发scrollStart，进而出现滚动条
        setTimeout(() => {
            if (hasLocked() && !hasLockedWith(this)) {
                this._inDragging = false;
                return;
            };

            let movePosition = {
                x: 0,
                y: 0
            };
            this._onAxisMove('x', deltaX, movePosition);
            this._onAxisMove('y', deltaY, movePosition);
            this._position = movePosition; 

            this._translate.translate(-movePosition.x, -movePosition.y);
            this._translateIndicators(movePosition);
            if (!this._triggerStart) {
                this.trigger('scrollStart', this);
                this._triggerStart = true;
            }
        });
    }

    _translateIndicators(position) {
        if (this.refs.indicatorV) {
            this.refs.indicatorV.scrollTo(position.x, position.y);
        }

        if (this.refs.indicatorH) {
            this.refs.indicatorH.scrollTo(position.x, position.y);
        }
    }

    _translateAnimationIndicators(animation) {
        let newAnimation = {};
        if (animation) {
            newAnimation.cssTransition = animation.cssTransition;
            if (animation.easingX) {
                newAnimation.easingX = animation.easingX.clone();
            }
            if (animation.easingY) {
                newAnimation.easingY = animation.easingY.clone();
            }
        }
        if (this.refs.indicatorV) {
            this.refs.indicatorV.scrollAnimation(newAnimation);
        }

        if (this.refs.indicatorH) {
            this.refs.indicatorH.scrollAnimation(newAnimation);
        }
    }

    _stopAnimationIndicators() {
        if (this.refs.indicatorV) {
            this.refs.indicatorV.stopAnimation();
        }

        if (this.refs.indicatorH) {
            this.refs.indicatorH.stopAnimation();
        }
    }

    scrollTo(position, ease) {
    }

    getPosition() {
        return {
            x: this._position.x,
            y: this._position.y,
        };
    }

    getMaxPosition() {
        if (!this._maxPosition) {
            let containerSize = this.getContainerSize();
            let contentSize = this.getContentSize();
            this._maxPosition = {
                x: contentSize.x - containerSize.x,
                y: contentSize.y - containerSize.y,
            };
        }
        return this._maxPosition;
    }

    getMinPosition() {
        if (!this._minPosition) {
            this._minPosition = {
                x: 0,
                y: 0
            };
        }
        return this._minPosition;
    }

    _onTouchEnd(evt) {
        this._inDragging = false;
        let easingX, easingY;
        easingX = this._getAxisAnimationEasing('x');
        easingY = this._getAxisAnimationEasing('y');
        if(easingX || easingY) {
            let animation = {
                easingX: easingX,
                easingY: easingY,
                cssTransition: true,
            };
            this._translate.translateAnimation(animation);
            this._translateAnimationIndicators(animation);
        } else {
            this.trigger('scrollEnd', this);
        }

        // 是否需要lock住
        if (this.props.lock) {
            clearLocked(this);
        }
    }

    _getAxisAnimationEasing(axis) {
        if(!this._axisEnabledFlag[axis])  return;

        let position = this._position[axis],
            flickStartPosition = this._flickStartPosition[axis],
            flickStartTime = this._flickStartTime[axis],
            containerSize = this.getContainerSize()[axis],
            maxPosition = this._maxPosition[axis],
            minPosition = this._minPosition[axis];

        let bounceValue = null;
        if(position < minPosition) {
            bounceValue = minPosition;
        } else if(position > maxPosition) {
            bounceValue = maxPosition;
        }

        let now = Date.now();
        if(bounceValue != null) {
            let bounceEasing = this._getBounceEasing()[axis];
            bounceEasing.reset();
            bounceEasing.setOptions({
                startValue: -position,
                startTime: now,
                endValue: -bounceValue,
            });
            return bounceEasing;
        }

        let velocity = (position - flickStartPosition) / (now - flickStartTime);
        if(Math.abs(velocity) >= this.props.momentumVelocity) {
            let momentumEasing = this._getMomentumEasing()[axis];
            momentumEasing.reset();
            momentumEasing.setOptions({
                flickStartPosition: -flickStartPosition,
                flickTime: now - flickStartTime,
                position: -position,
                maxPosition: -maxPosition,
                wrapperSize: containerSize,
            });
            return momentumEasing;
        }
    }

    _getBounceEasing() {
        if (!this._bounceEasing) {
            let duration = this.props.boundTime;
            this._bounceEasing = {
                x: new Circular({
                    duration: duration,
                }),
                y: new Circular({
                    duration: duration,
                }),
            };
        }
        return this._bounceEasing;
    }

    _getMomentumEasing() {
        if (!this._momentumEasing) {
            this._momentumEasing = {
                x: new Quadratic(),
                y: new Quadratic(),
            };
        }
        return this._momentumEasing;
    }

    _onWheel(evt) {
        evt.preventDefault();

        // 如果被其他scroll锁定，直接return
        if (hasLocked() && !hasLockedWith(this)) return;

        let deltaX = evt.deltaX;
        let deltaY = evt.deltaY;
        // 是否需要lock住
        if (this.props.lock) {
            let absDeltaX = Math.abs(deltaX);
            let absDeltaY = Math.abs(deltaY);
            let moveX, moveY;
            if (absDeltaX > absDeltaY) {
                moveX = true;
            }  else if (absDeltaY > absDeltaX) {
                moveY = true;
            } else {
                // deltaX 和 deltaY一样时，无法判断方向，直接返回, 等待后续事件
                return;
            }
            if ((moveX && this.props.direction === 'h')
                    || (moveY && this.props.direction === 'v')) {
                setLocked(this);
            }
        }

        // setTimeout 原因参考touchMove事件里的注释
        setTimeout(() => {
            if (hasLocked() && !hasLockedWith(this)) return;

            let movePosition = { x : 0, y: 0 };
            this._onAxisWheel('x', deltaX, movePosition);
            this._onAxisWheel('y', deltaY, movePosition);

            this._position.x = movePosition.x;
            this._position.y = movePosition.y;

            this._translate.translate(-this._position.x, -this._position.y);
            this._translateIndicators(this._position);

            // 有新的wheel事件清除timer
            if (this._wheelTimer) {
                clearTimeout(this._wheelTimer);
                this._triggerWheelStart = false;
                this._wheelTimer = null;
            }
            if (!this._triggerWheelStart) {
                this._translate.stopAnimation();
                this.trigger('scrollStart', this);
                this._triggerWheelStart = true;

                // 400ms后认为scrollEnd
                this._wheelTimer = setTimeout(() => {
                    this.trigger('scrollEnd', this);
                    this._triggerWheelStart = false;
                    this._wheelTimer = null;
                    clearLocked(this);
                }, 400);
            }
        });
    }

    _onAxisWheel(axis, delta, movePosition) {
        if (!this._axisEnabledFlag[axis]) return;
    
        let velocity = 1;
        delta = velocity * delta;
        let newPosition = this._position[axis] + delta;
        let maxPosition = this._maxPosition[axis];
        let minPosition = this._minPosition[axis];
        if (newPosition > maxPosition) {
            newPosition = maxPosition;
        } else if (newPosition < minPosition) {
            newPosition = minPosition;
        }

        movePosition[axis] = newPosition;
    }

    _backToBoundary(animate) {
        let boundaryArgsX = this._getAxisBoundaryArgs('x', animate);
        let boundaryArgsY = this._getAxisBoundaryArgs('y', animate);
        if ((boundaryArgsX && boundaryArgsX.needMove)
                || (boundaryArgsY && boundaryArgsY.needMove)) {
            this._translate.translateAnimation({
                easingX: boundaryArgsX && boundaryArgsX.easing,
                easingY: boundaryArgsY && boundaryArgsY.easing,
                cssTransition: true,
            });
        } else {
            //this._translate.translate(boundaryArgsX.bounceValue || 0, boundaryArgsY.bounceValue || 0);
        }
    }

    _getAxisBoundaryArgs(axis, animate) {
        if (!this._axisEnabledFlag[axis]) return;
        let maxPosition, minPosition, position, needMove, bounceValue;
        maxPosition = this.getMaxPosition()[axis];
        minPosition = this.getMinPosition()[axis];
        position = this._position[axis];
        needMove = false;
        if (position < minPosition) {
            needMove = true;
            bounceValue = minPosition;
        } else if(position > maxPosition) {
            needMove = true;
            bounceValue = maxPosition;
        }

        let bounceEasing;
        if (needMove && animate) {
            bounceEasing = this._getBounceEasing()[axis];
            bounceEasing.setOptions({
                startValue: -position,
                startTime: Date.now(),
                endValue: -bounceValue,
            });
        }

        return {
            needMove: needMove,
            easing: bounceEasing,
            bounceValue: bounceValue,
        };
    }

    _refreshPosition() {
        this._containerSize = null;
        this._contentSize = null;
        let containerSize = this.getContainerSize();
        let contentSize = this.getContentSize();
        this._maxPosition = {
            x: Math.max(0, contentSize.x - containerSize.x),
            y: Math.max(0, contentSize.y - containerSize.y),
        };
        this._minPosition = {
            x: 0,
            y: 0
        };
    }
    
    getContainerSize() {
        if(!this._containerSize) {
            this._containerSize = {
                x: this._wrapperEl.clientWidth,
                y: this._wrapperEl.clientHeight
            };
        }
        return this._containerSize;
    }

    getContentSize() {
        if(!this._contentSize) {
            this._contentSize = {
                x: this._contentEl.offsetWidth,
                y: this._contentEl.offsetHeight
            };
        }
        return this._contentSize;
    }

    _refreshAxisEnabled() {
        let direction = this.props.direction;
        if(direction === 'b') {
            this._axisEnabledFlag.x = true;
            this._axisEnabledFlag.y = true;
        } else if(direction === 'v') {
            this._axisEnabledFlag.x = false;
            this._axisEnabledFlag.y = true;
        } else if(direction === 'h') {
            this._axisEnabledFlag.x = true;
            this._axisEnabledFlag.y = false;
        } else {
            this._axisEnabledFlag.x = false;
            this._axisEnabledFlag.y = false;
        }
    }

    _onEasingEnd(position) {
        this._position.x = -position.x;
        this._position.y = -position.y;
        this._backToBoundary(true);
        this.trigger('scrollEnd', this);
    }

    componentDidMount() {
        this._wrapperEl = ReactDOM.findDOMNode(this);
        this._contentEl = this._wrapperEl.children[0]; 
        this._translate = new Translate(this._contentEl);
        this._translate.on('easingEnd', this._onEasingEnd.bind(this));
        this._refreshPosition();
        this._refreshAxisEnabled();
    }

    componentDidUpdate() {
        this._refreshPosition();
        this._refreshAxisEnabled();
    }
    
    _doResize() {
        this._refreshPosition();
        this._backToBoundary();
        this._indicatorsResize();
    }

    _indicatorsResize() {
        if (this.refs.indicatorV) {
            this.refs.indicatorV.resize();
        }

        if (this.refs.indicatorH) {
            this.refs.indicatorH.resize();
        }
    }

    _renderIndicators() {
        let direction = this.props.direction;
        let showIndicator = this.props.showIndicator;
        if (showIndicator) {
            if (DIRECTION.V === direction || DIRECTION.V.toLowerCase() === direction) {
                return <Indicator direction={DIRECTION.V} scroller={this}
                            indicatorStyle={this.props.indicatorStyle}
                            ref='indicatorV' />
            } else if (DIRECTION.H === direction || DIRECTION.H.toLowerCase() === direction) {
                return <Indicator direction={DIRECTION.H} scroller={this}
                            indicatorStyle={this.props.indicatorStyle}
                            ref='indicatorH' />
            } else if (DIRECTION.B === direction || DIRECTION.B.toLowerCase() === direction) {
                return (
                    <div>
                        <Indicator direction={DIRECTION.V} scroller={this}
                            indicatorStyle={this.props.indicatorStyle}
                            style={this.props.indicatorStyle}
                            ref='indicatorV' />
                        <Indicator direction={DIRECTION.H} scroller={this}
                            indicatorStyle={this.props.indicatorStyle}
                            ref='indicatorH' />
                    </div>
                );
            }
        } else {
            return null;
        }
    }

    render() {
        let style = Object.assign({}, styles.container, this.props.style);

        let indicators = this._renderIndicators();
        return(
            <div style={style}
                onTouchStart={this._onTouchStart.bind(this)}
                onMouseDown={this._onTouchStart.bind(this)}
                onTouchMove={this._onTouchMove.bind(this)}
                onMouseMove={this._onTouchMove.bind(this)}
                onTouchEnd={this._onTouchEnd.bind(this)}
                onMouseUp={this._onTouchEnd.bind(this)}
                onTouchCancel={this._onTouchEnd.bind(this)}
                onWheel={this._onWheel.bind(this)}>
                {this.props.children}
                {indicators}
                <Resize onShrink={this._resize.bind(this)}
                    onExpand={this._resize.bind(this)} />
            </div>
        );
    }
}

let styles = {
    container: {
        overflow: 'hidden',
        position: 'relative',
    }
};

export default Scroller;
