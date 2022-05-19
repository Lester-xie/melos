import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Button, notification } from 'antd';
import EventEmitter from 'events';
//@ts-ignore
import WaveformPlaylist from '../../waveform-playlist/src/app.js';
import * as Tone from 'tone';
import { saveAs } from 'file-saver';
import { message, Spin } from 'antd';
import { cloneDeep } from 'lodash';
import styles from './index.less';
import { PlusOutlined, SwapOutlined, UndoOutlined } from '@ant-design/icons';
import Resource from '@/components/resource';
import TrackList from '@/components/trackList';
import { io } from 'socket.io-client';
import { connect } from 'umi';
import { debouncePushAction, getMemberList } from '@/services/api';
import { GlobalModelState } from '@/models/global';
import { ConnectProps } from '@@/plugin-dva/connect';

interface Props extends ConnectProps {
  token: string | null;
  downloadStatus: boolean;
  onDownload: () => void;
  global: GlobalModelState;
  location: any;
  history: any;
  route: any;
}

type State = 'cursor' | 'select';

const Workspace = ({
  token,
  downloadStatus,
  onDownload,
  dispatch,
  global,
}: Props) => {
  const [ee] = useState(new EventEmitter());
  const [toneCtx, setToneCtx] = useState<any>(null);
  const setUpChain = useRef();

  const [showResource, setShowResource] = useState(false);
  const [trackList, setTrackList] = useState<any[]>([]);
  const [state, setState] = useState<State>('cursor');
  const [playContext, setPlayContext] = useState<any>(null);
  const [isNoneState, setIsNoneState] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  const [showLoading, setShowLoading] = useState(false);
  const {
    project: currentProject,
    userRoleInCurrentProject,
    currentTracks,
  } = global;

  const onFileSelect = (file: any) => {
    setIsNoneState(false);
    playContext.load([file]).then(() => {
      setTrackList([...playContext.tracks]);
      dispatch?.({
        type: 'global/update',
        payload: {
          currentTracks: [
            ...currentTracks,
            {
              src: file.src,
              name: file.name,
              mute: false,
              solo: false,
              gain: 1,
              stereoPan: 0,
              copy: null,
              cut: null,
              startTime: 0,
              assetId: file.assetId,
            },
          ],
        },
      });
    });
    debouncePushAction(currentProject.id, 'addTrack', file);
  };

  useEffect(() => {
    setToneCtx(Tone.getContext());
  }, []);

  useEffect(() => {
    if (trackList.length === 0 && currentTracks.length > 0) {
      playContext.load(currentTracks).then(() => {
        currentTracks.forEach((item: any, index: number) => {
          if (item.mute) {
            ee.emit('mute', playContext.tracks[index]);
          }
          if (item.solo) {
            ee.emit('solo', playContext.tracks[index]);
          }
          if (item.startTime > 0) {
            ee.emit('shift', item.startTime, playContext.tracks[index], 'auto');
            ee.emit('statechange', 'select');
          }
          if (item.cut && item.cut.length > 0) {
            item.cut.forEach((i: { start: number; end: number }) => {
              ee.emit('cut', i.start, i.end, index);
            });
          }
          if (item.copy && item.copy.length > 0) {
            item.copy.forEach(
              (i: {
                start: number;
                end: number;
                position: number;
                targetTrackIndex: number;
              }) => {
                ee.emit(
                  'autoPaste',
                  i.start,
                  i.end,
                  i.position,
                  index,
                  i.targetTrackIndex,
                );
              },
            );
          }
        });
        setTrackList([...playContext.tracks]);
      });
    }
  }, [currentTracks]);

  const container = useCallback(
    (node) => {
      if (node !== null && toneCtx !== null) {
        const playlist = WaveformPlaylist(
          {
            ac: toneCtx.rawContext,
            waveHeight: 158,
            container: node,
            timescale: true,
            state: 'select',
            exclSolo: true,
            colors: {
              waveOutlineColor: '#2f2f2f',
            },
            controls: {
              show: false,
            },
          },
          ee,
        );

        ee.on('audiorenderingstarting', function (offlineCtx, a) {
          // Set Tone offline to render effects properly.
          const offlineContext = new Tone.OfflineContext(offlineCtx);
          Tone.setContext(offlineContext);
          setUpChain.current = a;
        });

        ee.on('audiorenderingfinished', function (type, data) {
          //restore original ctx for further use.
          Tone.setContext(toneCtx);
          if (type === 'wav') {
            saveAs(data, 'test.wav');
          }
        });

        ee.on('audiosourcesloaded', function () {
          setShowLoading(false);
        });

        ee.on('audiosourcesstartload', (trackList) => {
          setShowLoading(true);
        });

        playlist.load(trackList).then(() => {
          setPlayContext(playlist);
        });

        //initialize the WAV exporter.
        playlist.initExporter();
      }
    },
    [ee, toneCtx],
  );

  const onPlayBtnClicked = () => {
    ee.emit('play');
  };

  const onPauseBtnClicked = () => {
    ee.emit('pause');
  };

  const onMuteBtnClicked = useCallback(
    (type: 'auto' | 'manual') => {
      const cloneCurrentTracks = cloneDeep(currentTracks);
      const clonePlayContextTracks = cloneDeep(playContext.tracks);
      const allTracksIsMute = currentTracks.every((item) => item.mute);
      if (allTracksIsMute) {
        currentTracks.forEach((item, index) => {
          cloneCurrentTracks[index].mute = false;
          ee.emit('mute', playContext.tracks[index]);
        });
      } else {
        currentTracks.forEach((item, index) => {
          if (!item.mute) {
            cloneCurrentTracks[index].mute = true;
            ee.emit('mute', playContext.tracks[index]);
          }
        });
      }
      dispatch?.({
        type: 'global/update',
        payload: {
          currentTracks: [...cloneCurrentTracks],
        },
      });
      setTrackList([...clonePlayContextTracks]);
      if (type === 'manual') {
        debouncePushAction(currentProject.id, 'muteAllTracks');
      }
    },
    [currentTracks, playContext],
  );

  const onStopBtnClicked = () => {
    ee.emit('stop');
  };

  const onCursorBtnClicked = () => {
    setState('cursor');
    ee.emit('statechange', 'select');
  };

  const onSwapBtnClicked = () => {
    setState('select');
    ee.emit('statechange', 'shift');
  };

  const onTrimBtnClicked = () => {
    ee.emit('trim', 'manual');
  };

  const onDownloadBtnClicked = () => {
    if (playContext && playContext.tracks.length > 0) {
      ee.emit('startaudiorendering', 'wav');
    }
  };

  useEffect(() => {
    if (downloadStatus) {
      onDownloadBtnClicked();
      onDownload();
    }
  }, [downloadStatus]);

  const onAddBtnClicked = () => {
    if (currentProject?.id) {
      setShowResource(true);
    }
  };

  const onDeleteClicked = (index: number) => {
    ee.emit('removeTrack', playContext.tracks[index]);
    setTrackList([...playContext.tracks]);
    setIsNoneState(playContext.tracks.length === 0);
    const tracks = cloneDeep(currentTracks);
    tracks.splice(index, 1);
    dispatch?.({
      type: 'global/update',
      payload: {
        currentTracks: [...tracks],
      },
    });
    debouncePushAction(currentProject.id, 'removeTrack', { index });
  };

  const onCopyBtnClicked = () => {
    console.log('copy...');
    ee.emit('copy');
  };

  const onPasteBtnClicked = () => {
    console.log('paste...');
    ee.emit('paste');
  };

  const joinRoom = (projectId: string, projectName: string, key: string) => {
    notification.close(key);
    dispatch?.({
      type: 'global/save',
      payload: {
        project: { id: projectId, name: projectName },
      },
    });
  };

  const openNotification = (projectId: string, projectName: string) => {
    const key = `open${Date.now()}`;
    const btn = (
      <Button
        type="primary"
        size="small"
        onClick={() => joinRoom(projectId, projectName, key)}
      >
        Join
      </Button>
    );
    notification.open({
      message: 'Audio meeting Apply',
      description: 'Invite you join Project,join Now?',
      btn,
      key,
      duration: null,
    });
  };

  useEffect(() => {
    if (token) {
      socket?.disconnect();
      dispatch?.({
        type: 'global/save',
        payload: { socketConnectSuccess: false },
      });
      setSocket(io(`https://www.metaapp.fun?token=${token}`));
      // 广播一条消息，告诉别人我已经上线
      // noticeOnline(user.id).then()
    }
  }, [token]);

  useEffect(() => {
    if (socket && playContext) {
      socket.removeAllListeners();
      socket.on('action', (arg: any) => {
        if (arg.event === 'user:online') {
          const { id } = arg.extraBody;
          if (id) {
            let userSet = new Set(global.socketOnlineUserIds);
            userSet.add(id);
            dispatch?.({
              type: 'global/save',
              payload: { socketOnlineUserIds: Array.from(userSet) },
            });
          }
          return;
        }
        if (arg.event === 'user:offline') {
          console.log('user offline...');
          const { id } = arg.extraBody;
          if (id) {
            let onlineUserIds = [...global.socketOnlineUserIds].filter(
              (userId) => userId !== id,
            );
            dispatch?.({
              type: 'global/save',
              payload: { socketOnlineUserIds: onlineUserIds },
            });
          }
          return;
        }
        if (arg.event === 'memberChanged') {
          const { projectId } = arg.extraBody;
          if (projectId === global.project.id) {
            getMemberList(projectId).then((c) => {
              if (c.code === 0) {
                dispatch?.({
                  type: 'global/save',
                  payload: {
                    memberList: c.data.result,
                  },
                });
              }
            });
          }
          return;
        }
        if (arg.event === 'inviteMemberJoinRoom') {
          const { projectId, userId, projectName } = arg.extraBody;
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          if (userId !== user.id) {
            return;
          }
          if (projectId !== global.project.id) {
            openNotification(projectId, projectName);
          }
          return;
        }
        const projectId = arg.project;
        if (projectId === currentProject.id) {
          const { type, token: actionToken, data } = arg.extraBody;
          const localStorageToken = window.localStorage.getItem('token');
          if (actionToken && actionToken !== localStorageToken) {
            switch (type) {
              // 新增音频
              case 'addTrack': {
                playContext.load([data]).then(() => {
                  setTrackList([...playContext.tracks]);
                  setIsNoneState(playContext.tracks.length === 0);
                  dispatch?.({ type: 'global/addTrack', data });
                });
                break;
              }
              // 移除音频
              case 'removeTrack': {
                ee.emit('removeTrack', playContext.tracks[data.index]);
                setTrackList([...playContext.tracks]);
                setIsNoneState(playContext.tracks.length === 0);
                dispatch?.({ type: 'global/removeTrack', index: data.index });
                break;
              }
              // 音量改变
              case 'changeVolume': {
                ee.emit('volumechange', data.value, trackList[data.index]);
                const newTrackList = cloneDeep(trackList);
                newTrackList[data.index].gain = data.value / 100;
                setTrackList([...newTrackList]);
                break;
              }
              // 左右声道改变
              case 'changeStereopan': {
                ee.emit('stereopan', data.value, trackList[data.index]);
                const newTrackList = cloneDeep(trackList);
                newTrackList[data.index].stereoPan = data.value / 100;
                setTrackList([...newTrackList]);
                break;
              }
              // 静音切换
              case 'changeMute': {
                ee.emit('mute', playContext.tracks[data.index]);
                setTrackList([...cloneDeep(playContext.tracks)]);
                break;
              }
              // solo 切换
              case 'changeSolo': {
                ee.emit('solo', playContext.tracks[data.index]);
                break;
              }
              // 更改项目名称
              case 'changeProjectName': {
                dispatch?.({
                  type: 'global/save',
                  payload: {
                    project: {
                      name: data.value,
                      id: currentProject.id,
                    },
                  },
                });
                break;
              }
              // 移动音轨
              case 'changeShift': {
                ee.emit(
                  'shift',
                  data.value - trackList[data.index].startTime,
                  playContext.tracks[data.index],
                  'auto',
                );
                break;
              }
              // 剪辑音轨
              case 'changeCut': {
                ee.emit('cut', data.start, data.end, data.index);
                break;
              }
              // 复制音轨
              case 'changeCopy': {
                ee.emit(
                  'autoPaste',
                  data.start,
                  data.end,
                  data.position,
                  data.index,
                  data.targetTrackIndex,
                );
                break;
              }
              // 静音所有音轨
              case 'muteAllTracks': {
                onMuteBtnClicked('auto');
                break;
              }
            }
            message.success('Sync succeeded');
          }
        }
      });

      socket.on('connect', () => {
        dispatch?.({
          type: 'global/save',
          payload: { socketConnectSuccess: true },
        });
      });
    }
  }, [socket, playContext, trackList, currentProject, currentTracks]);

  return (
    <div className={styles.container}>
      <div className={styles.operationWrap}>
        <div className={styles.left}>
          <button
            className={`${styles.btnAdd} ${
              !currentProject?.id ? styles.disabled : ''
            }`}
            onClick={onAddBtnClicked}
          >
            <PlusOutlined />
          </button>
        </div>
        <div className={styles.right}>
          <div className={styles.trackTransport}>
            <button onClick={onStopBtnClicked} className={styles.stopBtn} />
            <button onClick={onPlayBtnClicked} className={styles.playBtn} />
            <button onClick={onPauseBtnClicked} className={styles.pauseBtn} />
            <button onClick={() => onMuteBtnClicked('manual')}>
              <img
                src={require('@/assets/workshop/mute.png')}
                alt="mute"
                className={styles.muteIcon}
              />
            </button>
          </div>
          <div className={styles.trackTransport}>
            <button
              onClick={onCursorBtnClicked}
              className={state === 'cursor' ? styles.activeState : ''}
            >
              <img
                src={require('@/assets/workshop/cursor.png')}
                alt="cursor"
                className={styles.cursorIcon}
              />
            </button>
            <button
              onClick={onSwapBtnClicked}
              className={state === 'select' ? styles.activeState : ''}
            >
              <SwapOutlined />
            </button>
            <button className={styles.copyBtn} onClick={onCopyBtnClicked} />
            <button className={styles.pasteBtn} onClick={onPasteBtnClicked} />
            <button className={styles.cutBtn} onClick={onTrimBtnClicked} />
            <button>
              <UndoOutlined />
            </button>
          </div>
        </div>
      </div>
      <div className={styles.resourceWrap}>
        <div>
          <Resource
            show={showResource}
            onClose={() => setShowResource(false)}
            onSelect={onFileSelect}
          />
          <TrackList tracks={trackList} onDeleteClicked={onDeleteClicked} />
        </div>
        <div className={styles.trackContainer}>
          <div className={styles.trackWrap}>
            <div
              ref={container}
              className={`${styles.trackList} ${
                !isNoneState ? styles.visible : ''
              }`}
            />
            {showLoading && (
              <div className={styles.loadMask}>
                <Spin size="large" tip="Loading" />
              </div>
            )}
          </div>
        </div>
      </div>
      {userRoleInCurrentProject === 'guest' && <div className={styles.mask} />}
    </div>
  );
};

export default connect(({ global }: { global: GlobalModelState }) => ({
  global,
}))(Workspace);
