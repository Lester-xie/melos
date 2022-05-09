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
    avatar?: string;
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
    };
    role: 'admin' | 'guest' | 'editor';
    isMute?:boolean,
    isInMeeting?:boolean
    [key: string]: any;
  };
}
