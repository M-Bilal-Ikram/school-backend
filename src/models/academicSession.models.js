import mongoose, { Schema} from "mongoose";

const academicSessionSchema = new Schema({
    label : {
        type : String,
        required : true
    },
    year : {
        type : String,
        required : true
    },
    status : {
        type : String,
        required : true,
    }
});

export const AcademicSession = mongoose.model("AcademicSession", academicSessionSchema);