import { Router, type IRouter } from "express";
import healthRouter from "./health";
import orderItemsRouter from "./order-items";
import logisticsRouter from "./logistics";
import authRouter from "./auth";
import fleetRouter from "./fleet";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(orderItemsRouter);
router.use(logisticsRouter);
router.use(fleetRouter);

export default router;
