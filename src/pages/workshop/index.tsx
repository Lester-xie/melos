import styles from './index.less';
import TopLeftBar from '@/components/topLeftBar';
import Chat from '@/components/chat';
import Workspace from '@/components/workspace';
import { FC, useEffect, useRef, useState } from 'react';
import { debouncePushAction, Login, updateProject } from '@/services/api';
import { GlobalModelState, ConnectProps, Loading, connect } from 'umi';
import { Input, message, Popover } from 'antd';
import { UserInfo } from '@/models/global';
const { Search } = Input;
interface IndexProps extends ConnectProps {
  global: GlobalModelState;
  loading: boolean;
}

const IndexPage: FC<IndexProps> = ({ global, dispatch }) => {
  const [activeUser, setActiveUser] = useState('');
  const [projectNameFlag, setProjectNameFlag] = useState(false);
  const {
    project: currentProject,
    userRoleInCurrentProject,
    socketConnectSuccess,
  } = global;
  const [token, setToken] = useState(window.localStorage.getItem('token'));
  const [downloadStatus, setDownloadStatus] = useState(false);
  const onBtnClicked = (name: string) => {
    setActiveUser(name);
    Login(name).then((res: any) => {
      if (res.code === 0) {
        setToken(res.data.token);
        window.localStorage.setItem('token', res.data.token);
        const user = {
          name: res.data.name,
          id: res.data._id,
          avatar: res.data?.avatar?.url,
        };
        const stringifyUser = JSON.stringify(user);
        window.localStorage.setItem('user', stringifyUser);
        dispatch?.({
          type: 'global/save',
          payload: {
            userInfo: user,
          },
        });
      }
    });
  };

  useEffect(() => {
    const userInfoString = localStorage.getItem('user');
    if (userInfoString) {
      const userInfo: UserInfo = JSON.parse(userInfoString);
      setActiveUser(userInfo.name);
      dispatch?.({
        type: 'global/save',
        payload: { userInfo },
      });
    }
  }, [dispatch]);

  const changeProjectNameFlagChange = (v: boolean) => {
    if (!currentProject.name) {
      return;
    }
    setProjectNameFlag(v);
  };

  const onProjectNameEdit = (value: string) => {
    if (!value) return;
    updateProject(currentProject.id, value).then((res) => {
      if (res.code === 0) {
        setProjectNameFlag(false);
        message.success('Update success');
        debouncePushAction(currentProject.id, 'changeProjectName', { value });
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
              className={activeUser === 'Jerry' ? styles.active : null}
              onClick={() => onBtnClicked('Jerry')}
            >
              Jerry
            </button>
            {socketConnectSuccess ? (
              <span className={styles.successful} />
            ) : (
              <span className={styles.failed} />
            )}
          </div>
          <button
            className={styles.mint}
            onClick={() => setDownloadStatus(true)}
          >
            Mint NFT
          </button>
        </div>
      </header>
      <div className={styles.projectName}>
        {userRoleInCurrentProject === 'guest' ? (
          <span className={styles.name}>{currentProject.name}</span>
        ) : (
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
        )}
      </div>
      <main>
        <Chat />
        <Workspace
          token={token}
          downloadStatus={downloadStatus}
          onDownload={() => setDownloadStatus(false)}
          location={null}
          history={null}
          route={null}
        />
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
