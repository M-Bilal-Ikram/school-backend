import { Router } from "express";
import {
  loginController,
  userDelete,
  userAdd,
  changePassword,
  createTest,
  substitute,
  classAdd,
  newSession,
  markAttendence,
  timeTable,
  transferStudents,
  markTest,
  changeIncharge,
  deleteClass,
  reactivateClass,
  deleteTest
} from "../controllers/user.controllers.js";
import { verifyHeader } from "../middlewares/verifyHeader.middleware.js";
import {auth} from "../middlewares/auth.middleware.js"
import {clientAuth} from "../middlewares/clientAuth.middleware.js"
const router = Router()

router.route("/login").post(verifyHeader,loginController) 
router.route("/delete/user").post(auth,verifyHeader,userDelete) 
router.route("/add/user").post(auth,verifyHeader,userAdd)
router.route("/change/password").post(auth,verifyHeader,changePassword)
router.route("/create/test").post(auth,verifyHeader,createTest)
router.route("/substitute/teacher").post(auth,verifyHeader,substitute)  
router.route("/add/class").post(auth,verifyHeader,classAdd) 
router.route("/start/session").post(auth,verifyHeader,newSession) 
router.route("/mark/attendence").post(auth,verifyHeader,markAttendence) 
router.route("/create/timeTable").post(auth,verifyHeader,timeTable)
router.route("/transfer/students").post(auth,verifyHeader,transferStudents) 
router.route("/test/marks").post(auth,verifyHeader,markTest) 
router.route("/change/incharge").post(auth,verifyHeader,changeIncharge) 
router.route("/delete/class").post(auth,verifyHeader,deleteClass)
router.route("/reactivate/class").post(auth,verifyHeader,reactivateClass)
router.route("/delete/test").post(auth,verifyHeader,deleteTest)
router.route("/auth").get(clientAuth, (req, res) => {
  try {
    if (!req.role) {
      return res.status(401).json({ isAuthenticated: false, role: null });
    }
    res.status(200).json({ isAuthenticated: true, role: req.role  , token : req.token});
  } catch (error) {
    console.error("Error in /auth route:", error);
    res.status(500).json({ isAuthenticated: false, error: "Server error" });
  }
  }); //okay
export default router