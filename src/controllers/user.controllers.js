import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Staff } from "../models/staff.models.js";
import { StudentEnrollment } from "../models/studentEnrollment.models.js";
import { Test } from "../models/test.models.js";
import { Grade } from "../models/grade.models.js";
import { Attendence } from "../models/attendence.models.js";
import { TimeTable } from "../models/timetable.models.js";
import { Student } from "../models/studetnt.models.js";
import mongoose from "mongoose";

const loginController = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  console.log(email, password);
  if (!(email || password))
    return res
      .status(400)
      .json(new ApiError(400, "Email or Password is Required!"));
  console.log(email, password);
  const user = await Staff.findOne({ email: email });
  console.log(user);
  if (!user) return res.status(400).json(new ApiError(400, "User Not Found!"));
  const IsCorrect = await user.isPasswordCorrect(password);
  console.log(IsCorrect);
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
  });
  res.cookie("access_Token", accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
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
  console.log(req.role);
  console.log(id);
  

  if (!req.role.includes("Admin"))
    return res.status(420).json(new ApiError(410, "Authentication Failed!"));

  if (req.body.delete === "student") {
    if (!id) return res.status(403).json(new ApiError(403, "ID is Missing!"));

    try {
      await StudentEnrollment.deleteStudent(id);
      console.log(id);
      
      return res
        .status(200)
        .json(new ApiResponse(200, "Successfully Deleted!"));
    } catch (error) {
      // console.log(error)
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
    const { name, fatherName, phoneNumber, classId , newClass} = req.body;

    if (!name || !fatherName || !classId || !newClass)
      return res.status(400).json(new ApiError(400, "Detail is Missing!"));

    try {
      await StudentEnrollment.create({
        name,
        fatherName,
        ...(phoneNumber && { phoneNumber }),
        class: new mongoose.Types.ObjectId(classId),
        newClass,
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
      console.log(error);
      
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
    console.log(error);

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
    console.log(error);
    
    return res
      .status(500)
      .json(new ApiError(500, "Something Went wrong!", error));
  }
});

const classAdd = asyncHandler(async (req, res) => {
  const role = req.role

  if (!role.includes("Admin"))
    return res.status(403).json(new ApiError(403, "Authentication Failed!"));

  const { label, inchargeId, level, next_class } = req.body;

  if (!label || !level || !inchargeId)
    return res.status(400).json(new ApiError(400, "Detail is Missing!"));
  let gradeData = {
    label, 
    incharge : inchargeId, 
    level
  }
  if (next_class) gradeData.next_class = next_class

  try {
    await Grade.create(gradeData);
    return res.status(200).json(new ApiResponse(200, "Successfully Added!"));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, "Something Went wrong!", error));
  }
});

const newSession = asyncHandler(async (req, res) => {
  if (!req.role.includes("Admin"))
    return res.status(403).json(new ApiError(403, "Authentication Failed!"));

  const { label, year } = req.body;
  if (!label || !year)
    return res.status(400).json(new ApiError(400, "Detail is Missing!"));

  try {
    await Grade.create({ label, year, status: "Current" });
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
    const { teacher, attendence } = req.body;
    if (!teacher || teacher.length === 0) {
      return res.status(400).json(new ApiError(400, "Data is Missing!"));
    }

    // Update Attendence
    if (attendence && attendence.length !== 0) {
      const newAttendence = teacher
        .filter((person) => {
          console.log(person);
          return (
            person.status === "Present" &&
            attendence.some((att) => att.attendeId === person.attendeId)
          );
        })
        .map((person) => person.attendeId);

      if (newAttendence.length !== 0) {
        console.log(newAttendence.length);
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
            person.status === "Absent" && !attendence.includes(person.attendeId)
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
  //^ Ready To Test
  else if (req.role.includes("Teacher")) {
    console.log("route Hit!!!!")

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
        console.log(newAttendence.length);
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
            person.status === "Absent" && !attendence.includes(person.attendeId)
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

const transferStudents = asyncHandler(async (fromClassId, toClassId) => {
  const toClass = await Grade.findOne({ _id: toClassId, status: "Active" });
  console.log("Destination class:", toClass);
  if (!toClass) {
    throw new Error("Destination class does not exist or is not active.");
  }

  console.log("Query result:", toClass);
  await Student.updateMany(
    { currentClass: fromClassId },
    { $set: { currentClass: toClassId } }
  );

  await TimeTable.updateMany(
    { classId: { $elemMatch: { grade: fromClassId } } },
    { $set: { "classId.$.grade": toClassId } }
  );
  return true;
});
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
};
