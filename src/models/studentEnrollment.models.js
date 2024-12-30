import mongoose, { Schema } from "mongoose";
import {AcademicSession} from "./academicSession.models.js"

const studentEnrollmentSchema = new Schema(
    {
        name : {
            type : String,
            required: true
        },
        fatherName : {
            type : String,
            required: true
        },
        phoneNumber : {
            type : String
        },
        class: [
           { 
            type : Schema.Types.Mixed,
            required : true
            }
        ],
        startSession : {
            type : Schema.Types.ObjectId,
            ref : "AcademicSession",
        },
        endSession : {
            type : Schema.Types.ObjectId,
            ref : "AcademicSession",
        },
    }
)

studentEnrollmentSchema.pre("save", async function(next) {
    const CurrentSession = await AcademicSession.findOne({ status: "Current" });
    this.startSession = CurrentSession._id;
    next();
  });


studentEnrollmentSchema.statics.deleteStudent = async function(id) {
    const CurrentSession = await AcademicSession.findOne({ status: "Current" });
    await this.updateMany(
        { _id: { $in: id } },
        { $set: { endSession: CurrentSession } }
      );
};

export const StudentEnrollment =  mongoose.model("StudentEnrollment", studentEnrollmentSchema)