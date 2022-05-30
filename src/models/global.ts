import { Effect, Reducer, Subscription } from 'umi';
import { getMemberList, updateProject } from '@/services/api';
import { cloneDeep } from 'lodash';

export interface UserInfo {
  id: string;
  name: string;
  avatar: string;
}

interface RevocationItem {
  name: 'shift' | 'cut' | 'copy';
  currentIndex?: number;
  targetIndex: number;
  prevStartTime?: number;
  currentStartTime?: number;
}

export interface TrackInfo {
  src: string;
  name: string;
  mute: boolean;
  solo: boolean;
  gain: number;
  stereoPan: number;
  copy: Array<any>;
  cut: Array<any>;
  startTime: number;
  targetTrackIndex: number;
}

export interface chatRecordType {
  id: string;
  content: string;
  isSelf: boolean;
  userId: string;
  name?: string;
}

export interface GlobalModelState {
  memberList: Array<API.MemberType>;
  project: {
    name: string;
    id: string;
  };
  roomId: string;
  muteMembersIds: Array<string>;
  onlineMemberIds: Array<string>;
  userInfo: UserInfo | null;
  userRoleInCurrentProject: string;
  socketConnectSuccess: true | false;
  socketOnlineUserIds: Array<string>;
  userIdMappingStreamId: { [key: string]: string };
  currentTracks: Array<TrackInfo>;
  revocationList: Array<RevocationItem>;
  chatRecord: Array<chatRecordType>;
}

export interface GlobalModelType {
  namespace: 'global';
  state: GlobalModelState;
  effects: {
    query: Effect;
    updateMemberList: Effect;
  };
  reducers: {
    save: Reducer<GlobalModelState>;
    update: Reducer<GlobalModelState>;
    updateRow: Reducer<GlobalModelState>;
    addTrack: Reducer<GlobalModelState>;
  };
  subscriptions: { setup: Subscription };
}

// @ts-ignore
const GlobalModel: GlobalModelType = {
  namespace: 'global',

  state: {
    memberList: [],
    project: {
      name: '',
      id: '',
    },
    roomId: '',
    muteMembersIds: [],
    onlineMemberIds: [],
    userInfo: null,
    userRoleInCurrentProject: '',
    socketConnectSuccess: false,
    socketOnlineUserIds: [],
    userIdMappingStreamId: {},
    currentTracks: [],
    revocationList: [],
    chatRecord: [],
  },

  effects: {
    *query({ payload }, { call, put }) {},
    *updateMemberList({ payload }, { call, put }) {
      const res = yield call(getMemberList, payload);
      if (res.code === 0) {
        const onlineUser = res.data.result.filter(
          (m: API.MemberType) => m.isOnline || m.user.isOnline,
        );
        const onlineUserIds = onlineUser.map((m: API.MemberType) => m.user._id);
        yield put({
          type: 'global/save',
          payload: {
            memberList: res.data.result,
            socketOnlineUserIds: onlineUserIds,
          },
        });
      }
    },
  },
  reducers: {
    save(state, action) {
      return {
        ...state,
        ...action.payload,
      };
    },
    update(state, action) {
      const data = {
        ...state,
        ...action.payload,
      };
      updateProject(data.project.id, data.project.name, data.currentTracks);
      return {
        ...state,
        ...action.payload,
      };
    },
    // @ts-ignore
    updateRow(state, action) {
      const trackList = cloneDeep(state?.currentTracks);
      const revocationList = cloneDeep(state?.revocationList);
      switch (action.attr) {
        case 'cut': {
          if (trackList[action.index].cut) {
            trackList[action.index].cut.push({
              start: action.start,
              end: action.end,
            });
          } else {
            trackList[action.index].cut = [
              { start: action.start, end: action.end },
            ];
          }
          revocationList.push({
            name: 'cut',
            targetIndex: action.index,
            currentIndex: action.index,
          });
          break;
        }
        case 'copy': {
          if (trackList[action.index].copy) {
            trackList[action.index].copy.push({
              start: action.start,
              end: action.end,
              position: action.position,
              targetTrackIndex: action.targetTrackIndex,
            });
          } else {
            trackList[action.index].copy = [
              {
                start: action.start,
                end: action.end,
                position: action.position,
                targetTrackIndex: action.targetTrackIndex,
              },
            ];
          }
          revocationList.push({
            name: 'copy',
            currentIndex: action.index,
            targetIndex: action.targetTrackIndex,
          });
          break;
        }
        case 'mute': {
          trackList[action.index].mute = action.mute;
          trackList[action.index].solo = action.solo;
          break;
        }
        case 'solo': {
          trackList[action.index].solo = action.solo;
          trackList[action.index].mute = action.mute;
          break;
        }
        case 'gain': {
          trackList[action.index].gain = action.gain;
          break;
        }
        case 'stereoPan': {
          trackList[action.index].stereoPan = action.stereoPan;
          break;
        }
        case 'startTime': {
          trackList[action.index].startTime = action.startTime;
          let lastShiftIndex = -1;
          revocationList.forEach((item: RevocationItem, index: number) => {
            if (item.name === 'shift' && action.index === item.targetIndex) {
              lastShiftIndex = index;
            }
          });
          if (lastShiftIndex === -1) {
            revocationList.push({
              name: 'shift',
              prevStartTime: 0,
              currentStartTime: action.startTime,
              targetIndex: action.index,
            });
          } else {
            revocationList.push({
              name: 'shift',
              prevStartTime: revocationList[lastShiftIndex].currentStartTime,
              currentStartTime: action.startTime,
              targetIndex: action.index,
            });
          }
          break;
        }
        case 'reloadTrack': {
          const data = trackList[action.index];
          const waitDelArr: any[] = [];
          revocationList.forEach((item: RevocationItem, index: number) => {
            if (item.targetIndex === action.index) {
              waitDelArr.push(index);
            }
          });
          waitDelArr.forEach((index) => {
            revocationList.splice(index, 1);
          });
          trackList[action.index] = {
            src: data.src,
            name: data.name,
            mute: false,
            solo: false,
            gain: 1,
            stereoPan: 0,
            copy: null,
            cut: null,
            startTime: 0,
            assetId: data.assetId,
            userId: data.userId,
          };
          break;
        }
      }
      if (state?.userRoleInCurrentProject !== 'guest') {
        // @ts-ignore
        updateProject(state.project.id, state.project.name, trackList);
      }

      return {
        ...state,
        currentTracks: trackList,
        revocationList: revocationList,
      };
    },
    // @ts-ignore
    addTrack(state, action) {
      const trackList = cloneDeep(state?.currentTracks);
      trackList.push({
        src: action.data.src,
        name: action.data.name,
        mute: false,
        solo: false,
        gain: 1,
        stereoPan: 0,
        copy: null,
        cut: null,
        startTime: 0,
        assetId: action.data.assetId,
        userId: action.data.userId,
      });
      return {
        ...state,
        currentTracks: trackList,
      };
    },
    // @ts-ignore
    removeTrack(state, action) {
      const trackList = cloneDeep(state?.currentTracks);
      trackList.splice(action.index, 1);
      return {
        ...state,
        currentTracks: trackList,
      };
    },
  },
  subscriptions: {
    setup({}) {},
  },
};

export default GlobalModel;

export function isInitTrack(trackInfo: TrackInfo) {
  if (trackInfo) {
    return (
      !trackInfo.mute &&
      !trackInfo.solo &&
      trackInfo.gain === 1 &&
      trackInfo.stereoPan === 0 &&
      (trackInfo.copy === null || trackInfo.copy?.length == 0) &&
      (trackInfo.cut === null || trackInfo.cut?.length == 0) &&
      trackInfo.startTime === 0
    );
  } else {
    return false;
  }
}
