import { Router } from "express";
import {auth} from "../middlewares/auth.middleware.js"
import {verifyHeader} from "../middlewares/verifyHeader.middleware.js"
import {getTodayAttendence, getClass, getStudent, getTeacher, getStats, getTests, getMarks} from "../controllers/dataResponse.contollers.js"

const router = Router()
router.use(auth)

router.route("/getClass").get(getClass)
router.route("/getTeacher").get(getTeacher)
router.route("/getStudents").post(verifyHeader,getStudent)
router.route("/getTodayAttendence").post(verifyHeader,getTodayAttendence)
router.route("/getStats").get(getStats)
router.route("/getTests").get(getTests)
router.route("/getMarks").post(verifyHeader,getMarks)
export default router