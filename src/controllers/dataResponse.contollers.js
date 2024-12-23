import mongoose from "mongoose"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asynchandler.js"
import {Grade} from "../models/grade.models.js"
import {Staff} from "../models/staff.models.js"
import {StudentEnrollment} from "../models/studentEnrollment.models.js"
import { Attendence } from "../models/attendence.models.js"

const getClass = asyncHandler( async(req,res)=>{
    try {
        let grades
        if (req.role.includes("Teacher")) {
            const id = req.id
            grades = await Grade.find({$or: [
                { incharge: id },
                { substitute: id }
            ]},"-substitute")
        }
        else{
            grades = await Grade.find({status:"Active"},"-substitute")
        }
        return res.status(200).json(
            new ApiResponse(200,"Successfully Retrived!",grades)
    )
    } catch (error) {
        console.log(error)
        return res.status(500).json(
            new ApiError(500,"Something Went wrong!",error)
    )
    }
});

const getTeacher = asyncHandler(async(req,res)=>{
    try {
        const teacher = await Staff.find({isActive : "true" , role : "Teacher"},"-isActive -refreshToken -password -dataDeleted");
        return res.status(200).json(
            new ApiResponse(200,"Successfully Retrived!",teacher)
    )
    } catch (error) {
        return res.status(500).json(
            new ApiError(500,"Something Went wrong!",error)
    )
    }
})
//^ In Progress
const getStudent = asyncHandler(async(req,res)=>{
    const {classes = ""} = req.body
    console.log("Classes:",classes)
    const role = req.role
    const id = req.id
    try {
        let studentData
        if(classes === "" && (role.includes("Admin") || role.includes("Principal")))
            studentData = await StudentEnrollment.find({endSession : {$exists : false}},"-startSession");
        else if(classes === "" && role.includes("Teacher")){
            let grade_id = await Grade.find({incharge : id})
            studentData = await StudentEnrollment.find({endSession : {$exists : false}, class : {$eq : grade_id[0]._id}},"-startSession");
        }
        else{
            studentData = await StudentEnrollment.find({endSession : {$exists : false}, class : {$eq : classes}},"-startSession");
        }
        console.log("Student Data:",studentData);
        
        return res.status(200).json(
            new ApiResponse(200,"Successfully Retrived!",studentData)
    )
    } catch (error) {
        console.log(error)
        return res.status(500).json(
            new ApiError(500,"Something Went wrong!",error)
    )
    }
})

const getTodayAttendence = asyncHandler( async(req,res)=>{
    if (!["Admin","Teacher","Principal"].some(el => req.role.includes(el))) {
        return res.status(401).json(
            new ApiError(401,"Authentication Failed!")
    )
    }

    
    const {date = new Date().toISOString().split('T')[0], type , grade = ""} = req.body
    try {
        let AttendData
        if (type === "Teacher"){
            AttendData = await Attendence.find({date : date, type : type},"-status -type -reference -date -_id")
        }
        else if (type === "Student"){
            const id = req.id;
            const {classes = ""} = req.body;
            let grade = classes === "" ? await Grade.find({incharge : id}) : classes;
            grade = classes === "" ? grade[0]._id : grade;
            
            AttendData = await Attendence.aggregate([
                {
                    $match: {
                        date: new Date(date),
                        type: type,
                        reference: "StudentEnrollment"
                    }
                },
                {
                    $lookup: {
                        from: "studentenrollments",
                        localField: "attendeId",
                        foreignField: "_id",
                        as: "student"
                    }
                },
                {
                    $unwind: "$student"
                },
                {
                    $match: {
                        "student.class": { 
                            $elemMatch: { 
                                $eq: new mongoose.Types.ObjectId(grade) 
                            }
                        }
                    }
                },
                {
                    $project: {
                        attendeId: "$attendeId",
                        status: 1,
                        name: "$student.name",
                        fatherName: "$student.fatherName"
                    }
                }
            ]);
        }
        return res.status(200).json(
            new ApiResponse(200,"Successfully Retrived!",AttendData)
    )
    } catch (error) {
        console.log(error)
        return res.status(500).json(
            new ApiError(500,"Something Went wrong!",error)
    )
    }
})

const getStats = asyncHandler(async(req,res)=>{
    const role = req.role
    if (!role.includes("Principal")) {
        return res.status(401).json(
            new ApiError(401,"Authentication Failed!")
    )
    }
    const date = new Date().toISOString().split('T')[0]
    try {
      const stats = await Grade.aggregate([
        {
            $lookup: {
                from: "studentenrollments",
                localField: "_id",
                foreignField: "class",
                as: "students"
            }
        },
        {
            $lookup: {
                from: "attendences",
                let: { studentIds: "$students._id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $in: ["$attendeId", "$$studentIds"] },
                                    { $eq: ["$date", new Date(date)] }
                                ]
                            }
                        }
                    }
                ],
                as: "attendance"
            }
        },
        {
          $project: {
            label: 1,
            totalStudents: { $size: "$students" },
            absentCount: { $size: "$attendance" },
        }
        }
    ]);
    console.log(stats)
    return res.status(200).json(
        new ApiResponse(200,"Successfully Analyzed!",stats)
    )
    } catch (error) {
        console.log(error)
        return res.status(500).json(
            new ApiError(500,"Something Went wrong!",error)
    )
      
    }
})

export {
    getClass,
    getTeacher,
    getTodayAttendence,
    getStudent,
    getStats
}