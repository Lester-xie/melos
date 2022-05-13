import type { RequestConfig } from 'umi';
import { apiPrefix } from '@/config';
import { notification } from 'antd';

const getTypeToken = () => {
  let Token: string | null;
  Token = window.localStorage.getItem('token');
  return Token;
};
export const request: RequestConfig = {
  prefix: apiPrefix,
  errorHandler: (error: any) => {
    const { response, data } = error;
    if (!response) {
      notification.error({
        description: '您的网络发生异常，无法连接服务器',
        message: '网络异常',
      });
    }
    if (response && response.status) {
      const { status } = response;
      const msg = data.message || data.error;
      notification.error({
        message: `Request Error: ${status}`,
        description: msg,
      });
      if (status === 401 || status === 400) {
        setTimeout(() => {
          // window.location.href = '/user/login';
        }, 500);
      }
    }
    throw error;
  },
  middlewares: [
    async function setToken(ctx: any, next: any) {
      const { req } = ctx;
      const { options } = req;
      options.headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=UTF-8',
        Authorization: getTypeToken(),
      };
      await next();
    },
  ],
};
