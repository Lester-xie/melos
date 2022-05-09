import React, {useState} from 'react';
import { useSelector } from 'umi';
import CustomTab from "@/components/chat/Custom";
import styles from './index.less';


export default function Chat() {
  const [collapse, setCollapse] = useState(false);
  // @ts-ignore
  const memberList: Array<API.MemberType> = useSelector((state) => state.global.memberList);
  return (
    <aside
      className={styles.container}
      style={{ width: collapse ? '0' : '270px' }}
    >
      {memberList.length>0 && <CustomTab/>}
      <div
        className={styles.bottom}
        onClick={() => {
          setCollapse((col) => !col);
        }}
        style={{
          position: collapse ? 'fixed' : 'absolute',
          width: collapse ? '30px' : '100%',
          right: collapse ? 'auto' : '16px',
        }}
      >
        <img
          src={require('../../assets/chat/collapse.png')}
          alt={'collapse'}
          style={{ transform: collapse ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </div>
    </aside>
  );
}
