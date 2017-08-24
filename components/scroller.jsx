import React      from 'react';
import ReactDOM   from 'react-dom';
import Resize     from 'react-web-resize';
import { Circular, Quadratic }   from './ease';
import Translate from './translate';
import Indicator from './indicator';
import { DIRECTION } from './indicator';
import debounce from 'debounce';
import objectAssign from 'object-assign';

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

    this._movePosition = {
      x: 0,
      y: 0,
    };

    this._axisEnabledFlag = {
      x: true,
      y: true,
    };

    this._inDragging = false;

    this._moveX = false;
    this._moveY = false;

    // debounce resize
    this._resize = debounce(this._doResize.bind(this), 100);
    this._doRafMove = this._doRafMove.bind(this);

    this._listener = {};
  }

  static defaultProps = {
    distanceToMove: 8,
    outOfBoundRestrictFactor: 0.5,
    //n: short for none
    //b: short for both
    //v: short for vertical
    //h: short for horizontal
    direction: 'v',
    showIndicator: true,
    lock: false,
    bounceTime: 400,
    flickResetTime: 300,
    momentumVelocity: 0.3,
    useCssTransition: true,
    preventDefault: true,
    bounce: true,
    rtl: false,
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

    let touches = evt.changedTouches;
    if(touches) {
      let touch = touches[0];
      position.x = touch.pageX;
      position.y = touch.pageY;
    } else {
      position.x = evt.pageX;
      position.y = evt.pageY;
    }
    return position;
  }

  _onTouchStart(evt) {
    if (this.props.preventDefault) {
      evt.preventDefault();
    }

    if (this._moveId) {
      cancelAnimationFrame(this._moveId);
      this._moveId = null;
    }

    this._stopAnimation();

    this._inDragging = true;
    let elPosition = this._getPosition(evt);
    this._dragStartPosition = elPosition;
    this._flickStartPosition = {
      x: this._position.x,
      y: this._position.y,
    };
    let now = Date.now();
    this._flickStartTime = {
      x: now,
      y: now,
    };
    this._startPosition = {
      x: this._position.x,
      y: this._position.y,
    };

    //禁止多指滑动
    if (evt.touches && evt.touches.length !== 1) {
      return this._onTouchEnd(evt);
    }

    this._triggerStart = false;
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
      if (this.props.bounce) {
        currentPosition = (currentPosition - maxPosition) * restrict + maxPosition;
      } else {
        currentPosition = maxPosition;
      }
    } else if(currentPosition < minPosition) {
      if (this.props.bounce) {
        currentPosition = (currentPosition - minPosition) * restrict + minPosition;
      } else {
        currentPosition = minPosition;
      }
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
    if(!this._inDragging) {return;}
    let elPosition = this._getPosition(evt),
      dragStartPosition = this._dragStartPosition,
      startPosition = this._startPosition,
      absDistanceX, absDistanceY, distanceToMove,
      deltaX, deltaY;

    deltaX = elPosition.x - dragStartPosition.x;
    deltaY = elPosition.y - dragStartPosition.y;

    if (!this._triggerStart) {
      absDistanceX = Math.abs(deltaX);
      absDistanceY = Math.abs(deltaY);
      distanceToMove = this.props.distanceToMove;
      //移动距离超过一定距离才继续执行
      if (absDistanceX < distanceToMove && absDistanceY < distanceToMove) {
        return;
      }
      if (absDistanceY >= distanceToMove) {
        this._moveY = true;
      }
      if (absDistanceX >= distanceToMove) {
        this._moveX = true;
      }

      // 是否需要lock住
      if (this.props.lock) {
        if ((this.props.direction === 'h' && absDistanceX > absDistanceY)
            || (this.props.direction === 'v' && absDistanceY > absDistanceX)) {
          evt.preventDefault();
          evt.stopPropagation();
        } else {
          this._inDragging = false;
          this._moveX = false;
          this._moveY = false;
          return;
        }
      }
    }

    // android下必须prevent每一个touchmove事件，才可以阻止系统滚动
    if (this.props.lock) {
      evt.preventDefault();
      evt.stopPropagation();
    }

    this._movePosition.x = 0;
    this._movePosition.y = 0;
    this._moveX && this._onAxisMove('x', deltaX, this._movePosition);
    this._moveY && this._onAxisMove('y', deltaY, this._movePosition);

    if ((this._moveX && this._axisEnabledFlag['x']) || (this._moveY && this._axisEnabledFlag['y'])) {
      this._doMove();
    }
  }

  _onTouchEnd(evt) {
    if (!this._inDragging) {return;}
    this._onTouchMove(evt);
    this._inDragging = false;

    this._moveX = false;
    this._moveY = false;

    if (this._moveId) {
      cancelAnimationFrame(this._moveId);
      this._moveId = null;
    }

    let easingX, easingY;
    easingX = this._getAxisAnimationEasing('x');
    easingY = this._getAxisAnimationEasing('y');
    if(easingX || easingY) {
      let animation = {
        easingX: easingX,
        easingY: easingY,
        cssTransition: this.props.useCssTransition,
      };
      this._translate.translateAnimation(animation);
      if (this.props.useCssTransition) {
        this._translateAnimationIndicators(animation);
      }
    } else {
      this.trigger('scrollEnd', this);
    }
  }

  _doMove() {
    if (!this._moveId) {
      this._moveId = requestAnimationFrame(() => this._doRafMove());
    }
  }

  _doRafMove() {
    this._position.x = this._movePosition.x;
    this._position.y = this._movePosition.y;

    this._translate.translate(-this._position.x, -this._position.y);
    if (this.useCssTransition) {
      this._translateIndicators(this._position);
    }
    if (!this._triggerStart) {
      this.trigger('scrollStart', this);
      this._triggerStart = true;
    } else {
      this.trigger('scroll', this, this._position);
    }
    this._moveId = null;
  }

  _translateIndicators(position) {
    // 使用css动画时才主动移动indicator
    // 使用js动画时会有scroll事件，indicator监听scroll事件进行主动移动, 解耦性更好, 代码更简洁
    this._translateAxisIndicator('x', position);
    this._translateAxisIndicator('y', position);
  }

  _translateAxisIndicator(axis, position) {
    if (this.refs[axis]) {
      this.refs[axis].scrollTo(position.x, position.y);
    }
  }

  _translateAnimationIndicators(animation) {
    this._translateAnimationAxisIndicator('x', animation);
    this._translateAnimationAxisIndicator('y', animation);
  }

  _translateAnimationAxisIndicator(axis, animation) {
    if (this.refs[axis]) {
      let newAnimation = {};
      let easingKey = 'easing' + axis.toUpperCase();
      if (animation) {
        newAnimation.cssTransition = animation.cssTransition;
        if (animation[easingKey]) {
          newAnimation[easingKey] = animation[easingKey].clone();
        }
      }
      this.refs[axis].scrollAnimation(newAnimation);
    }
  }

  _stopAnimationIndicators() {
    this._stopAnimationAxisIndicator('x');
    this._stopAnimationAxisIndicator('y');
  }

  _stopAnimationAxisIndicator(axis) {
    if (this.refs[axis])  {
      this.refs[axis].stopAnimation();
    }
  }

  scrollTo(x, y) {
    if (this._position.x !== x || this._position.y !== y) {
      let minPosition = this.getMinPosition();
      let maxPosition = this.getMaxPosition();
      if (x >= minPosition.x && y >= minPosition.y
        && x <= maxPosition.x && y <= maxPosition.y) {
        this._scrollTo(x, y);
        this.trigger('scroll', this, this._position);
      }
    }
  }

  _scrollTo(x, y) {
    this._stopAnimation();
    this._position.x = x || 0;
    this._position.y = y || 0;
    this._translate.translate(-this._position.x, -this._position.y);
  }

  getPosition() {
    return {
      x: this._position.x,
      y: this._position.y,
    };
  }

  getMaxPosition() {
    if (!this._maxPosition) {
      if (this.props.rtl) {
        this._maxPosition = {
          x: 0,
          y: 0
        };
      } else {
        let containerSize = this.getContainerSize();
        let contentSize = this.getContentSize();
        this._maxPosition = {
          x: contentSize.x - containerSize.x,
          y: contentSize.y - containerSize.y,
        };
      }
    }
    return this._maxPosition;
  }

  getMinPosition() {
    if (!this._minPosition) {
      if (this.props.rtl) {
        let containerSize = this.getContainerSize();
        let contentSize = this.getContentSize();
        this._minPosition = {
          x: -(contentSize.x - containerSize.x),
          y: -(contentSize.y - containerSize.y),
        };
      } else {
        this._minPosition = {
          x: 0,
          y: 0
        };
      }
    }
    return this._minPosition;
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
        startValue: -position,
        startVelocity: -velocity,
        startTime: now,
        minMomentumValue: -maxPosition,
        maxMomentumValue: -minPosition,
        flickStartPosition: -flickStartPosition,
        flickTime: now - flickStartTime,
        position: -position,
        maxPosition: -maxPosition,
        wrapperSize: this.props.bounce ? containerSize : 0,
        bounce: this.props.bounce,
      });
      return momentumEasing;
    }
  }

  _getBounceEasing() {
    if (!this._bounceEasing) {
      let duration = this.props.bounceTime;
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
    if (this.props.preventDefault) {
      evt.preventDefault();
    }

    let deltaX = evt.deltaX;
    let deltaY = evt.deltaY;

    // 是否需要lock住
    if (this.props.lock) {
      var absDeltaX = Math.abs(deltaX);
      var absDeltaY = Math.abs(deltaY);
      if ((this.props.direction === 'h' && absDeltaX > absDeltaY)
          || (this.props.direction === 'v' && absDeltaY > absDeltaX)) {
        evt.preventDefault();
        evt.stopPropagation();
      } else {
        // deltaX 和 deltaY一样时，无法判断方向，直接返回, 等待后续事件
        return;
      }
    }

    this._movePosition.x = 0;
    this._movePosition.y = 0;
    this._onAxisWheel('x', deltaX, this._movePosition);
    this._onAxisWheel('y', deltaY, this._movePosition);

    this._position.x = this._movePosition.x;
    this._position.y = this._movePosition.y;

    this._translate.translate(-this._position.x, -this._position.y);

    // 有新的wheel事件清除timer
    if (this._wheelTimer) {
      clearTimeout(this._wheelTimer);
      this._wheelTimer = null;
    }

    if (!this._triggerWheelStart) {
      this._doWheelStart();
    } else {
      this.trigger('scroll', this, this._position);
    }

    // 400ms后认为scrollEnd
    this._wheelTimer = setTimeout(() => {
      this._doWheelEnd();
    }, 400);
  }

  _doWheelStart() {
    this.trigger('scrollStart', this, this._position);
    this._triggerWheelStart = true;
    this._stopAnimation();
  }

  _doWheelEnd() {
    this.trigger('scrollEnd', this, this._position);
    this._triggerWheelStart = false;
    this._wheelTimer = null;
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
      if (animate) {
        this._translate.translateAnimation({
          easingX: boundaryArgsX && boundaryArgsX.easing,
          easingY: boundaryArgsY && boundaryArgsY.easing,
          cssTransition: this.props.useCssTransition,
        });
      } else {
        let x = (boundaryArgsX && -boundaryArgsX.bounceValue) || 0;
        let y = (boundaryArgsY && -boundaryArgsY.bounceValue) || 0;
        this._translate.translate(x, y);
        this._position.x = -x;
        this._position.y = -y;
        this.trigger('scroll', this, this._position);
      }
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
      bounceEasing.reset();
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
    this._minPosition = null;
    this._maxPosition = null;
    this.getMaxPosition();
    this.getMinPosition();
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

  _onEasing(position) {
    this._position.x = -position.x;
    this._position.y = -position.y;
    this.trigger('scroll', this, this._position);
  }

  _onEasingEnd(position) {
    this._position.x = -position.x;
    this._position.y = -position.y;
    this._backToBoundary(this.props.useCssTransition ? true : false);
    this.trigger('scrollEnd', this);
  }

  componentDidMount() {
    this._wrapperEl = ReactDOM.findDOMNode(this);
    this._contentEl = this._wrapperEl.children[0];
    this._translate = new Translate(this._contentEl);
    this._translate.on('easing', this._onEasing.bind(this));
    this._translate.on('easingEnd', this._onEasingEnd.bind(this));
    this._refreshPosition();
    this._refreshAxisEnabled();

    // 性能考虑，先给元素添加transform属性，把渲染层先拆分出来，这样第一次滚动效果更好
    // 另外，如果暴露position属性给调用组件使用，这里可以作为position的初始化
    // eg: this.scrollTo(this.props.position.x, this.props.position.y);
    this.scrollTo(0, 0);
  }

  componentDidUpdate() {
    this._refreshPosition();
    this._refreshAxisEnabled();
  }

  _stopAnimation() {
    this._translate.stopAnimation();
    if (this.props.useCssTransition) {
      this._stopAnimationIndicators();
    }
  }

  _doResize() {
    this._stopAnimation();
    this._refreshPosition();
    this._backToBoundary();
    this._indicatorsResize();
  }

  _indicatorsResize() {
    this._indicatorAxisResize('x');
    this._indicatorAxisResize('y');
  }

  _indicatorAxisResize(axis) {
    if (this.refs[axis]) {
      this.refs[axis].resize();
    }
  }

  _renderIndicators() {
    let direction = this.props.direction;
    let showIndicator = this.props.showIndicator;
    if (showIndicator) {
      if (DIRECTION.V === direction || DIRECTION.V.toLowerCase() === direction) {
        return <Indicator direction={DIRECTION.V} scroller={this}
          indicatorStyle={this.props.indicatorStyle}
          ref='y' />
      } else if (DIRECTION.H === direction || DIRECTION.H.toLowerCase() === direction) {
        return <Indicator direction={DIRECTION.H} scroller={this}
          indicatorStyle={this.props.indicatorStyle}
          ref='x' />
      } else if (DIRECTION.B === direction || DIRECTION.B.toLowerCase() === direction) {
        return (
          <div>
            <Indicator direction={DIRECTION.V} scroller={this}
              indicatorStyle={this.props.indicatorStyle}
              style={this.props.indicatorStyle}
              ref='y' />
            <Indicator direction={DIRECTION.H} scroller={this}
              indicatorStyle={this.props.indicatorStyle}
              ref='x' />
          </div>
        );
      }
    } else {
      return null;
    }
  }

  render() {
    let style = objectAssign({}, styles.container, this.props.style);

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
