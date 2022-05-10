import React, {useEffect, useState} from 'react';
import { useSelector,useDispatch} from 'umi';
import CustomTab from "@/components/chat/Custom";
import styles from './index.less';
import {getMemberList} from "@/services/api";


export default function Chat() {
  const [collapse, setCollapse] = useState(false);
  // @ts-ignore
  const globalState: { project:{name:string,id:string}} = useSelector((state) => state.global);
  // @ts-ignore
  const {project} = globalState
  const dispatch =  useDispatch()

  useEffect(()=>{
      if(globalState.project.id){
        getMemberList(globalState.project.id)
          .then((res) => {
            if (res.code === 0 && dispatch) {
              dispatch({
                type: 'global/save',
                payload: {
                  memberList: res.data.result,
                },
              });
            }
          })
      }
  },[globalState.project])
  return (
    <aside
      className={styles.container}
      style={{ width: collapse ? '0' : '270px' }}
    >
      {project.id && <CustomTab/>}
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
