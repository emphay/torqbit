import prisma from "@/lib/prisma";
import { NextApiResponse, NextApiRequest } from "next";
import { withMethods } from "@/lib/api-middlewares/with-method";
import { errorHandler } from "@/lib/api-middlewares/errorHandler";
import { getNotifi } from "../get/[toUserId]";
import { getToken } from "next-auth/jwt";
import appConstant from "@/services/appConstant";
export let cookieName = appConstant.development.cookieName;

if (process.env.NODE_ENV === "production") {
  cookieName = appConstant.production.cookieName;
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { tagCommentId } = req.body;
    const token = await getToken({
      req,
      secret: process.env.NEXT_PUBLIC_SECRET,
      cookieName,
    });

    const userId = Number(token?.id);
    const update = await prisma.notification.updateMany({
      where: {
        toUserId: userId,
        tagCommentId: Number(tagCommentId),
      },
      data: {
        isView: true,
      },
    });

    const notifications = await getNotifi(Number(req.query.userId));
    return res.status(200).json({ notifications, success: true });
  } catch (error) {
    return errorHandler(error, res);
  }
};

export default withMethods(["POST"], handler);