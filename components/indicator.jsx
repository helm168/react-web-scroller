import React      from 'react';
import ReactDOM   from 'react-dom';
import Translate from './translate';
import debounce from 'debounce';
import objectAssign from 'object-assign';

let {
    Component,
    PropTypes,
} = React;

const DIRECTION = {
    V: 'V',
    H: 'H',
    B: 'BOTH',
};

const directionToStyle = {
    'V': 'height',
    'H': 'width',
};

let barLength = 4;
let indicatorRadius = 2;
let indicatorBg = 'rgba(0, 0, 0, 0.498039)';
let styles = {
    vBar: {
        width: barLength,
        position: 'absolute',
        overflow: 'hidden',
        top: 2,
        bottom: 2,
        right: 0,
    },
    vIndicator: {
        position: 'absolute',
        width: '100%',
        borderRadius: indicatorRadius,
        background: indicatorBg,
        visibility: 'hidden',
    },
    hBar: {
        height: barLength,
        position: 'absolute',
        overflow: 'hidden',
        left: 2,
        right: 2,
        bottom: 0,

    },
    hIndicator: {
        position: 'absolute',
        height: '100%',
        borderRadius: indicatorRadius,
        background: indicatorBg,
        visibility: 'hidden',
    },
};

class Indicator extends Component {
    static propTypes = {
        direction: PropTypes.string.isRequired,
        scroller: PropTypes.object.isRequired,
    }

    static defaultProps = {
        shrinkIndicator: false,
    }

    constructor(props) {
        super(props);

        this._scroller = props.scroller;
        this._scroller.on('scrollStart', this.onScrollStart.bind(this));
        this._scroller.on('scroll', this.onScroll.bind(this));
        this._scroller.on('scrollEnd', this.onScrollEnd.bind(this));
        this.resize = debounce(this._doResize.bind(this), 100);
    }

    componentDidMount() {
        // indicator是scroller的child, 故componentDidMount在scroller之前执行
        // 而resize必须在scroller mount之后才能执行
        setTimeout(() => this.resize());
        this._translate = new Translate(this._getIndicatorEl());
    }

    componentDidUpdate() {
        this.resize();
    }

    componentWillUnmount() {
        clearLocked(this);
    }

    _doResize() {
        this._barLength = null;
        var scroller = this._scroller;
        var containerSize = scroller.getContainerSize();
        var contentSize = scroller.getContentSize();
        var direction = this.props.direction;
        var ratio, indicatorLength;
        var indicatorEl = this._getIndicatorEl();
        if (direction === DIRECTION.V) {
            ratio = this._ratio = (containerSize.y / contentSize.y).toFixed(2);
            indicatorLength = this._indicatorLength = Math.round(containerSize.y * ratio);
            indicatorEl.style.height = indicatorLength + 'px';
        } else {
            ratio = this._ratio = containerSize.x / contentSize.x;
            indicatorLength = this._indicatorLength = Math.round(containerSize.x * ratio);
            indicatorEl.style.width = indicatorLength + 'px';
        }
    }

    _getBarLengthByDirection(direction) {
        if (!this._barLength) {
            let barEl = ReactDOM.findDOMNode(this);
            if (direction === DIRECTION.V) {
                this._barLength = barEl.clientHeight;
            } else {
                this._barLength =  barEl.clientWidth;
            }
        }
        return this._barLength;
    }

    _getIndicatorEl() {
        if (!this._indicatorEl) {
            this._indicatorEl = ReactDOM.findDOMNode(this.refs.indicator);
        }
        return this._indicatorEl;
    }
    
    // scroller的位置
    scrollTo(x = 0, y = 0) {
        if (this.props.direction === DIRECTION.V) {
            this._directionScrollTo(y);
        } else {
            this._directionScrollTo(x);
        }
    }

    _directionScrollTo(to) {
        var indicatorEl = this._getIndicatorEl();
        var moveArgs = this._getMoveArgs(to);
        var cssStyle = directionToStyle[this.props.direction];
        if (!isNaN(moveArgs[cssStyle])) {
            indicatorEl.style[cssStyle] = moveArgs[cssStyle] + 'px';
        }
        if (!isNaN(moveArgs.translate)) {
            if (this.props.direction === DIRECTION.V) {
                this._translate.translate(0, moveArgs.translate);
            } else {
                this._translate.translate(moveArgs.translate, 0);
            }
        }
    }

    _getMoveArgs(to) {
        var translate = Math.round(to * this._ratio);
        var cssStyle = directionToStyle[this.props.direction];
        var barLength = this._getBarLengthByDirection(this.props.direction);
        var moveArgs = {};
        if (translate < 0) {
            if (this.props.shrinkIndicator) {
                moveArgs[cssStyle] = this._indicatorLength + translate;
            } else {
                moveArgs.translate = 0;
            }
        } else if (translate > barLength - this._indicatorLength) {
            if (this.props.shrinkIndicator) {
                moveArgs[cssStyle] = barLength - translate;
                moveArgs.translate = translate;
            } else {
                moveArgs.translate = barLength - this._indicatorLength;
            }
        } else {
            moveArgs.translate = translate;
        }
        return moveArgs;
    }

    scrollAnimation(animation) {
        let axis;
        if (this.props.direction === DIRECTION.V)  {
            axis = 'Y',
            animation.easingX = null;
        } else {
            axis = 'X',
            animation.easingY = null;
        }
        this._directionAnimationTo(axis, animation);
    }

    stopAnimation() {
        this._translate.stopAnimation();
    }

    _directionAnimationTo(axis, animation) {
        var easingKey = 'easing' + axis;
        var easing = animation[easingKey]; 
        if (easing) {
            var endValue = easing.getEndValue();
            var moveArgs = this._getMoveArgs(-endValue);
            if (!isNaN(moveArgs.translate)) {
                easing.setEndValue(moveArgs.translate);
                this._translate.translateAnimation(animation);
            }
        }
    }

    onScrollStart() {
        if (this._hiddenTimer) {
            clearTimeout(this._hiddenTimer);
        }
        let indicatorEl = this._getIndicatorEl();
        this._translate.stopAnimation();
        indicatorEl.style.visibility = 'visible';
    }

    onScroll(scroller, position) {
        var moveArgs = null;
        if (this.props.direction === DIRECTION.V) {
            moveArgs = this._getMoveArgs(position.y);
        } else {
            moveArgs = this._getMoveArgs(position.x);
        }
        var cssStyle = directionToStyle[this.props.direction];
        var indicatorEl = this._getIndicatorEl();
        if (!isNaN(moveArgs[cssStyle])) {
            indicatorEl.style[cssStyle] = moveArgs[cssStyle] + 'px';
        }
        if (!isNaN(moveArgs.translate)) {
            if (this.props.direction === DIRECTION.V) {
                this._translate.translate(0, moveArgs.translate);
            } else {
                this._translate.translate(moveArgs.translate, 0);
            }
        }
    }

    onScrollEnd() {
        this._hiddenTimer = setTimeout(() => {
            let indicatorEl = this._getIndicatorEl();
            indicatorEl.style.visibility = 'hidden';
            this._hiddenTimer = null;
        }, 400);
    }

    _renderIndicatorByDirection(direction) {
        let barStyle, indicatorStyle;
        if (direction === DIRECTION.V) {
            barStyle = styles.vBar;
            indicatorStyle = styles.vIndicator;
        } else {
            barStyle = styles.hBar;
            indicatorStyle = styles.hIndicator;
        }
        indicatorStyle = objectAssign({}, indicatorStyle, this.props.indicatorStyle);
        return (
            <div style={barStyle}>
                <div ref='indicator' style={indicatorStyle}></div>
            </div>
        );
    }

    render() {
        let {
            direction = DIRECTION.V,
        } = this.props;

        return this._renderIndicatorByDirection(direction);
    }
}

export default Indicator;
export { DIRECTION };
