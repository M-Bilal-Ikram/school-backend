import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
const staffSchema = new Schema ({
    name : {
        type : String,
        required : true
    },
    role : {
        type : [String],
        required : true,
        enum : ["Admin", "Teacher", "Principal"]
    },
    email : {
        type : String,
        required : true,
        unique : true,
        lowercase : true
    },
    password : {
        type : String,
        required : true
    },
    refreshToken : {
        type : String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    dateDeleted: {
        type: Date
    }
})

staffSchema.pre("save", async function (next){
    if (!this.isModified("password")) next();
    this.password = await bcrypt.hash(this.password, 10)
    next()
})

staffSchema.pre("findOneAndUpdate", async function (next) {
    const update = this.getUpdate();
    if (update.password) {
        update.password = await bcrypt.hash(update.password, 10);
    }
    next();
});
staffSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

staffSchema.methods.generateAccessToken = function (){
    return jwt.sign({
        id: this._id,
        role : this.role,
        accessToken : this.accessToken
    },process.env.ACCESS_TOKEN_SECRET, {expiresIn : process.env.ACCESS_TOKEN_EXPIRY})
}

staffSchema.methods.generateRefreshToken = function (){
    return jwt.sign({
        id: this._id
    },process.env.REFRESH_TOKEN_SECRET, {expiresIn : process.env.REFRESH_TOKEN_EXPIRY})
}

staffSchema.methods.softDelete = async function() {
    this.isActive = false;
    this.dateDeleted = new Date();
    await this.save();
};

export const Staff = mongoose.model("Staff", staffSchema);
