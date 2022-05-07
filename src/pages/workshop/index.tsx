import styles from './index.less';
import TopLeftBar from '@/components/topLeftBar';
import Chat from '@/components/chat';
import Workspace from '@/components/workspace';
import { useCallback, useState } from 'react';
import { Login } from '@/services/api';

export default function IndexPage() {
  const [activeUser, setActiveUser] = useState('');
  const onBtnClicked = (name: string) => {
    setActiveUser(name);
    Login(name).then((res: any) => {
      if (res.code === 0) {
        window.localStorage.setItem('token', res.data.token);
      }
    });
  };

  return (
    <div className={styles.container}>
      <header>
        <TopLeftBar />
        <div className={styles.mintWrap}>
          <div className={styles.userGroup}>
            <button
              className={activeUser === 'user1' ? styles.active : null}
              onClick={() => onBtnClicked('user1')}
            >
              User 1
            </button>
            <button
              className={activeUser === 'user2' ? styles.active : null}
              onClick={() => onBtnClicked('user2')}
            >
              User 2
            </button>
            <button
              className={activeUser === 'user3' ? styles.active : null}
              onClick={() => onBtnClicked('user3')}
            >
              User 3
            </button>
          </div>
          <button className={styles.mint}>Mint NFT</button>
        </div>
      </header>
      <div className={styles.projectName}>Project Name</div>
      <main>
        <Chat />
        <Workspace />
      </main>
    </div>
  );
}
