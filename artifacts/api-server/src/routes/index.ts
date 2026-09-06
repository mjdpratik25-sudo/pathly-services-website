import { Router, type IRouter } from "express";
import healthRouter from "./health";
import orderItemsRouter from "./order-items";
import logisticsRouter from "./logistics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(orderItemsRouter);
router.use(logisticsRouter);

export default router;
