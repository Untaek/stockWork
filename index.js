import Express from 'express';
import bodyParser from 'body-parser';

import finRouter from "./router/fin";

const app = Express();
const port = 3001;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use('/api', finRouter);


app.listen(port, ()=> {
  console.log('express start', port);
})