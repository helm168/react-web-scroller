import koa from 'koa';
import send from 'koa-send';

let app = koa();

app.use(function *() {
    let path = this.path;
    if (path === '/') {
        this.response.redirect('/demos/index.html');
    } else {
        yield send(this, path);
    }
});

app.listen(9527);
