import mongoose, { Schema } from "mongoose";
import {AcademicSession} from "./academicSession.models.js"
const testSchema = new Schema({
    label : {
        type : String,
        required : true
    },
    total_marks : {
        type : Number,
        required : true
    },
    teacherId : {
        type : Schema.Types.ObjectId,
        ref : "Staff",
        required : true
    },
    sessionId: {
        type : Schema.Types.ObjectId,
        ref: "AcademicSession"
    },
    classId:  {
        type : Schema.Types.ObjectId,
        ref: "Grade",
        required : true
    },
    status :{
        type : String,
        default: "Not Marked",
    },
    testDate: {
        type : Date,
        default : Date.now
    }
})

testSchema.pre("save", async function(next) {
    const CurrentSession = await AcademicSession.findOne({ status: "Current" });
    this.sessionId = CurrentSession._id;
    next();
  });
export const Test = mongoose.model("Test", testSchema) 