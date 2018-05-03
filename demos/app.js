import koa from 'koa';
import send from 'koa-send';

const app = koa();

app.use(function* () {
  const { path } = this;
  if (path === '/') {
    this.response.redirect('/demos/index.html');
  } else {
    yield send(this, path);
  }
});

app.listen(9527);
