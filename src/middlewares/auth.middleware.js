import { asyncHandler } from "../utils/asynchandler.js";
import { Staff } from "../models/staff.models.js";
import jwt from "jsonwebtoken"

const auth = asyncHandler( async (req, res,next) => {
  const token = req.cookies['access_Token']
if (!token)  
  return res.redirect("/portal/login")
try {
  const user = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
  const role = user.role;
  const id = user.id
  req.role = role
  req.id = id
  next()
  
} catch (err) {

    if (err.name == 'TokenExpiredError')
    {
        const token = req.cookies['refresh_Token']
        try {

            const id = jwt.verify(token,process.env.REFRESH_TOKEN_SECRET).id
            const user = await Staff.findById(id)

            if (user.refreshToken !== token) 
              return res.redirect("/portal/login")
            const accessToken = user.generateAccessToken()
            const refreshToken = user.generateRefreshToken()
            user.refreshToken = refreshToken
            await user.save()

            req.role = user.role
            req.id = user._id
            res.cookie("access_Token",accessToken,{
              httpOnly: true,
              secure : true,
              sameSite: 'strict'
            })

            res.cookie("refresh_Token",refreshToken,{
                httpOnly: true,
                secure : true,
                sameSite: 'strict'
            })

            next()

        } catch (error) {

            if (error.name == 'TokenExpiredError') 
              return res.redirect("/portal/login")
        }
    }
}
})

export {auth}