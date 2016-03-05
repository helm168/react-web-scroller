import React from 'react';
import ReactDOM from 'react-dom';
import Scroller from '../../components/scroller.jsx';

class App extends React.Component {
    render() {
        var count, i;
        count = 100;
        var lis = [];
        var imgs = [
            'http://p0.meituan.net/movie/abf4df3f88e08ee4b8c9eaf833af5920100352.jpg',
            'http://p0.meituan.net/movie/be638175dc8e4ffe60937fdfd9eccb5392160.jpg',
            'http://p1.meituan.net/movie/64f427613e139dca8c8414561e389c3c149504.jpg',
            'http://p1.meituan.net/movie/4e65bab938bb39c25830b6439cdb56e686016.jpg',
            'http://p0.meituan.net/movie/aa327fccd2e48e3f7ecced1e2ee83f99145408.jpg',
            'http://p1.meituan.net/movie/dff301d9003e674c337934aea6a0f05d79872.jpg',
            'http://p0.meituan.net/movie/c68fc7339a07503953237bc534b0ddb4153600.jpg',
        ];
        for(i = 0; i < imgs.length; i++ ) {
            lis.push((
                <li key={`item${i}`} style={styles.item}>
                    <img src={`${imgs[i]}`} style={styles.img} />
                </li>
            ));
        }
        var ul = (<ul style={styles.list}>{lis}</ul>);
        return (
            <div>
                <div style={styles.header}>Scroller</div>
                <Scroller style={styles.content}
                    indicatorStyle={{background: 'white'}}
                    direction='h'>
                    {ul}
                </Scroller>
            </div>
        );
    }
}

let styles = {
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '45px',
        lineHeight: '45px',
        textAlign: 'center',
        backgroundColor: '#CD235C',
        color: '#eee',
        fontSize: '20px',
        fontWeight: 'bold',
    },
    content: {
        position: 'absolute',
        top: '45px',
        left: 0,
        width: '100%',
        height: '100px',
        backgroundColor: '#ccc',
    },
    list: {
        marginTop: 0,
        listStyle: 'none',
        paddingLeft: 0,
        height: '100%',
        display: 'inline-block',
        width: 840,
    },
    item: {
        display: 'inline-block',
        padding: '0 10px',
        height: '100%',
        width: '100px',
    },
    img: {
        width: '100%',
        height: '100%',
    },
};

ReactDOM.render(<App />, document.getElementById('app'));
