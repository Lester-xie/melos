import {Modal, Input,Tooltip} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import DelIcon from '../../assets/chat/del.png'
import styles from "./index.less";
import {useState} from "react";

interface IProject {
  id:string
}
const TopLeftBar = () => {
  const [newFlag,setNewFlag] = useState(false)
  const [projects,setProjects] = useState<IProject[]>([
    {id:"1"},
    {id:"2"},
  ])
  const del = (id:string)=>{
    setProjects([
      {id:"1"}
    ])
  }
  const content = (
    <div className={styles.project}>
      <p className={styles.search}><Input placeholder="Search" prefix={<SearchOutlined />}/></p>
      <div className={styles.projectItems}>
        {
          projects.map(p=>{
            return  <section key={p.id}>
              <div className={styles.content}>
                <div className={styles.projectName}>this is project name</div>
                <div className={styles.members}>members: 5</div>
                <div className={styles.time}>2022-04-15 12:43</div>
              </div>
              <div className={styles.options} onClick={()=>{del(p.id)}}>
                <img src={DelIcon} alt={'del'}/>
              </div>
            </section>
          })
        }
      </div>
    </div>
  );
  return <div className={styles.menu}>
    <ul>
      <li>My Band</li>
      <li>
        <Tooltip
          overlay={content}
          placement="bottomLeft"
          trigger="click"
          color={'#000000'}
          overlayStyle={{
            width:'320px',
            maxWidth:'320px',
            left:'16px'
          }}
          overlayInnerStyle={{
            padding:0
          }}
        >
        <span style={{display:'inline-block',width:'100%',height:'47px'}}>Band‘s Music</span>
      </Tooltip></li>
      <li onClick={()=>setNewFlag(true)}>New</li>
    </ul>
    <Modal
      style={{
        top:'30%'
      }}
      width={496}
      title=""
      visible={newFlag}
      closable={false}
      bodyStyle={{
        background: '#1B1C1D',
        color: 'white',
        padding: 0
      }}
      footer={null}
    >
      <header className={styles.header}>Create new project</header>
      <div className={styles.body}>
        <div style={{textAlign: 'center'}}><Input
          style={{
            width: '400px',
            background: '#323436',
            borderColor: 'transparent',
            color:'rgba(255, 255, 255, 0.3)'
          }}
          placeholder='Project Name'
        /></div>
        <div className={styles.footer}>
          <a className={styles.cancel} onClick={()=>setNewFlag(false)}>Cancel</a>
          <a className={styles.create}>Create</a>
        </div>
      </div>
    </Modal>
  </div>
}

export default TopLeftBar
