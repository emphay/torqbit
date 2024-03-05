import prisma from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

import { NextApiResponse, NextApiRequest } from "next";
import { withMethods } from "@/lib/api-middlewares/with-method";
import { withAuthentication } from "@/lib/api-middlewares/with-authentication";
import { errorHandler } from "@/lib/api-middlewares/errorHandler";
import appConstant from "@/services/appConstant";
export let cookieName = appConstant.development.cookieName;

if (process.env.NODE_ENV === "production") {
  cookieName = appConstant.production.cookieName;
}
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const token = await getToken({
    req,
    secret: process.env.NEXT_PUBLIC_SECRET,
    cookieName,
  });
  const userId = Number(token?.id);
  console.log(userId, "studentID");
  const { programId } = req.query;
  try {
    const program = await prisma.programRegistration.findFirst({
      where: {
        studentId: Number(userId),
        programId: Number(programId),
      },
    });
    let isEnrolled = false;
    if (program) {
      isEnrolled = true;
    }

    return res.status(200).json({ success: true, isEnrolled });
  } catch (err) {
    return errorHandler(err, res);
  }
};

export default withMethods(["GET"], withAuthentication(handler));
