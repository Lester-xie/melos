import styles from './index.less';
import { Select, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import React, {useEffect, useState} from 'react';
import callVoice from '../../assets/chat/call_voice.png';
import call_invite from '../../assets/chat/call_invite.png';
import mute from '../../assets/chat/mute.png';
import unmute from '../../assets/chat/unmute.png';
import tick from '../../assets/chat/tick.png';
import {getUserList} from "@/services/api";
import defaultImg  from '../../assets/chat/default.png'

interface IMeeting {
  memberList: Array<API.MemberType>;
  inviteUser:(id:string)=>void
  toggleMute:(flag:boolean)=>void
}

const { Option } = Select;
const Meeting: React.FC<IMeeting> = (props) => {
  const { memberList,toggleMute } = props;
  const [userList,setUserList]= useState([])
  const [selectValue,setSelectValue]= useState('123')
  const [selfUser,setSelfUser] = useState<any>({
    user: {
      name: '',
      avatar: { url: '' },
    },
    isMute:false,
    role: '',
  })
  const self = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(()=>{
    onInputChange('').then()
    const me = memberList.find((m) => m.user._id === self.id) ;
    if(me){
      setSelfUser(me)
    }
  },[])

  const muteMyself = ()=>{
    toggleMute(true)
    setSelfUser((u:any)=>{
      return {...u,isMute:true}
    })
    selfUser.isMute= true
  }

  const unMuteMyself = ()=>{
    toggleMute(false)
    setSelfUser((u:any)=>{
      return {...u,isMute:false}
    })
  }

  const onInputChange = async (e:string)=>{
    const res =  await getUserList(e)
    if(res.code===0){
      let arr = res.data.result.map((u:any)=>{
        return {
          label:u.name,
          value:u._id
        }
      })
      setUserList(arr)
    }
  }

  const onSelected = (value:string)=>{
    setSelectValue(value)
  }

  const inviteMember = ()=>{
    props.inviteUser(selectValue)
  }
  return (
    <div className={styles.meeting}>
      <div className={styles.self}>
        <div className={styles.left}>
          <img src={selfUser.user?.avatar.url||defaultImg} alt={'avatar'} />
        </div>
        <div className={styles.right}>
          <div className={styles.name}>{selfUser.user.name}</div>
          <div className={styles.tag}>
            {/*<span>Drummer</span>*/}
            {
              selfUser.isMute? <img src={mute} alt="callVoice" onClick={unMuteMyself}/>: <img src={unmute} alt="callVoice" onClick={muteMyself}/>
            }
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
            style={{width:'100%'}}
            onChange={onSelected}
            onSearch={onInputChange}
          >
            {
              userList.map((u:any)=>{
                return  <Option value={u.value} key={u.value}>{u.label}</Option>
              })
            }

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
        {memberList.filter(m=>m.user._id!==self.id).map((m) => {
          return (
            <section key={m._id}>
              <div className={styles.top}>
                <div className={styles.left}>
                  <img src={m.user?.avatar?.url||defaultImg} alt={'avatar'} />
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
                  {m.isInMeeting ? (
                    <img src={callVoice} alt="callVoice" />
                  ) : (
                    <img src={call_invite} alt="callInvite" />
                  )}
                  {m.isInMeeting && m.isMute && (
                    <img src={mute} alt="callVoice" />
                  )}
                  {m.isInMeeting && !m.isMute && (
                    <img src={unmute} alt="callVoice" />
                  )}
                </div>
                <div className={styles.del}>
                  {m.isInMeeting && <img src={tick} alt="tick" />}
                </div>
              </div>
            </section>
          );
        })}
      </div>
      <div className={styles.meetingInfo}>
        <Button type={'primary'} style={{ width: '100%' }}>
          Leave
        </Button>
        <h5>Record 00:24:43</h5>
      </div>
    </div>
  );
};

export default Meeting;
