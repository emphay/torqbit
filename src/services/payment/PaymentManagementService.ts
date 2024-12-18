import { $Enums, paymentMode } from "@prisma/client";

import prisma from "@/lib/prisma";
import appConstant from "../appConstant";
import {
  PaymentApiResponse,
  CoursePaymentConfig,
  PaymentServiceProvider,
  UserConfig,
  GatewayConfig,
  CashFreeConfig,
  OrderDetail,
  OrderHistory,
} from "@/types/payment";
import { CashfreePaymentProvider } from "./CashfreePaymentProvider";

export class PaymentManagemetService {
  getPaymentProvider = (config: GatewayConfig): PaymentServiceProvider => {
    switch (config.name) {
      case $Enums.gatewayProvider.CASHFREE:
        let c = config as CashFreeConfig;
        return new CashfreePaymentProvider(c.clientId, c.secretId);
      default:
        throw new Error("Unable to find the payment provider! contact with support team");
    }
  };

  getPaymentStatus = async (
    gatewayProvider: $Enums.gatewayProvider,
    orderId: string
  ): Promise<{
    status: string | null;
    paymentDisable: boolean;
    alertType: string;
    alertMessage: string;
    alertDescription: string;
  }> => {
    switch (gatewayProvider) {
      case $Enums.gatewayProvider.CASHFREE:
        let currentTime = new Date().getTime();
        const getDetail = await prisma.cashfreeOrder.findFirst({
          where: {
            gatewayOrderId: orderId,
          },
          select: {
            createdAt: true,
            gatewayStatus: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        });
        if (getDetail) {
          let progressTime = getDetail.createdAt.getTime() + appConstant.payment.lockoutMinutes;
          if (getDetail.gatewayStatus === $Enums.cashfreePaymentStatus.FAILED) {
            return {
              status: getDetail.gatewayStatus,
              paymentDisable: false,
              alertType: "error",
              alertMessage: "Payment Failed",
              alertDescription: "Your payment has failed. Please contact support if you have any questions",
            };
          } else if (getDetail.gatewayStatus === $Enums.cashfreePaymentStatus.USER_DROPPED) {
            return {
              status: getDetail.gatewayStatus,
              paymentDisable: false,
              alertType: "warning",
              alertMessage: "Payment Dropped",
              alertDescription: "Your payment has been dropped. Please contact support if you have any questions",
            };
          } else if (getDetail.gatewayStatus === $Enums.cashfreePaymentStatus.SUCCESS) {
            return {
              status: getDetail.gatewayStatus as string,
              paymentDisable: false,
              alertType: "success",
              alertMessage: "Payment Successful",
              alertDescription: "Congratulations you have successfully purchased this course",
            };
          } else {
            if (progressTime > currentTime) {
              let remainingTime = (progressTime - currentTime) / 1000;
              return {
                status: getDetail.gatewayStatus,
                paymentDisable: remainingTime > 0 ? true : false,
                alertType: "warning",
                alertMessage: "Payment Pending",
                alertDescription: "Your payment is pending. Please contact support if you have any questions",
              };
            } else {
              return {
                status: getDetail.gatewayStatus,
                paymentDisable: false,
                alertType: "warning",
                alertMessage: "Payment Pending",
                alertDescription: "Your payment is pending. Please contact support if you have any questions",
              };
            }
          }
        }

      default:
        throw new Error("Unable to find the payment provider! contact with support team");
    }
  };

  getLatestOrder = async (studentId: string, courseId: number): Promise<OrderDetail | null> => {
    const latestOrder = await prisma.order.findFirst({
      where: {
        studentId: studentId,
        courseId: courseId,
      },

      orderBy: {
        createdAt: "desc",
      },
    });
    return latestOrder as OrderDetail | null;
  };

  getOrderHistoryByUser = async (studentId: string): Promise<OrderHistory[]> => {
    const orders = await prisma.$queryRaw<
      any[]
    >`SELECT o.latestStatus as status,o.amount,o.updatedAt as paymentDate,o.courseId,o.orderId,o.currency,co.name as courseName,invoice.id as invoiceId FROM \`Order\` AS o  
    INNER JOIN Course as co ON co.courseId = o.courseId
       LEFT OUTER JOIN Invoice as invoice ON invoice.studentId = ${studentId}  AND invoice.orderId = o.orderId
     WHERE o.studentId = ${studentId} AND o.updatedAt =  (SELECT MAX(updatedAt)
    FROM \`Order\` AS b 
    WHERE o.courseId = b.courseId AND o.studentId = ${studentId}) ORDER BY o.updatedAt ASC`;

    return orders;
  };

  processPayment = async (
    userConfig: UserConfig,
    courseConfig: CoursePaymentConfig,
    gatewayConfig: GatewayConfig
  ): Promise<PaymentApiResponse> => {
    const currentTime = new Date();
    const latestOrder = await this.getLatestOrder(userConfig.studentId, courseConfig.courseId);

    /**
     * if payment is in success state
     */

    if (latestOrder && latestOrder.latestStatus === $Enums.paymentStatus.SUCCESS) {
      return { success: false, error: "You have already purchased this course" };
    }

    /**
     *  if payment is in initiated state
     */

    if (latestOrder && latestOrder.latestStatus === $Enums.paymentStatus.INITIATED) {
      const orderCreatedTime = new Date(latestOrder.createdAt).getTime();

      if (orderCreatedTime + appConstant.payment.lockoutMinutes > currentTime.getTime()) {
        return {
          success: false,
          error: `Your payment session is still active.`,
        };
      }
    }

    /**
     * if latest order is in failed state or not available
     */
    try {
      const paymentProvider = this.getPaymentProvider(gatewayConfig);

      if (!latestOrder || latestOrder.latestStatus === $Enums.paymentStatus.FAILED) {
        const order = await prisma.order.create({
          data: {
            studentId: userConfig.studentId,
            latestStatus: $Enums.paymentStatus.INITIATED,
            courseId: courseConfig.courseId,
            paymentGateway: gatewayConfig.name as $Enums.gatewayProvider,
            amount: courseConfig.amount,
          },
          select: {
            id: true,
          },
        });

        const paymentData = await paymentProvider.purchaseCourse(courseConfig, userConfig, order.id);
        return paymentData;
      }

      /**
       *   if payment is in pending state
       */

      if (latestOrder.latestStatus === $Enums.paymentStatus.PENDING) {
        const pendingPaymentResponse = await paymentProvider.purchaseCourse(courseConfig, userConfig, latestOrder.id);
        return pendingPaymentResponse;
      }
    } catch (error) {
      console.log(error);

      return { success: false, error: "Unable to find the payment provider.Contact the support team" };
    }

    return { success: false, error: "something went wrong" };
  };
}
