import { Modal, Input, Tooltip, message, Popconfirm } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import DelIcon from '../../assets/chat/del.png';
import EditIcon from '../../assets/chat/edit.png';
import styles from './index.less';
import { ChangeEvent, useState } from 'react';
import {
  createProject,
  getProjects,
  updateProject,
  delProject,
} from '@/services/api';
import { useDispatch, useSelector } from 'umi';
import moment from 'moment';
import { TrackInfo } from '@/models/global';

const TopLeftBar = () => {
  const [newFlag, setNewFlag] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [joinInputValue, setJoinInputValue] = useState('');
  const [createInputValue, setCreateInputValue] = useState('');
  const [updatingProject, setUpdatingProject] = useState<{
    name: string;
    id: string;
  }>({ name: '', id: '' });
  const [joinedProjects, setJoinedProjects] = useState<Array<API.ProjectType>>(
    [],
  );
  const [createdProjects, setCreatedProjects] = useState<
    Array<API.ProjectType>
  >([]);
  const dispatch = useDispatch();

  const currentProject: { name: string; id: string } = useSelector(
    (state: any) => state.global.project,
  );

  const createNewProject = async () => {
    if (!projectName) {
      message.warning('Please input Project name');
      return;
    }
    const res = await createProject(projectName);
    if (res.code === 0) {
      const { name, _id } = res.data.result;
      message.success('Create project success');
      setProjectName('');
      setNewFlag(false);
      // dispatch({
      //   type: 'global/save',
      //   payload: {
      //     project: {
      //       name,
      //       id:_id
      //     },
      //   },
      // })
    }
  };

  const confirmToDel = (id: string) => {
    delProject(id).then((res) => {
      if (res.code === 0) {
        message.success('remove success').then();
        pullListForOwn();
      }
    });
  };

  const updateProjectNameFun = async () => {
    if (!updatingProject.name) {
      message.warning('Please input Project name');
      return;
    }
    updateProject(updatingProject.id, updatingProject.name).then((res) => {
      if (res.code === 0) {
        if (currentProject.id === updatingProject.id) {
          dispatch({
            type: 'global/save',
            payload: {
              project: {
                name: updatingProject.name,
                id: updatingProject.id,
              },
            },
          });
        }

        setUpdatingProject({ name: '', id: '' });
      }
    });
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setProjectName(value);
  };

  const updateProjectName = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUpdatingProject((project) => {
      return { ...project, name: value };
    });
  };
  const onJoinInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setJoinInputValue(value);
  };
  const onOwnInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCreateInputValue(value);
  };
  const pullListForMember = () => {
    getProjects('member').then((res) => {
      const data = res.data.result;
      setJoinedProjects(data);
    });
  };
  const pullListForOwn = () => {
    getProjects('owner').then((res) => {
      const data = res.data.result;
      setCreatedProjects(data);
    });
  };

  const selectProject = (
    id: string,
    name: string,
    tracks: Array<TrackInfo>,
  ) => {
    dispatch({
      type: 'global/save',
      payload: {
        project: {
          name,
          id,
        },
        currentTracks: tracks || [],
      },
    });
  };
  const JoinContent = (
    <div className={styles.project}>
      <p className={styles.search}>
        <Input
          placeholder="Search"
          value={joinInputValue}
          onChange={(e) => onJoinInputChange(e)}
          prefix={<SearchOutlined />}
        />
      </p>
      <div className={[styles.projectItems, 'customScroll'].join(' ')}>
        {joinedProjects
          .filter((p) => {
            return !p.deleted && p.name.indexOf(joinInputValue) > -1;
          })
          .map((p) => {
            return (
              <section
                key={p._id}
                onClick={(e) => {
                  e.stopPropagation();
                  selectProject(p._id, p.name, p.tracks);
                }}
              >
                <div className={styles.content}>
                  <div className={styles.projectName}>{p.name}</div>
                  <div className={styles.members}>members:</div>
                  <div className={styles.time}>
                    {moment(p.updatedAt).format('YYYY-MM-DD , hh:mm:ss')}
                  </div>
                </div>
                <div className={styles.options}>
                  <img
                    src={EditIcon}
                    alt={'edit'}
                    onClick={() => {
                      setUpdatingProject({ name: p.name, id: p._id });
                    }}
                  />
                </div>
              </section>
            );
          })}
      </div>
    </div>
  );

  const ownContent = (
    <div className={styles.project}>
      <p className={styles.search}>
        <Input
          placeholder="Search"
          value={createInputValue}
          onChange={(e) => onOwnInputChange(e)}
          prefix={<SearchOutlined />}
        />
      </p>
      <div className={[styles.projectItems, 'customScroll'].join(' ')}>
        {createdProjects
          .filter((p) => {
            return !p.deleted && p.name.indexOf(createInputValue) > -1;
          })
          .map((p) => {
            return (
              <section
                key={p._id}
                onClick={() => {
                  selectProject(p._id, p.name, p.tracks);
                }}
              >
                <div className={styles.content}>
                  <div className={styles.projectName}>{p.name}</div>
                  <div className={styles.members}>members:</div>
                  <div className={styles.time}>
                    {moment(p.updatedAt).format('YYYY-MM-DD , hh:mm:ss')}
                  </div>
                </div>
                <div className={styles.options}>
                  <img
                    src={EditIcon}
                    alt={'edit'}
                    onClick={(e) => {
                      e.stopPropagation();
                      setUpdatingProject({ name: p.name, id: p._id });
                    }}
                  />
                  {p._id !== currentProject.id && (
                    <span onClick={(e) => e.stopPropagation()}>
                      <Popconfirm
                        title="Are you sure to delete this project?"
                        onConfirm={() => confirmToDel(p._id)}
                        okText="Yes"
                        cancelText="No"
                      >
                        <img src={DelIcon} alt={'del'} />
                      </Popconfirm>
                    </span>
                  )}
                </div>
              </section>
            );
          })}
      </div>
    </div>
  );
  return (
    <div className={styles.menu}>
      <ul>
        <li>
          <Tooltip
            overlay={ownContent}
            placement="bottomLeft"
            trigger="click"
            color={'#000000'}
            overlayStyle={{
              width: '320px',
              maxWidth: '320px',
              left: '16px',
            }}
            overlayInnerStyle={{
              padding: 0,
            }}
          >
            <span
              style={{ display: 'inline-block', width: '100%', height: '47px' }}
              onClick={pullListForOwn}
            >
              My Band
            </span>
          </Tooltip>
        </li>
        <li>
          <Tooltip
            overlay={JoinContent}
            placement="bottomLeft"
            trigger="click"
            color={'#000000'}
            overlayStyle={{
              width: '320px',
              maxWidth: '320px',
              left: '16px',
            }}
            overlayInnerStyle={{
              padding: 0,
            }}
          >
            <span
              style={{ display: 'inline-block', width: '100%', height: '47px' }}
              onClick={pullListForMember}
            >
              Band‘s Music
            </span>
          </Tooltip>
        </li>
        <li onClick={() => setNewFlag(true)}>New</li>
      </ul>
      <Modal
        style={{
          top: '30%',
        }}
        width={496}
        title=""
        visible={newFlag}
        closable={false}
        bodyStyle={{
          background: '#1B1C1D',
          color: 'white',
          padding: 0,
        }}
        footer={null}
      >
        <header className={styles.header}>Create new project</header>
        <div className={styles.body}>
          <div style={{ textAlign: 'center' }}>
            <Input
              value={projectName}
              style={{
                width: '400px',
                background: '#323436',
                borderColor: 'transparent',
                color: 'rgba(255, 255, 255, 0.3)',
              }}
              onChange={(e) => onInputChange(e)}
              placeholder="Project Name"
            />
          </div>
          <div className={styles.footer}>
            <a className={styles.cancel} onClick={() => setNewFlag(false)}>
              Cancel
            </a>
            <a className={styles.create} onClick={createNewProject}>
              Create
            </a>
          </div>
        </div>
      </Modal>
      <Modal
        style={{
          top: '30%',
        }}
        width={496}
        title=""
        visible={!!updatingProject.id}
        closable={false}
        bodyStyle={{
          background: '#1B1C1D',
          color: 'white',
          padding: 0,
        }}
        footer={null}
      >
        <header className={styles.header}>Update project's name</header>
        <div className={styles.body}>
          <div style={{ textAlign: 'center' }}>
            <Input
              value={updatingProject.name}
              style={{
                width: '400px',
                background: '#323436',
                borderColor: 'transparent',
                color: 'rgba(255, 255, 255, 0.3)',
              }}
              onChange={(e) => updateProjectName(e)}
              placeholder="Project Name"
            />
          </div>
          <div className={styles.footer}>
            <a
              className={styles.cancel}
              onClick={() => setUpdatingProject({ name: '', id: '' })}
            >
              Cancel
            </a>
            <a className={styles.create} onClick={updateProjectNameFun}>
              update
            </a>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TopLeftBar;
