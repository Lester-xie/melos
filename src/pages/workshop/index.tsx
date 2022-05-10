import styles from './index.less';
import TopLeftBar from '@/components/topLeftBar';
import Chat from '@/components/chat';
import Workspace from '@/components/workspace';
import { FC, useState } from 'react';
import { Login, updateProjectNameAPI } from '@/services/api';
import { GlobalModelState, ConnectProps, Loading, connect } from 'umi';
import { Input, message, Popover } from 'antd';
const { Search } = Input;
interface IndexProps extends ConnectProps {
  global: GlobalModelState;
  loading: boolean;
}

const IndexPage: FC<IndexProps> = ({ global, dispatch }) => {
  const [activeUser, setActiveUser] = useState('');
  const [projectNameFlag, setProjectNameFlag] = useState(false);
  const { project: currentProject } = global;
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
      }
    });
  };

  const changeProjectNameFlagChange = (v: boolean) => {
    if (!currentProject.name) {
      return;
    }
    setProjectNameFlag(v);
  };

  const onProjectNameEdit = (value: string) => {
    if (!value) return;
    updateProjectNameAPI(currentProject.id, value).then((res) => {
      if (res.code === 0) {
        setProjectNameFlag(false);
        message.success('Update success').then();
        dispatch?.({
          type: 'global/save',
          payload: {
            project: {
              name: value,
              id: currentProject.id,
            },
          },
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
              className={activeUser === 'Lester' ? styles.active : null}
              onClick={() => onBtnClicked('Lester')}
            >
              Lester
            </button>
            <button
              className={activeUser === 'David' ? styles.active : null}
              onClick={() => onBtnClicked('David')}
            >
              David
            </button>
          </div>
          <button className={styles.mint}>Mint NFT</button>
        </div>
      </header>
      {/*<div className={styles.projectName}>{currentProject.name||'Please create new project'}</div>*/}
      <div className={styles.projectName}>
        <Popover
          content={
            <Search
              placeholder="project name"
              style={{ width: 200 }}
              defaultValue={currentProject.name}
              onSearch={onProjectNameEdit}
              enterButton={'Send'}
            />
          }
          title="Change project Name"
          trigger="click"
          visible={projectNameFlag}
          onVisibleChange={(v) => {
            changeProjectNameFlagChange(v);
          }}
        >
          {currentProject.name || 'Please select one project'}
        </Popover>
      </div>
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
