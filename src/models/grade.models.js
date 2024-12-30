import mongoose, { Schema} from "mongoose";
import { StudentEnrollment } from './studentEnrollment.models.js';
const gradeSchema = new Schema({
    label : {
        type : String,
        required : true
    },
    level :{
        type : Number,
        required : true
    },
    incharge : {
        type : Schema.Types.ObjectId,
        ref : "Staff",
        required: true
    },
    substitute : {
       type : Schema.Types.ObjectId,
        ref : "Staff"
    },
    status :{
        type : String,
        default : "Active",
        enum : ["Active", "Inactive"]
    },
});


gradeSchema.pre('findOneAndUpdate', async function(next) {
    const grade = await this.model.findOne(this.getQuery());
    if (grade) {
        // Check if there are any students in this class
        const studentCount = await StudentEnrollment.countDocuments({ class: grade._id, status: 'Active' });
        if (studentCount > 0) {
            throw new Error('Cannot delete class with enrolled students. Please transfer all students first.');
        }
    }
    next();
});
export const Grade = mongoose.model("Grade", gradeSchema);