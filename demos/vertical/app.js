import React from 'react';
import ReactDOM from 'react-dom';
import Scroller from '../../components/scroller.jsx';

class App extends React.Component {
    render() {
        var count, i;
        count = 100;
        var lis = [];
        for(i = 0; i < 220; i++ ) {
            lis.push((<li key={`item${i}`} style={styles.item}>item:{i}</li>));
        }
        var ul = (<ul style={styles.list}>{lis}</ul>);
        return (
            <div>
                <div style={styles.header}>Scroller</div>
                <Scroller style={styles.content} >{ul}</Scroller>
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
        bottom: 0,
        left: 0,
        width: '100%',
        backgroundColor: '#ccc',
    },
    list: {
        marginTop: 0,
        listStyle: 'none',
        paddingLeft: 0,
    },
    item: {
        padding: '0 10px',
        height: '40px',
        lineHeight: '40px',
        borderTop: '1px solid #ccc',
        backgroundColor: '#fafafa',
        fontSize: '14px',
    },
};

ReactDOM.render(<App />, document.getElementById('app'));
