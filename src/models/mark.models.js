import mongoose, { Schema } from "mongoose";
import { Test } from "./test.models.js";
import { ApiError } from "../utils/ApiError.js"

const markSchema = new Schema ({
    testId : {
        type : Schema.Types.ObjectId,
        ref : "Test",
        required : true
    },
    studentId : {
        type : Schema.Types.ObjectId,
        ref : "StudentEnrollment",
        required : true
    },
    score : {
        type : Number,
        required : true
    }
})

markSchema.pre("save", async function (next){
    let total_marks = Test.findOne({_id : this.testId}).select("_id");
    
    if (total_marks > this.score && this.score > 0) next();
    
    throw new ApiError(401,"Score must less than Total Score")

})

export const Marks = mongoose.model("Mark", markSchema)