import { PrismaAdapter } from '@next-auth/prisma-adapter';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider from 'next-auth/providers/google';

/**
 * NextAuth.js 自定义微信 OAuth Provider
 */
function WechatProvider(options) {
  return {
    id: "wechat",
    name: "WeChat",
    type: "oauth",
    version: "2.0",
    scope: "snsapi_login",
    params: { grant_type: "authorization_code" },
    accessTokenUrl: "https://api.weixin.qq.com/sns/oauth2/access_token",
    requestTokenUrl: "https://open.weixin.qq.com/connect/qrconnect",
    authorizationUrl:
      "https://open.weixin.qq.com/connect/qrconnect?appid={clientId}&response_type=code&scope=snsapi_login&redirect_uri={redirectUri}",
    profileUrl: "https://api.weixin.qq.com/sns/userinfo",
    async profile(profile, tokens) {
      // profile: { openid, nickname, sex, province, city, country, headimgurl, privilege, unionid }
      return {
        id: profile.unionid || profile.openid,
        name: profile.nickname,
        email: null, // 微信不返回邮箱
        image: profile.headimgurl,
      };
    },
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    ...options,
  };
}

import prisma from '@/prisma/index';
import { html, text } from '@/config/email-templates/signin';
import { emailConfig, sendMail } from '@/lib/server/mail';
import { createPaymentAccount, getPayment } from '@/prisma/services/customer';

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  callbacks: {
    session: async ({ session, user }) => {
      if (session.user) {
        const customerPayment = await getPayment(user.email);
        session.user.userId = user.id;

        if (customerPayment) {
          session.user.subscription = customerPayment.subscriptionType;
        }
      }

      return session;
    },
  },
  debug: !(process.env.NODE_ENV === 'production'),
  events: {
    signIn: async ({ user, isNewUser }) => {
      const customerPayment = await getPayment(user.email);

      if (isNewUser || customerPayment === null || user.createdAt === null) {
        await Promise.all([createPaymentAccount(user.email, user.id)]);
      }
    },
  },
  providers: [
    EmailProvider({
      from: process.env.EMAIL_FROM,
      server: emailConfig,
      sendVerificationRequest: async ({ identifier: email, url }) => {
        const { host } = new URL(url);
        await sendMail({
          html: html({ email, url }),
          subject: `[Nextacular] Sign in to ${host}`,
          text: text({ email, url }),
          to: email,
        });
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    WechatProvider({
      clientId: process.env.WECHAT_CLIENT_ID,
      clientSecret: process.env.WECHAT_CLIENT_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || null,
  session: {
    jwt: true,
  },
};
