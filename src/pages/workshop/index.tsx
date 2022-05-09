import styles from './index.less';
import TopLeftBar from '@/components/topLeftBar';
import Chat from '@/components/chat';
import Workspace from '@/components/workspace';
import { FC, useState } from 'react';
import { Login, getMemberList } from '@/services/api';
import { GlobalModelState, ConnectProps, Loading, connect } from 'umi';

interface IndexProps extends ConnectProps {
  global: GlobalModelState;
  loading: boolean;
}

const IndexPage: FC<IndexProps> = ({ global, dispatch }) => {
  const [activeUser, setActiveUser] = useState('');
  const [token, setToken] = useState(window.localStorage.getItem('token'));
  const onBtnClicked = (name: string) => {
    setActiveUser(name);
    Login(name).then((res: any) => {
      if (res.code === 0) {
        setToken(res.data.token);
        window.localStorage.setItem('token', res.data.token);
        const user = JSON.stringify({
          name: res.data.name,
          id: res.data._id,
          avatar: res.data?.avatar?.url,
        });
        window.localStorage.setItem('user', user);
        getMemberList('62787b49a94c9a84356d293c')
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
          .catch((e) => {
            console.log(e);
          });
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
              className={activeUser === 'Tom' ? styles.active : null}
              onClick={() => onBtnClicked('Tom')}
            >
              Tom
            </button>
            <button
              className={activeUser === 'Jerry' ? styles.active : null}
              onClick={() => onBtnClicked('Jerry')}
            >
              Jerry
            </button>
          </div>
          <button className={styles.mint}>Mint NFT</button>
        </div>
      </header>
      <div className={styles.projectName}>Project Name</div>
      <main>
        <Chat />
        <Workspace token={token} />
      </main>
    </div>
  );
};

export default connect(
  ({ global, loading }: { global: GlobalModelState; loading: Loading }) => ({
    global,
    loading: loading.models.global,
  }),
)(IndexPage);
