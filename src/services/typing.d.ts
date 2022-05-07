declare class RTCMultiConnection{}
declare namespace API {
  type User = {
    id?: number;
    avatar?: string;
    token?: string;
    name?: string;
  };

  type PresignData = {
    link: string;
    token: string;
  };
}
