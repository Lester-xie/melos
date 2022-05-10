import { Select, Button } from 'antd';
import { GlobalModelState, useSelector } from 'umi';
import { PlusOutlined } from '@ant-design/icons';
import React, { useEffect, useState } from 'react';
import callVoice from '../../assets/chat/call_voice.png';
import call_invite from '../../assets/chat/call_invite.png';
import mute from '../../assets/chat/mute.png';
import unmute from '../../assets/chat/unmute.png';
import tick from '../../assets/chat/tick.png';
import { getUserList } from '@/services/api';
import defaultImg from '../../assets/chat/default.png';
import styles from './index.less';

interface IMeeting {
  inviteUser: (id: string) => void;
  toggleMute: (flag: boolean) => void;
  delMember: (id: string) => void;
  goCreateOrJoinRoom: () => void;
}

const { Option } = Select;
const Meeting: React.FC<IMeeting> = (props) => {
  const { toggleMute, delMember, goCreateOrJoinRoom } = props;
  const [userList, setUserList] = useState([]);
  const [selectValue, setSelectValue] = useState('123');
  const globalState: GlobalModelState = useSelector(
    (state: any) => state.global,
  );
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

  // 刪除項目成員
  const delMemberUser = (id: string) => {
    delMember(id);
  };

  // 拉起一个房间
  const createOrJoinRoom = () => {
    goCreateOrJoinRoom();
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

  const inviteMember = () => {
    props.inviteUser(selectValue);
  };
  return (
    <div className={styles.meeting}>
      <div className={styles.self}>
        <div className={styles.left}>
          <img src={selfUser.user?.avatar?.url || defaultImg} alt={'avatar'} />
        </div>
        <div className={styles.right}>
          <div className={styles.name}>{selfUser.user.name}</div>
          <div className={styles.tag}>
            {globalState.muteMembersIds.includes(selfUser.user._id) ? (
              <img src={mute} alt="callVoice" onClick={unMuteMyself} />
            ) : (
              <img src={unmute} alt="callInvite" onClick={muteMyself} />
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
        {globalState.memberList
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
                  </div>
                  <div className={styles.right}>
                    <div className={styles.name}>{m.user?.name}</div>
                    <div className={styles.tag}>
                      {/*<span>Drummer</span>*/}
                      <span className={styles.role}>{m.role}</span>
                    </div>
                  </div>
                </div>
                <div className={styles.MBottom}>
                  <div className={styles.status}>
                    {globalState.onlineMemberIds.includes(m.user._id) ? (
                      <img src={callVoice} alt="callVoice" />
                    ) : (
                      <img
                        src={call_invite}
                        alt="callInvite"
                        onClick={createOrJoinRoom}
                      />
                    )}
                    {globalState.onlineMemberIds.includes(m.user._id) && (
                      <>
                        {globalState.muteMembersIds.includes(m.user._id) &&
                        globalState.onlineMemberIds ? (
                          <img src={mute} alt="callVoice" />
                        ) : (
                          <img src={unmute} alt="callVoice" />
                        )}
                      </>
                    )}
                  </div>
                  <div
                    className={styles.del}
                    onClick={() => {
                      delMemberUser(m.user._id);
                    }}
                  >
                    {selfUser.role === 'admin' && <img src={tick} alt="tick" />}
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
