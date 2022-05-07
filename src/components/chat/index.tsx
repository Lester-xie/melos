import React, {useState} from "react";
import {Tabs} from 'antd';
import styles from './index.less';
import Message from "@/components/chat/Message";
import Meeting from "@/components/chat/Meeting"
const {TabPane} = Tabs;

export default function Chat() {
  const [active, setActive] = useState('discuss')
  const [collapse,setCollapse] = useState(false)
   return (
    <aside className={styles.container} style={{width:collapse?'0':'270px'}}>
      <Tabs activeKey={active} renderTabBar={(props) => {
        const {panes} = props
        return <div className={styles.tab}>
          {
            panes && (panes as any).map((tab: any) => {
              return <div className={styles.tab} key={tab.key}>
                <div
                  key={tab.key}
                  className={active === tab.key ? [styles.item, styles.active].join(' ') : styles.item}
                  onClick={() => setActive(tab.key)}
                >
                  <img
                    src={active === tab.key ? require(`../../assets/chat/${tab.key}_active.png`) : require(`../../assets/chat/${tab.key}.png`)}
                    alt='icon'/>
                  {tab.key}
                </div>
              </div>
            })
          }
        </div>
      }}>
        <TabPane tab="discuss" key="discuss">
          <Message/>
        </TabPane>
        <TabPane tab="meeting" key="meeting">
         <Meeting/>
        </TabPane>
      </Tabs>
      <div
        className={styles.bottom}
        onClick={()=>{setCollapse(col=>!col)}}
        style={{
          position:collapse?'fixed':'absolute',
          width:collapse?'30px':'100%',
          right:collapse?'auto':'16px',
      }}
      >
        <img
          src={require('../../assets/chat/collapse.png')}
          alt={'collapse'}
          style={{transform:collapse?'rotate(180deg)':'rotate(0deg)'}}
        />
      </div>
    </aside>
  );
}
