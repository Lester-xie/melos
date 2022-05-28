declare class RTCMultiConnection {}
declare namespace API {
  type User = {
    _id?: number | string;
    avatar?: { url: string };
    token?: string;
    name?: string;
  };

  type PresignData = {
    link: string;
    token: string;
  };
  type messageRecord = {
    content?: string;
    isSelf?: boolean;
    id: string | number;
    userId?: string;
    name?: string;
  };
  type MemberType = {
    _id: string;
    user: {
      _id: string;
      name: string;
      avatar: {
        url: string;
      };
      isOnline?: boolean;
    };
    role: 'admin' | 'guest' | 'editor';
    isMute?: boolean;
    isInMeeting?: boolean;
    isOnline?: boolean;
    [key: string]: any;
  };

  type ProjectType = {
    deleted: boolean;
    name: string;
    owner: { _id: string };
    _id: string;
    updatedAt: string;
    [key: string]: any;
  };
}
