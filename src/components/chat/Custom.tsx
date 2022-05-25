import { message, Tabs } from 'antd';
import styles from '@/components/chat/index.less';
import Message from '@/components/chat/Message';
import Meeting from '@/components/chat/Meeting';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector, GlobalModelState } from 'umi';
import { socketPrefix } from '@/config';
import {
  delProjectMemberAPI,
  getMemberList,
  inviteProjectUser,
  noticeMemberChanged,
  noticeRTCStatusChange,
  updateMemberRole,
} from '@/services/api';
const { TabPane } = Tabs;

export const generateId = () => {
  return new Date().getTime() + parseInt((Math.random() * 10000).toString());
};
const CustomTab = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [active, setActive] = useState('meeting');

  const globalState: GlobalModelState = useSelector(
    (state: any) => state.global,
  );
  const dispatch = useDispatch();
  const RTCRef = useRef<any>();

  const memberRef = useRef<Array<API.MemberType>>([]);
  const onMeetingUserRef = useRef<Array<string>>([]);
  const onMuteIdsRef = useRef<Array<string>>([]);

  const callback = useCallback(
    (event: any) => {
      const str = event.data;
      if (str.substring(0, 9) === 'tickTick#') {
        const uid = str.substring(9);
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (uid === user.id) {
          RTCRef.current?.closeSocket();
          RTCRef.current = null;
          dispatch({
            type: 'global/save',
            payload: {
              muteMembersIds: [],
              onlineMemberIds: [],
              roomId: '',
            },
          });
          return;
        }
      }
      // 通过ref动态引用获取到paused的当前状态
      const user = memberRef.current?.find(
        (m) => m.user._id === event.extra.userId,
      );
      if (!user) return;
    },
    [memberRef],
  );

  useEffect(() => {
    memberRef.current = globalState.memberList;
  }, [globalState.memberList]);

  useEffect(() => {
    onMeetingUserRef.current = globalState.onlineMemberIds;
  }, [globalState.onlineMemberIds]);

  useEffect(() => {
    onMuteIdsRef.current = globalState.muteMembersIds;
  }, [globalState.muteMembersIds]);

  const muteOrUnMuteCallback = useCallback(
    (event: any) => {
      const { extra, isAudioMuted } = event;
      const userId = extra.userId;

      const muteIds = [...onMuteIdsRef.current];
      let ids: Array<string>;
      if (isAudioMuted) {
        const muteSet = new Set(muteIds);
        muteSet.add(userId);
        ids = Array.from(muteSet);
      } else {
        ids = muteIds.filter((m) => m !== userId);
      }

      dispatch({
        type: 'global/save',
        payload: {
          muteMembersIds: ids,
        },
      });
    },
    [onMuteIdsRef],
  );

  const onStreamCallback = useCallback(
    (event: any) => {
      console.log('on stream...');
      const { extra, stream } = event;
      const userId = extra.userId;
      const { isAudio } = stream;
      if (!isAudio) {
        //mute add
        let muteSet = new Set(globalState.muteMembersIds);
        muteSet.add(userId);
        const arr = Array.from(muteSet);
        dispatch({
          type: 'global/save',
          payload: {
            muteMembersIds: arr,
          },
        });
      }
      let onlineMemberIdsSet = new Set(onMeetingUserRef.current);
      onlineMemberIdsSet.add(userId);
      const onlineMembers = Array.from(onlineMemberIdsSet);
      // 生成userid 和 streamId的map关系
      let map = globalState.userIdMappingStreamId;
      map[userId] = stream.streamid;
      dispatch({
        type: 'global/save',
        payload: {
          onlineMemberIds: onlineMembers,
          userIdMappingStreamId: map,
        },
      });
    },
    [onMeetingUserRef],
  );

  // 媒体流结束 onstreamended
  const onstreamendedCallback = useCallback(
    (event: any) => {
      console.log('on stream end...', event);
      const { extra } = event;
      const userId = extra.userId;
      if (userId === user.id) {
        message.warn('Your have leave this room').then();
        RTCRef.current?.closeSocket();
      }
      const onlineMembers = [...onMeetingUserRef.current].filter(
        (u) => u !== userId,
      );
      const muteMembersIds = [...globalState.muteMembersIds].filter(
        (u) => u !== userId,
      );
      dispatch({
        type: 'global/save',
        payload: {
          onlineMemberIds: onlineMembers,
          muteMembersIds: muteMembersIds,
        },
      });
    },
    [onMeetingUserRef],
  );

  const toggleMute = (bol: boolean, userId: string = '') => {
    let id = userId;
    if (!userId) {
      id = user.id;
    }
    const map = globalState.userIdMappingStreamId;
    const streamId = map[id];
    if (!streamId) {
      return;
    }
    if (bol) {
      RTCRef.current?.streamEvents[streamId].stream.mute('audio');
    } else {
      RTCRef.current?.streamEvents[streamId].stream.unmute('audio');
    }
  };

  // inviteMember
  const inviteUser = async (userId: string) => {
    const res = await inviteProjectUser(userId, globalState.project.id);
    if (res.code === 0) {
      message.success('invited success');
      noticeMemberChanged(globalState.project.id).then();
      getMemberList(globalState.project.id).then((res) => {
        dispatch({
          type: 'global/save',
          payload: {
            memberList: res.data.result,
          },
        });
      });
    }
  };

  // 刪除用戶
  const delMember = (id: string, userId: string) => {
    delProjectMemberAPI(id)
      .then((res) => {
        // 删除项目成员成功
        //  1.更新memberList 列表
        if (res.code === 0) {
          getMemberList(globalState.project.id).then((c) => {
            if (c.code === 0) {
              dispatch({
                type: 'global/save',
                payload: {
                  memberList: c.data.result,
                },
              });
            }
          });
        }
        noticeMemberChanged(globalState.project.id).then();

        // 2.把他T出会议室，如果他在线的话
        const map = globalState.userIdMappingStreamId;
        // 找出对应的stream Id
        const streamId = map[userId];
        if (!streamId) {
          return;
        }
        // RTCRef.current.removeStream(streamId);
        // RTCRef.current.deletePeer(userId);
        // RTCRef.current.StreamsHandler.onSyncNeeded(streamId, 'ended');
        // RTCRef.current.disconnectWith( userId )
        RTCRef.current.send(`tickTick#${userId}`);
      })
      .catch((e) => {
        console.log(e);
      });
  };
  // 拉起房间
  const goCreateOrJoinRoom = () => {
    RTCRef.current = new RTCMultiConnection() as any;
    RTCRef.current.socketURL = socketPrefix;
    RTCRef.current.session = {
      data: true,
      audio: true,
      video: false,
    };
    RTCRef.current.mediaConstraints = {
      audio: true,
      video: false,
    };
    RTCRef.current.extra = {
      userId: user.id,
    };
    RTCRef.current.userid = user.id;
    RTCRef.current.iceServers = [
      {
        urls: 'stun:8.218.125.220:3478',
      },
    ];
    RTCRef.current.iceServers.push({
      urls: 'turn:8.218.125.220:3478',
      credential: 'anxing123',
      username: 'anxing',
    });
    RTCRef.current.onopen = function () {
      // RTCRef.current.send('hello every one')
      console.log(11111, 'room open...');
      // RTCRef.current.streamEvents[streamId].stream.mute('audio');
    };
    RTCRef.current.onmute = muteOrUnMuteCallback;
    RTCRef.current.onunmute = muteOrUnMuteCallback;
    RTCRef.current.connectSocket((socket: any) => {
      socket.on('muteSomebody', function () {
        alert(message);
      });
    });
    RTCRef.current.onPeerStateChanged = (state: any) => {
      console.log(state);
      if (
        state.iceConnectionState.search(/closed|failed|disconnected/gi) !== -1
      ) {
        // @ts-ignore
        // message.error('You had been ticked from the room').then()
        // window.location.reload()
      }
    };
    RTCRef.current.onclose = function (ev: any) {
      console.log('on others close...', ev);
    };
    RTCRef.current.onmessage = callback;
    RTCRef.current.onstream = onStreamCallback;
    RTCRef.current.onstreamended = onstreamendedCallback;

    RTCRef.current.openOrJoin(globalState.roomId);
    message.success('Join Room success').then();
    dispatch({
      type: 'global/save',
      payload: {
        onlineMemberIds: globalState.onlineMemberIds.concat(user.id),
      },
    });
    noticeRTCStatusChange(user.id, globalState.project.id, false).then();
  };

  const onRoleChange = (mId: string, e: string) => {
    updateMemberRole(mId, e).then((res) => {
      if (res.code === 0) {
        message.success('Update role success').then();
        noticeMemberChanged(globalState.project.id).then();
        getMemberList(globalState.project.id).then((c) => {
          if (c.code === 0) {
            dispatch({
              type: 'global/save',
              payload: {
                memberList: c.data.result,
              },
            });
          }
        });
      }
    });
  };

  // mute or unmute others
  const muteOrUnmuteOthers = (userId: string, flag: boolean) => {
    // 1.先找出userId对应的streamId
    const map = globalState.userIdMappingStreamId;
    const streamId = map[userId];
    if (!streamId) {
      return;
    }
    // 2.mute or unmute--->通知他，并且让他自己mute
    if (flag) {
      RTCRef.current.StreamsHandler.onSyncNeeded(streamId, 'mute', 'audio');
    } else {
      RTCRef.current.StreamsHandler.onSyncNeeded(streamId, 'unmute', 'audio');
    }
  };

  const leaveRoomForMe = () => {
    RTCRef.current.closeSocket();
    RTCRef.current = null;
    dispatch({
      type: 'global/save',
      payload: {
        muteMembersIds: [],
        onlineMemberIds: globalState.onlineMemberIds.filter(
          (m) => m !== user.id,
        ),
        roomId: '',
      },
    });
    noticeRTCStatusChange(user.id, globalState.project.id, true).then();
  };

  const tickMemberOutRoom = (userId: string) => {
    console.log(userId);
    // const map = globalState.userIdMappingStreamId
    // // 找出对应的stream Id
    // const streamId =  map[userId]
    // if(!streamId){return}
    // // RTCRef.current.removeStream(streamId);
    // RTCRef.current.deletePeer(userId);
    // RTCRef.current.StreamsHandler.onSyncNeeded(streamId, 'ended');
    // RTCRef.current.disconnectWith( userId )
    RTCRef.current?.send(`tickTick#${userId}`);
    noticeRTCStatusChange(userId, globalState.project.id, true).then();
  };

  useEffect(() => {
    if (globalState.roomId) {
      goCreateOrJoinRoom();
    } else {
      RTCRef.current = null;
    }
  }, [globalState.roomId]);
  return (
    <Tabs
      activeKey={active}
      renderTabBar={(props) => {
        const { panes } = props;
        return (
          <div className={styles.tab}>
            {panes &&
              (panes as any).map((tab: any) => {
                return (
                  <div className={styles.tab} key={tab.key}>
                    <div
                      key={tab.key}
                      className={
                        active === tab.key
                          ? [styles.item, styles.active].join(' ')
                          : styles.item
                      }
                      onClick={() => setActive(tab.key)}
                    >
                      <img
                        src={
                          active === tab.key
                            ? require(`../../assets/chat/${tab.key}_active.png`)
                            : require(`../../assets/chat/${tab.key}.png`)
                        }
                        alt="icon"
                      />
                      {tab.key}
                    </div>
                  </div>
                );
              })}
          </div>
        );
      }}
    >
      <TabPane tab="meeting" key="meeting">
        <Meeting
          inviteUser={inviteUser}
          toggleMute={toggleMute}
          delMember={delMember}
          onRoleChange={onRoleChange}
          muteOrUnmuteOthers={muteOrUnmuteOthers}
          leaveRoomForMe={leaveRoomForMe}
          tickMemberOutRoom={tickMemberOutRoom}
        />
      </TabPane>
      <TabPane tab="discuss" key="discuss">
        {globalState.project.id && <Message />}
      </TabPane>
    </Tabs>
  );
};

export default CustomTab;
