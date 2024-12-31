import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Staff } from "../models/staff.models.js";
import { StudentEnrollment } from "../models/studentEnrollment.models.js";
import { Test } from "../models/test.models.js";
import { Grade } from "../models/grade.models.js";
import { Attendence } from "../models/attendence.models.js";
import { TimeTable } from "../models/timetable.models.js";
import mongoose from "mongoose";
import { Marks } from "../models/mark.models.js";
import { AcademicSession } from "../models/academicSession.models.js";

const loginController = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!(email || password))
    return res
      .status(400)
      .json(new ApiError(400, "Email or Password is Required!"));

  const user = await Staff.findOne({ email: email });
 
  if (!user) return res.status(400).json(new ApiError(400, "User Not Found!"));
  const IsCorrect = await user.isPasswordCorrect(password);

  if (!IsCorrect)
    return res.status(401).json(new ApiError(401, "Enter Correct Password!"));

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  const role = user.role;
  user.refreshToken = refreshToken;
  try {
    await user.save();
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, "Internal Sever Error!", error));
  }

  res.cookie("refresh_Token", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
  res.cookie("access_Token", accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge : 24 * 60 * 60 * 1000
  });

  return res.status(200).json(
    new ApiResponse(200, "Successfully Login!", {
      role: [role],
      token: accessToken,
    })
  );
});

const userDelete = asyncHandler(async (req, res) => {
  const { id } = req.body;
  

  if (!req.role.includes("Admin"))
    return res.status(420).json(new ApiError(410, "Authentication Failed!"));

  if (req.body.delete === "student") {
    if (!id) return res.status(403).json(new ApiError(403, "ID is Missing!"));

    try {
      await StudentEnrollment.deleteStudent(id);
     
      
      return res
        .status(200)
        .json(new ApiResponse(200, "Successfully Deleted!"));
    } catch (error) {
      return res
        .status(500)
        .json(new ApiError(500, "Something Went wrong!", error));
    }
  } else {
    try {
      id.forEach(async(element) => {
        const staff = await Staff.findById(element);
        await staff.softDelete();
      });
      return res
        .status(200)
        .json(new ApiResponse(200, "Successfully Deleted!"));
    } catch (error) {
      return res
        .status(500)
        .json(new ApiError(500, "Something Went wrong!", error));
    }
  }
});

const userAdd = asyncHandler(async (req, res) => {
  const role = req.role;

  if (!role.includes("Admin"))
    return res.status(403).json(new ApiError(403, "Authentication Failed!"));

  if (req.body.add === "student") {
    const { name, fatherName, phoneNumber, classId } = req.body;

    if (!name || !fatherName || !classId)
      return res.status(400).json(new ApiError(400, "Detail is Missing!"));

    try {
      await StudentEnrollment.create({
        name,
        fatherName,
        ...(phoneNumber && { phoneNumber }),
        class: new mongoose.Types.ObjectId(classId)
      });
      return res.status(200).json(new ApiResponse(200, "Successfully Added!"));
    } catch (error) {
      return res
        .status(500)
        .json(new ApiError(500, "Something Went wrong!", error));
    }
  } else if (req.body.add === "teacher") {
    try {
      const { name, role, email, password } = req.body;
      if (!name || !role || !email || !password)
        return res.status(410).json(new ApiError(400, "Detail is Missing!"));

      await Staff.create({ name, role, email, password });
      
      return res.status(200).json(new ApiResponse(200, "Successfully Added!"));
    } catch (error) {      
      return res
        .status(500)
        .json(new ApiError(500, "Something Went wrong!", error));
    }
  } else {
    return res.status(400).json(new ApiError(400, "Client Error!"));
  }
});

const changePassword = asyncHandler(async (req, res) => {
  if (!req.role.includes("Admin"))
    return res.status(403).json(new ApiError(403, "Authentication Failed!"));

  const { id, password } = req.body;

  if (!id || !password)
    return res.status(400).json(new ApiError(400, "Detail is Missing"));
  await Staff.findByIdAndUpdate(id, { password: password });

  return res.status(200).json(new ApiResponse(200, "Successfully Changed!"));
});

const createTest = asyncHandler(async (req, res) => {
  if (!req.role.includes("Admin"))
    return res.status(403).json(new ApiError(403, "Authentication Failed!"));

  const { label, total_marks, teacherId, classId } = req.body;

  if (!label || !total_marks || !teacherId || !classId)
    return res.status(400).json(new ApiError(400, "Detail is Missing!"));

  try {
    await Test.create({
      label,
      total_marks,
      teacherId,
      classId,
    });
    return res.status(200).json(new ApiResponse(200, "Successfully Added!"));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, "Something Went wrong!", error));
  }
});

const substitute = asyncHandler(async (req, res) => {
  if (!req.role.includes("Admin"))
    return res.status(403).json(new ApiError(403, "Authentication Failed!"));

  const { presentId, absentId } = req.body;
  if (!presentId || !absentId)
    return res.status(400).json(new ApiError(400, "Detail is Missing!"));

  try {
    await Grade.findOneAndUpdate(
      { incharge: absentId },
      { substitute: presentId }
    );
    return res
      .status(200)
      .json(new ApiResponse(200, "Successfully Substitute!"));
  } catch (error) {  
    return res
      .status(500)
      .json(new ApiError(500, "Something Went wrong!", error));
  }
});

const classAdd = asyncHandler(async (req, res) => {
  const role = req.role

  if (!role.includes("Admin"))
    return res.status(403).json(new ApiError(403, "Authentication Failed!"));

  const { label, inchargeId, level } = req.body;

  if (!label || !level || !inchargeId)
    return res.status(400).json(new ApiError(400, "Detail is Missing!"));
  let gradeData = {
    label, 
    incharge : inchargeId, 
    level
  }
  

  try {
    const existingGrade = await Grade.findOne({ incharge: gradeData.incharge });
    if (existingGrade) {
        return res.status(400).json(
            new ApiError(400, "Teacher is already incharge of another class")
        );
    }
    gradeData.level = Number(gradeData.level);
    
    await Grade.create(gradeData);
    
    return res.status(200).json(
        new ApiResponse(200, "Successfully Added!")
    );
  } 
  catch (error) {
    
  return res
  .status(500)
  .json(new ApiError(500, "Something Went wrong!", error));
}
});

const newSession = asyncHandler(async (req, res) => {
  if (!req.role.includes("Admin"))
    return res.status(403).json(new ApiError(403, "Authentication Failed!"));

  const { label, year, password } = req.body;
  if (!label || !year || !password)
    return res.status(400).json(new ApiError(400, "Password, Year and Label is requierd!"));

  try {
    const id = req.id
    const user = await Staff.findById(id);
    const IsCorrect = await user.isPasswordCorrect(password);
    
    if (!IsCorrect)
      return res.status(401).json(new ApiError(401, "Enter Correct Password!"));

  } catch (error) {
    return res
      .status(403)
      .json(new ApiError(403, "Password Confirmation Unsuccessful!", error));
  }
  try {
    await AcademicSession.updateMany({status:"Current"},{$set : {status:"Previous"}})
    const session = await AcademicSession.create({label,year,status:"Current"})
    const sessionId = session._id
    if(!session._id){
      return res.status(500).json(
        new ApiError(500,"Session Creation unsuccessful"))
    }
    await Grade.aggregate([
      {
        $match: { level: 10 }
      },
      {
        $lookup: {
          from: "studentenrollments",
          localField: "_id",
          foreignField: "class",
          as: "Student"
        }
      },
      {
        $unwind: "$Student"
      },
      // Replace the root with the student sub-document
      {
        $replaceRoot: {
          newRoot: "$Student"
        }
      },
      // Update fields on the student enrollment doc
      {
        $addFields: {
          class: {
            $concatArrays: [
              ["Graduated"],
              "$class"
            ]
          },
          endSession: sessionId
        }
      },
      // Merge back into the studentenrollments collection
      {
        $merge: {
          into: "studentenrollments",
          on: "_id",
          whenMatched: "merge",
          whenNotMatched: "discard"
        }
      }
    ])

    return res.status(200).json(new ApiResponse(200, "Successfully Started!"));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, "Something Went wrong!", error));
  }
});

const markAttendence = asyncHandler(async (req, res) => {
  const date = new Date().toISOString().split('T')[0]
  let data = {}
  if (req.role.includes("Admin")) {
    const { teacher, attendence} = req.body;
    if (!teacher || teacher.length === 0) {
      return res.status(400).json(new ApiError(400, "Data is Missing!"));
    }

    // Update Attendence
    if (attendence && attendence.length !== 0) { 
      const newAttendence = teacher
        .filter((person) => {
          return (
            person.status === "Present" &&
            attendence.some((att) => att.attendeId === person.attendeId)
          );
        })
        .map((person) => person.attendeId);

      if (newAttendence.length !== 0) {
        try {
          await Attendence.deleteMany({
            attendeId: { $in: newAttendence },
            date: date,
          });
          data = { ...data, deleted: newAttendence };
        } catch (error) {
          console.error(error);
          return res
            .status(500)
            .json(new ApiError(500, "Updating Attendence Failed", error));
        }
      }
    }
    // Mark Attendence
    try {
      let newTeacher = teacher
        .filter(
          (person) =>
            person.status === "Absent" && !attendence.some(att => att.attendeId === person.attendeId)
        )
        .map((person) => {
          return {
            attendeId: person.attendeId,
            date: date,
            reference: "Staff",
            type: "Teacher",
            status: "Absent",
          };
        });
      await Attendence.insertMany(newTeacher);
      // data = {
      //   ...data,
      //   added: newTeacher.map((person) => {
      //     return { attendeId: person.attendeId };
      //   }),
      // };
      return res
        .status(200)
        .json(new ApiResponse(200, "Attendence Marked Successfully!"));
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json(new ApiError(500, "Marking Attendence Failed", error));
    }
  }
  else if (req.role.includes("Teacher")) {

    const { student, attendence } = req.body;

    if (!student || student.length === 0) {
      return res.status(400).json(new ApiError(400, "Data is Missing!"));
    }
    
    if (attendence && attendence.length !== 0) {
      const newAttendence = student
        .filter((person) => {
          return (
            person.status === "Present" &&
            attendence.some((att) => att.attendeId === person.attendeId)
          );
        })
        .map((person) => person.attendeId);

      if (newAttendence.length !== 0) {
        try {
          await Attendence.deleteMany({
            attendeId: { $in: newAttendence },
            date: date,
          });
          data = { ...data, deleted: newAttendence };
        } catch (error) {
          console.error(error);
          return res
            .status(500)
            .json(new ApiError(500, "Updating Attendence Failed", error));
        }
      }
    }
    try {
      let newStudent = student
        .filter(
          (person) =>
            person.status === "Absent" && !attendence.some(att => att.attendeId === person.attendeId)
        )
        .map((person) => {
          return {
            attendeId: person.attendeId,
            date: date,
            reference: "StudentEnrollment",
            type: "Student",
            status: "Absent",
          };
        });
      await Attendence.insertMany(newStudent);
      data = {
        ...data,
        added: newStudent.map((person) => {
          return { attendeId: person.attendeId };
        }),
      };
      return res
        .status(200)
        .json(new ApiResponse(200, "Attendence Marked Successfully!", data));
    } catch (error) {
      return res
        .status(500)
        .json(new ApiError(500, "Something Went wrong!", error));
    }
  } 
  else {
    return res.status(403).json(new ApiError(403, "Authentication Failed!"));
  }
});

const timeTable = asyncHandler(async (req, res) => {
  if (!req.role.includes("Admin"))
    return res.status(403).json(new ApiError(403, "Authentication Failed!"));

  const { teacherId, day, classId } = req.body;
  if (!teacherId || !day || classId)
    return res.status(400).json(new ApiError(400, "Detail is Missing!", error));

  try {
    await TimeTable.create(teacherId, day, classId);
    return res.status(200).json(new ApiResponse(200, "Successfully Changed!"));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, "Something Went wrong!", error));
  }
});

const transferStudents = asyncHandler(async (req,res) => {
try {
    const {toClassId, studentsId } = req.body;

    if (!toClassId || !studentsId) {
      throw new Error("Missing required fields.");
    }
    
    const toClass = await Grade.findOne({ _id: toClassId, status: "Active" });

    if (!toClass) {
      throw new Error("Destination class does not exist or is not active.");
    }
    
    await StudentEnrollment.updateMany(
      { _id : {$in : studentsId} },
      { $set: { class: toClassId } }
    );
    return res
      .status(200)
      .json(new ApiError(200, "Student Transferred Successfully!"));
} catch (error) {
  return res
      .status(500)
      .json(new ApiError(500, "Something Went wrong!", error));
}
});

const markTest = asyncHandler(async(req,res)=>{
  const role = req.role
  if(role.includes("Teacher")){
  const {data} = req.body


    if(data.length === 0){
      return res.status(400).json(
        new ApiError(400,"Data is missing!"))
    }
    try {
        await Marks.insertMany(data)
        await Test.findByIdAndUpdate(data[0].testId, { status: "Marked" });
        return res.status(200).json(
          new ApiResponse(200,"Successfully Marked!")
  )
    } catch (error) {
      return res.status(500).json(
        new ApiError(500,"Something Went wrong!",error))
    }
  }
  else{
    return res.status(403).json(
      new ApiError(403,"You are not Allowed to mark test!")
)
  }
})

const changeIncharge = asyncHandler(async(req,res)=>{
  const role = req.role
  if(!role.includes("Admin")){
    return res.status(403).json(
      new ApiError(403,"You are not Authenticated!"))
  }
  const {incharge,tograde} = req.body

  if(!incharge || !tograde){
    return res.status(401).json(
      new ApiError(401,"Data is Missing!"))
  }

  try {

    await Grade.findOneAndUpdate({_id: tograde},{incharge: incharge})
    return res.status(200).json(
      new ApiError(200,"Incharge Changed Successfully!"))

  } catch (error) {
    return res.status(500).json(
      new ApiError(500,"Tranfer of Incharge Unsuccessful!", error))
  }

})

const deleteClass = asyncHandler(async(req,res)=>{ 
  const role = req.role
  if(!role.includes("Admin")){
    return res.status(403).json(
      new ApiError(403,"You are not Authenticated!"))
  }

  try {
      const {gradeid} = req.body

      if (!gradeid) {
        return res.status(400).json(
          new ApiError(400, "Grade ID is required!")
        );
      }

      const students = await StudentEnrollment.find({
        class: gradeid
      });
      
      if(students.length !== 0){
        return res.status(400).json(
          new ApiError(400,"Remove or Transfer student before removing class!"))
      }

      await Grade.findByIdAndUpdate(gradeid,{status: "Inactive",incharge: null});
      return res.status(200).json(
        new ApiResponse(200,"Class deactivated successfully!"))

  } catch (error) {
    return res.status(500).json(
      new ApiError(500,"Class deactivated unsuccessfully", error))
  }
})

const reactivateClass = asyncHandler(async(req,res)=>{
  if(!req.role.includes("Admin")){
    return res.status(403).json(
      new ApiError(403,"You are not Authenticated!"))
  }
  const {gradeid,inchargeId} = req.body

  const inchargeValue = Array.isArray(inchargeId) ? 
  inchargeId[0]?.id : 
  typeof inchargeId === 'object' ? 
  inchargeId.id : 
  inchargeId;

  const gradeIdValue = Array.isArray(gradeid) ? 
  gradeid[0]?.id : 
  typeof gradeid === 'object' ? 
  gradeid.id : 
  gradeid;
  
  if (!gradeIdValue || !inchargeValue) {
    return res.status(400).json(
      new ApiError(400, "Grade ID and Incharge ID is required!")
    );
  }
  try {
    await Grade.findByIdAndUpdate(gradeIdValue,{status: "Active",incharge: inchargeValue});
    return res.status(200).json(
      new ApiResponse(200,"Class deactivated successfully!"))
  } catch (error) {
    return res.status(500).json(
      new ApiError(500,"Class deactivated unsuccessfully", error))
  }
})

const deleteTest = asyncHandler(async(req,res)=>{
  if(!req.role.includes("Admin")){
    return res.status(403).json(
      new ApiError(403,"You are not Authenticated!"))
  }
  const {test_Ids}= req.body

  if(!test_Ids || test_Ids.length === 0){
    return res.status(400).json(
      new ApiError(400, "Test ID is required!")
    );
  }
  try {
    await Test.deleteMany({_id : {$in : test_Ids}})
    return res.status(200).json(
      new ApiResponse(200,"Class deactivated successfully!"))
  } catch (error) {
    return res.status(500).json(
      new ApiError(500,"Class deactivated unsuccessfully", error))
  }
})
export {
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
};