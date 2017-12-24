import ex from "express";

import stocker from "../util/financial";

const route = ex.Router()

route.get('/', (req, res) => {
  res.json(stocker.getStocks());
})

export default route;