import { Select, Button, Popconfirm, message } from 'antd';
import { GlobalModelState, useSelector } from 'umi';
import { PlusOutlined } from '@ant-design/icons';
import React, { useEffect, useState } from 'react';
import callVoice from '../../assets/chat/call_voice.png';
import call_invite from '../../assets/chat/call_invite.png';
import mute from '../../assets/chat/mute.png';
import unmute from '../../assets/chat/unmute.png';
import tick from '../../assets/chat/tick.png';
import { getUserList, inviteUserJoinRoom } from '@/services/api';
import defaultImg from '../../assets/chat/default.png';
import styles from './index.less';

interface IMeeting {
  inviteUser: (id: string) => void;
  toggleMute: (flag: boolean) => void;
  delMember: (id: string, userId: string) => void;
  goCreateOrJoinRoom: () => void;
  onRoleChange: (memberId: string, e: any) => void;
  muteOrUnmuteOthers: (userId: string, flag: boolean) => void;
  tickMemberOutRoom: (userId: string) => void;
  leaveRoomForMe: () => void;
}

const { Option } = Select;
const Meeting: React.FC<IMeeting> = (props) => {
  const {
    toggleMute,
    delMember,
    goCreateOrJoinRoom,
    onRoleChange,
    muteOrUnmuteOthers,
    leaveRoomForMe,
    tickMemberOutRoom,
  } = props;
  const [userList, setUserList] = useState([]);
  const [selectValue, setSelectValue] = useState('');
  const globalState: GlobalModelState = useSelector(
    (state: any) => state.global,
  );

  const { socketConnectSuccess, socketOnlineUserIds } = globalState;
  const [selfUser, setSelfUser] = useState<any>({
    user: {
      name: '',
      avatar: { url: '' },
    },
    isMute: true,
    role: '',
  });

  useEffect(() => {
    const self = JSON.parse(localStorage.getItem('user') || '{}');
    if (globalState.memberList.length > 0) {
      const me = globalState.memberList.find((m) => m.user._id === self.id);
      if (me) {
        setSelfUser(me);
      }
    }
  }, [globalState.memberList]);

  const muteMyself = () => {
    toggleMute(true);
    selfUser.isMute = true;
  };

  // 离开房间
  const leaveRoom = () => {
    console.log('leaving room');
    leaveRoomForMe();
  };

  // 刪除項目成員
  const delMemberUser = (id: string, userId: string) => {
    delMember(id, userId);
  };

  // 拉起一个房间
  const createOrJoinRoom = (userId: string) => {
    // goCreateOrJoinRoom();
    // 1.判断他是否在线
    if (!socketOnlineUserIds.includes(userId)) {
      message.warn('Member is offline,please try it later').then();
      return;
    }

    inviteUserJoinRoom(
      userId,
      globalState.project.id,
      globalState.project.name,
    ).then(async () => {
      await message.success('Message had been send');
    });
  };

  const unMuteMyself = () => {
    toggleMute(false);
  };

  const onInputChange = async (e: string) => {
    const res = await getUserList(e);
    if (res.code === 0) {
      let arr = res.data.result.map((u: any) => {
        return {
          label: u.name,
          value: u._id,
        };
      });
      setUserList(arr);
    }
  };

  const onSelected = (value: string) => {
    setSelectValue(value);
  };

  const muteUnmuteOther = (
    userId: string,
    role: 'admin' | 'guest' | 'editor',
    flag: boolean,
  ) => {
    // 判断是否在线
    if (!globalState.onlineMemberIds.includes(userId)) return;
    // 判断权限,guest 只能操作自己
    if (selfUser.role === 'guest') {
      message.warn('You cant mute or unmute other member').then();
      return;
    }
    if (selfUser.role === 'editor' && role !== 'guest') {
      message.warn('You cant mute or unmute this member').then();
      return;
    }
    muteOrUnmuteOthers(userId, flag);
  };

  const inviteMember = () => {
    props.inviteUser(selectValue);
  };

  const tickMember = (id: string) => {
    tickMemberOutRoom(id);
  };

  const { muteMembersIds, memberList, onlineMemberIds } = globalState;
  return (
    <div className={styles.meeting}>
      <div className={styles.self}>
        <div className={styles.left}>
          <img src={selfUser.user?.avatar?.url || defaultImg} alt={'avatar'} />
          <span
            className={
              socketConnectSuccess
                ? [styles.status, styles.online].join(' ')
                : styles.status
            }
          />
        </div>
        <div className={styles.right}>
          <div className={styles.name}>{selfUser.user.name}</div>
          <div className={styles.tag}>
            {globalState.onlineMemberIds.includes(selfUser.user._id) ? (
              <img
                src={callVoice}
                alt="callVoice"
                style={{ marginRight: '5px' }}
                onClick={leaveRoom}
              />
            ) : (
              <img
                src={call_invite}
                alt="callInvite"
                style={{ marginRight: '5px' }}
                onClick={goCreateOrJoinRoom}
              />
            )}
            {globalState.onlineMemberIds.includes(selfUser.user._id) &&
            !muteMembersIds.includes(selfUser.user._id) ? (
              <img src={unmute} alt="callInvite" onClick={muteMyself} />
            ) : (
              <img src={mute} alt="callVoice" onClick={unMuteMyself} />
            )}
            {/*<span>Drummer</span>*/}

            <span className={styles.role}>{selfUser.role}</span>
          </div>
        </div>
      </div>
      <div className={styles.add}>
        <div className={styles.input}>
          <Select
            showSearch
            placeholder="Select a person"
            optionFilterProp="children"
            style={{ width: '100%' }}
            onChange={onSelected}
            onSearch={onInputChange}
          >
            {userList.map((u: any) => {
              return (
                <Option value={u.value} key={u.value}>
                  {u.label}
                </Option>
              );
            })}
          </Select>
        </div>
        <div className={styles.inputBtn}>
          <Button
            onClick={inviteMember}
            icon={<PlusOutlined />}
            type={'primary'}
            style={{ borderRadius: '8px' }}
          />
        </div>
      </div>
      <div className={[styles.members, 'customScroll'].join(' ')}>
        {memberList
          .filter((m) => m.user._id !== selfUser.user._id)
          .map((m) => {
            return (
              <section key={m._id}>
                <div className={styles.top}>
                  <div className={styles.left}>
                    <img
                      src={m.user?.avatar?.url || defaultImg}
                      alt={'avatar'}
                    />
                    <span
                      className={
                        socketOnlineUserIds.includes(m.user._id)
                          ? [styles.status, styles.online].join(' ')
                          : styles.status
                      }
                    />
                  </div>
                  <div className={styles.right}>
                    <div className={styles.name}>{m.user?.name}</div>
                    <div className={styles.tag}>
                      {/*<span>Drummer</span>*/}
                      <Select
                        defaultValue={m.role}
                        style={{ width: 120 }}
                        size="small"
                        onChange={(e: string) => onRoleChange(m._id, e)}
                      >
                        <Option value="admin">admin</Option>
                        <Option value="editor">editor</Option>
                        <Option value="guest">guest</Option>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className={styles.MBottom}>
                  <div className={styles.status}>
                    {globalState.onlineMemberIds.includes(m.user._id) ? (
                      <img
                        src={callVoice}
                        alt="callVoice"
                        onClick={() => tickMember(m.user._id)}
                      />
                    ) : (
                      <img
                        src={call_invite}
                        alt="callInvite"
                        onClick={() => createOrJoinRoom(m.user._id)}
                      />
                    )}
                    {!globalState.muteMembersIds.includes(m.user._id) &&
                    globalState.onlineMemberIds.includes(m.user._id) ? (
                      <img
                        src={unmute}
                        alt="callVoice"
                        onClick={() => {
                          muteUnmuteOther(m.user._id, m.role, true);
                        }}
                      />
                    ) : (
                      <img
                        src={mute}
                        alt="callVoice"
                        onClick={() => {
                          muteUnmuteOther(m.user._id, m.role, false);
                        }}
                      />
                    )}
                  </div>

                  <div className={styles.del}>
                    {selfUser.role === 'admin' && (
                      <Popconfirm
                        title="Are you sure to delete this Member?"
                        onConfirm={() => delMemberUser(m._id, m.user._id)}
                        okText="Yes"
                        cancelText="No"
                      >
                        <img src={tick} alt="tick" />
                      </Popconfirm>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
      </div>
    </div>
  );
};

export default Meeting;
