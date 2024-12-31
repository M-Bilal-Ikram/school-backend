import mongoose from "mongoose"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asynchandler.js"
import {Grade} from "../models/grade.models.js"
import {Staff} from "../models/staff.models.js"
import {StudentEnrollment} from "../models/studentEnrollment.models.js"
import { Attendence } from "../models/attendence.models.js"
import { Test } from "../models/test.models.js"
import { AcademicSession } from "../models/academicSession.models.js"
import { Marks } from "../models/mark.models.js"

const getClass = asyncHandler( async(req,res)=>{
    try {
        let grades
        const {type} = req.query
        const role = req.role 
        if (role.includes("Teacher") &&( type !== "test" || !type)) {
            const id = req.id
            grades = await Grade.find({$or: [
                { incharge: id },
                { substitute: id }
            ]},"-substitute")
        }
        else if(role.includes("Admin")){
            grades = await Grade.find({},"-substitute")
        }
        else{
            grades = await Grade.find({status:"Active"},"-substitute")
        }
        return res.status(200).json(
            new ApiResponse(200,"Successfully Retrived!",grades)
    )
    } catch (error) {
        return res.status(500).json(
            new ApiError(500,"Something Went wrong!",error)
    )
    }
});

const getTeacher = asyncHandler(async(req,res)=>{
    try {
        const teacher = await Staff.find({isActive : "true" , role : "Teacher"},"-isActive -refreshToken -password -dateDeleted");
        return res.status(200).json(
            new ApiResponse(200,"Successfully Retrived!",teacher)
    )
    } catch (error) {
        return res.status(500).json(
            new ApiError(500,"Something Went wrong!",error)
    )
    }
})

const getStudent = asyncHandler(async(req,res)=>{
    const {classes = ""} = req.body
    const role = req.role
    const id = req.id
    try {
        let studentData
        if(classes === "" && (role.includes("Admin") || role.includes("Principal")))
            studentData = await StudentEnrollment.find({endSession : {$exists : false}},"-startSession");
        else if(classes === "" && role.includes("Teacher")){
            let grade_id = await Grade.find({incharge : id})
            if (!grade_id || (Array.isArray(grade_id) && grade_id.length === 0)) {
                return res.status(403).json(
                  new ApiResponse(403, "You are not the incharge of any Class.")
                );
            }
            studentData = await StudentEnrollment.find({endSession : {$exists : false}, class : {$eq : grade_id[0]._id}},"-startSession");
        }
        else{
            studentData = await StudentEnrollment.find({
                endSession: { $exists: false },
                class: { $elemMatch: { $eq: new mongoose.Types.ObjectId(classes) } }
              }, "-startSession");        
            }
        
        return res.status(200).json(
            new ApiResponse(200,"Successfully Retrived!",studentData)
    )
    } catch (error) {
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

    
    const {date = new Date().toISOString().split('T')[0], type} = req.body
    
    try {
        let AttendData
        if (type === "Teacher"){
            if (!req.role.includes('Teacher'))
            AttendData = await Attendence.find({date : date, type : type},"-status -type -reference -date -_id")
            else
            {
                const {month, year} = req.body
                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 0);
                const id = req.id
                AttendData = await Attendence.find({
                    date: {
                        $gte: startDate,
                        $lte: endDate
                    }, 
                    type: type,
                    attendeId : id
        },"-status -attendeId -reference -_id -__v -type").sort({ date: 1 });
            }
        }
        else if (type === "Student"){
            const id = req.id;
            const {classes = ""} = req.body;
            let grade = classes === "" ? await Grade.find({incharge : id}) : classes;
            if(grade.length !== 0){
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
                            $expr: {
                                $eq: [
                                    { $arrayElemAt: ["$student.class", 0] },
                                    new mongoose.Types.ObjectId(grade)
                                ]
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
            }
        console.log(AttendData)
        return res.status(200).json(
            new ApiResponse(200,"Successfully Retrived!",AttendData)
    )
    } catch (error) {
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
            $match : {
                status : "Active"
            }
        },
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
    return res.status(200).json(
        new ApiResponse(200,"Successfully Analyzed!",stats)
    )
    } catch (error) {
        return res.status(500).json(
            new ApiError(500,"Something Went wrong!",error)
    )
      
    }
})

const getTests = asyncHandler(async(req,res)=>{
    const role = req.role
    if (!["Admin","Teacher","Principal"].some(el => req.role.includes(el)))
        return res.status(401).json(
            new ApiError(401,"Not Authenticated")
        )
    try {
        const CurrentSession = await AcademicSession.find({status : "Current"},"-status -label -year")
        let test;
        
        if(["Admin","Principal"].some(el => req.role.includes(el))){
            test = await Test.find({sessionId : CurrentSession}," -sessionId")
        }
        else if(role.includes("Teacher")){
            const id = req.id
            test = await Test.find({$and : [{sessionId : CurrentSession},{teacherId : id}]},"")
            test = await Test.find({$and : [{sessionId : CurrentSession},{teacherId : id}]},"-sessionId")
        }
        return res.status(200).json(
            new ApiResponse(200,"Successfully Tests Sent!",test)
        )
    } catch (error) {
        return res.status(500).json(
            new ApiError(500,"Something went wrong!",error)
        )
    }
})

const getMarks = asyncHandler(async(req,res) => {
    const role = req.role;
    if(role.includes("Teacher") || role.includes("Principal")){
        const testId = req.body
        
        try {
            const marks = await Marks.find({testId : {$in : testId.testId}})
            return res.status(200).json(
                new ApiResponse(200,"Successfully Marks Sent!",marks)
            )
        } catch (error) {
            return res.status(500).json(
                new ApiError(500,"Something went wrong!",error)
            )
        }
    }
    else{
        return res.status(401).json(
            new ApiError(401,"Not Allowed!")
        )
    }
})
export {
    getClass,
    getTeacher,
    getTodayAttendence,
    getStudent,
    getStats,
    getTests,
    getMarks
}