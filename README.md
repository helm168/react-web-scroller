# react-web-scroller
An react version of scroller inspired by iscroller.

### Prerequirement ###

* `install [nodeJs && npm]`(https://nodejs.org/)

### Install package ###

* `[sudo] npm install -g gulp`
* `npm install`

### Props
#### showIndicator
Type: `boolean` 
Default: `true`

indicate whether show or hide the scroller bar

#### direction
Type: `enums (v/h/b)` 
Default: `'v'`

config the scroll direction. v->short for vertical, h->short for horizontal, b-short for both

#### lock
Type: `boolean`
Default: `false`

when you has two scroller in same page and one scroller contains in other scroller, then you scroll, the two scrollers may be both move. Set `lock` to true can suppress this.

### Demos ###

* `gulp test`
* `npm run`

then open your browser and type `localhost:9527`

### Example
```npm i react-web-scroller -S```
```
import React  from 'react';
import Scroller from 'react-web-scroller';
  
class Page extends React.Component {
  _renderContent() {
    let count, i;
    count = 100;
    let lis = [];
    for(i = 0; i < count; i++ ) {
      lis.push((<li key={`item${i}`} style={styles.item}>item:{i}</li>));
    }
    reuturn (<ul style={styles.list}>{lis}</ul>);
  }
  
  render() {
    let content = this._renderContent();
    return(
      <Scroller style={styles.scroller}
        showIndicator={false} >
        {content}
      </Scroller>
    );
  }
}

let styles = {
  scroller: {
    position: 'absolute',
    top: 0,
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
  
export default Page;
```
