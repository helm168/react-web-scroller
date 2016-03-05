import koa from 'koa';
import send from 'koa-send';

let app = koa();

app.use(function *() {
    yield send(this, this.path);
});

app.listen(9527);
