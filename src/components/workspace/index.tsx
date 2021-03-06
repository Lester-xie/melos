import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Button, notification } from 'antd';
import EventEmitter from 'events';
//@ts-ignore
import WaveformPlaylist from '../../waveform-playlist/src/app.js';
import * as Tone from 'tone';
import { saveAs } from 'file-saver';
import { message, Spin } from 'antd';
import { cloneDeep, throttle } from 'lodash';
import styles from './index.less';
import {
  PlusOutlined,
  SwapOutlined,
  UndoOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import Resource from '@/components/resource';
import TrackList from '@/components/trackList';
import { io } from 'socket.io-client';
import { connect } from 'umi';
import { debouncePushAction, noticeRTCStatusChange } from '@/services/api';
import { GlobalModelState, isInitTrack, TrackInfo } from '@/models/global';
import { ConnectProps } from '@@/plugin-dva/connect';
import ConfirmModal from '@/components/ConfirmModal';

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
  const [clearModalVisible, setClearModalVisible] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [resetDisabled, setResetDisabled] = useState(true);
  const {
    project: currentProject,
    userRoleInCurrentProject,
    currentTracks,
    revocationList,
    userInfo,
  } = global;

  const recordRef = useRef<API.messageRecord[]>([]);
  const resourceWrapRef = useRef(null);

  const onFileSelect = (file: any) => {
    setIsNoneState(false);
    playContext
      .load([file])
      .then(() => {
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
                userId: userInfo?.id,
              },
            ],
          },
        });
      })
      .then(() => {
        // @ts-ignore
        resourceWrapRef.current.scrollTop =
          resourceWrapRef.current.scrollHeight;
      });
    file.userId = userInfo?.id;
    debouncePushAction(currentProject.id, 'addTrack', file);
  };

  useEffect(() => {
    if (currentTracks.length > 0) {
      setResetDisabled(currentTracks.every((item) => isInitTrack(item)));
    } else {
      setResetDisabled(true);
    }
  }, [currentTracks]);

  useEffect(() => {
    setToneCtx(Tone.getContext());
  }, []);

  const handleInit = (item: any, index: number) => {
    if (item.mute) {
      ee.emit('mute', playContext.tracks[index]);
    }
    if (item.solo) {
      ee.emit('solo', playContext.tracks[index]);
    }
    if (item.startTime > 0) {
      ee.emit('shift', item.startTime, playContext.tracks[index]);
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
          copiedIndex: number;
          targetTrackIndex: number;
        }) => {
          ee.emit(
            'autoPaste',
            i.start,
            i.end,
            i.position,
            i.copiedIndex,
            index,
          );
        },
      );
    }
  };
  // ?????????
  const reloadPlayer = useCallback(
    throttle(() => {
      playContext.load(currentTracks).then(() => {
        currentTracks.forEach((item: any, index: number) => {
          handleInit(item, index);
        });
        setTrackList([...playContext.tracks]);
      });
    }, 5000),
    [currentTracks, playContext],
  );

  useEffect(() => {
    if (currentProject.id) {
      ee.emit('clear');
      setTrackList([]);
      reloadPlayer();
    }
  }, [currentProject]);

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

        ee.on('audiosourcesstartload', () => {
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

  useEffect(() => {
    if (ee && playContext && currentProject.id) {
      ee.on('reloadfinished', (trackIndex) => {
        dispatch?.({
          type: 'global/updateRow',
          attr: 'reloadTrack',
          index: trackIndex,
        });
        setTrackList([...playContext.tracks]);
        debouncePushAction(currentProject.id, 'reloadTrack', {
          index: trackIndex,
        });
      });
    }
  }, [ee, playContext, currentProject]);

  const onPlayBtnClicked = () => {
    ee.emit('play');
  };

  const onPauseBtnClicked = () => {
    ee.emit('pause');
  };

  const onMuteBtnClicked = useCallback(
    (type: 'auto' | 'manual') => {
      if (currentTracks.length > 0) {
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
    ee.emit('trim');
  };

  const onRevokeClicked = useCallback(
    (index: number | null, callback: () => void) => {
      if (revocationList.length > 0) {
        const cloneRevocationList = cloneDeep(revocationList);
        const cloneCurrentTracks = cloneDeep(currentTracks);
        let prevAction: any = null;
        if (index !== null) {
          let findIndex = -1;
          cloneRevocationList.forEach((item: any, i: number) => {
            if (item.targetIndex === index) {
              findIndex = i;
            }
          });
          if (findIndex === -1) {
            return;
          }
          prevAction = cloneRevocationList.splice(findIndex, 1)[0];
        } else {
          prevAction = cloneRevocationList.pop();
        }
        const optionName = prevAction.name;
        switch (optionName) {
          case 'shift': {
            ee.emit(
              'shift',
              -(prevAction.currentStartTime - prevAction.prevStartTime),
              playContext.tracks[prevAction.targetIndex],
            );
            cloneCurrentTracks[prevAction.targetIndex].startTime =
              prevAction.prevStartTime;
            dispatch?.({
              type: 'global/update',
              payload: {
                currentTracks: [...cloneCurrentTracks],
                revocationList: [...cloneRevocationList],
              },
            });
            debouncePushAction(currentProject.id, 'changeShift', {
              value: prevAction.prevStartTime,
              index: prevAction.targetIndex,
            });
            break;
          }
          case 'cut':
          case 'copy': {
            if (index === null) {
              setRevokeLoading(true);
            }

            const cloneData = cloneDeep(
              cloneCurrentTracks[prevAction.targetIndex][optionName],
            );
            cloneData.pop();
            cloneCurrentTracks[prevAction.targetIndex][optionName] = [
              ...cloneData,
            ];
            console.log(cloneCurrentTracks);
            dispatch?.({
              type: 'global/update',
              payload: {
                currentTracks: [...cloneCurrentTracks],
                revocationList: [...cloneRevocationList],
              },
            });
            ee.emit(
              'reload',
              trackList[prevAction.targetIndex],
              prevAction.targetIndex,
              'auto',
              () => {
                cloneCurrentTracks.forEach((item: any, index: number) => {
                  if (index === prevAction.targetIndex) {
                    handleInit(item, index);
                  }
                });
                setTrackList([...playContext.tracks]);
                callback();
              },
            );
            debouncePushAction(currentProject.id, 'revoke', {
              value: optionName,
              index: prevAction.targetIndex,
            });
          }
        }
      }
    },
    [revocationList, playContext, currentTracks],
  );

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

  const onSimpleRevokeClicked = (index: number, callback: any) => {
    onRevokeClicked(index, callback);
  };

  const onCopyBtnClicked = () => {
    console.log('copy...');
    ee.emit('copy');
  };

  const onPasteBtnClicked = () => {
    console.log('paste...');
    ee.emit('paste');
  };

  const joinRoom = (
    projectId: string,
    projectName: string,
    key: string,
    currentTracks: Array<TrackInfo>,
  ) => {
    notification.close(key);
    dispatch?.({
      type: 'global/save',
      payload: {
        project: { id: projectId, name: projectName },
        roomId: `${global.project.id}-audio-room`,
        currentTracks,
      },
    });
  };

  const openNotification = (
    projectId: string,
    projectName: string,
    currentTracks: Array<TrackInfo>,
  ) => {
    const key = `open${Date.now()}`;
    const btn = (
      <Button
        type="primary"
        size="small"
        onClick={() => joinRoom(projectId, projectName, key, currentTracks)}
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

  const onConfirmResetAllTracks = useCallback(
    (type: 'auto' | 'manual') => {
      const newTracks = currentTracks.map((item: any) => {
        return {
          src: item.src,
          name: item.name,
          mute: false,
          solo: false,
          gain: 1,
          stereoPan: 0,
          copy: [],
          cut: [],
          startTime: 0,
          assetId: item.assetId,
          userId: item.userId,
        };
      });
      setClearModalVisible(false);
      ee.emit('resetAll');
      dispatch?.({
        type: 'global/update',
        payload: {
          currentTracks: [...newTracks],
          revocationList: [],
        },
      });
      setTrackList([...playContext.tracks]);
      if (type === 'manual') {
        debouncePushAction(currentProject.id, 'restoreAllTracks');
      }
    },
    [currentTracks, playContext],
  );
  const receiveMsgCallback = useCallback(
    (event: any) => {
      const { id, content, projectId, userId, name } = event.extraBody;
      // ????????????
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      if (userId === user.id) return;
      // ?????????????????????????????????
      if (projectId !== global.project.id) return;

      // ??????chatRecord??????
      dispatch?.({
        type: 'global/save',
        payload: {
          chatRecord: [
            ...recordRef.current,
            { id, content, isSelf: false, userId, name },
          ],
        },
      });
    },
    [recordRef, global.project],
  );
  useEffect(() => {
    recordRef.current = global.chatRecord;
  }, [global.chatRecord]);

  useEffect(() => {
    if (token) {
      socket?.disconnect();
      dispatch?.({
        type: 'global/save',
        payload: { socketConnectSuccess: false },
      });
      setSocket(io(`https://www.metaapp.fun?token=${token}`));
      // ????????????????????????????????????????????????
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
        if (arg.event === 'sendMessage') {
          console.log(arg.extraBody);
          receiveMsgCallback(arg);
          return;
        }
        if (arg.event === 'memberChanged') {
          const { projectId } = arg.extraBody;
          if (projectId === global.project.id) {
            // dva effect
            dispatch?.({
              type: 'global/updateMemberList',
              payload: projectId,
            });
            const user = JSON.parse(localStorage.getItem('user') || '{}');
          }
          return;
        }
        if (arg.event === 'inviteMemberJoinRoom') {
          const { projectId, userId, projectName, currentTracks } =
            arg.extraBody;
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          if (userId !== user.id) {
            return;
          }
          openNotification(projectId, projectName, currentTracks);
          return;
        }
        if (arg.event === 'rtcStatusSync') {
          // ????????????rtc????????????
          const { projectId } = arg.extraBody;
          if (projectId !== global.project.id) {
            return;
          }
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          noticeRTCStatusChange(
            user.id,
            projectId,
            !!global.roomId,
            global.muteMembersIds.includes(user.id),
          ).then();
        }

        if (arg.event === 'rtcStatusChange') {
          // ?????????rtc????????????
          const { isConnected, isMute, userId, projectId } = arg.extraBody;
          if (projectId !== global.project.id) {
            return;
          }
          const memberSet = new Set(global.onlineMemberIds);
          const muteSet = new Set(global.muteMembersIds);
          if (!isConnected) {
            memberSet.delete(userId);
          } else {
            memberSet.add(userId);
          }

          if (isMute) {
            muteSet.add(userId);
          } else {
            muteSet.delete(userId);
          }

          dispatch?.({
            type: 'global/save',
            payload: {
              roomId:
                !isConnected &&
                JSON.parse(localStorage.getItem('user') || '{}').id === userId
                  ? ''
                  : global.roomId,
              onlineMemberIds: Array.from(memberSet),
              muteMembersIds: Array.from(muteSet),
            },
          });
        }

        const projectId = arg.project;
        if (projectId === currentProject.id) {
          const { type, token: actionToken, data } = arg.extraBody;
          const localStorageToken = window.localStorage.getItem('token');
          if (actionToken && actionToken !== localStorageToken) {
            switch (type) {
              // ????????????
              case 'addTrack': {
                playContext.load([data]).then(() => {
                  setTrackList([...playContext.tracks]);
                  setIsNoneState(playContext.tracks.length === 0);
                  dispatch?.({ type: 'global/addTrack', data });
                });
                break;
              }
              // ????????????
              case 'removeTrack': {
                ee.emit('removeTrack', playContext.tracks[data.index]);
                setTrackList([...playContext.tracks]);
                setIsNoneState(playContext.tracks.length === 0);
                dispatch?.({ type: 'global/removeTrack', index: data.index });
                break;
              }
              // ????????????
              case 'changeVolume': {
                ee.emit('volumechange', data.value, trackList[data.index]);
                const newTrackList = cloneDeep(trackList);
                newTrackList[data.index].gain = data.value / 100;
                setTrackList([...newTrackList]);
                break;
              }
              // ??????????????????
              case 'changeStereopan': {
                ee.emit('stereopan', data.value, trackList[data.index]);
                const newTrackList = cloneDeep(trackList);
                newTrackList[data.index].stereoPan = data.value / 100;
                setTrackList([...newTrackList]);
                break;
              }
              // ????????????
              case 'changeMute': {
                ee.emit('mute', playContext.tracks[data.index]);
                setTrackList([...cloneDeep(playContext.tracks)]);
                break;
              }
              // solo ??????
              case 'changeSolo': {
                ee.emit('solo', playContext.tracks[data.index]);
                setTrackList([...cloneDeep(playContext.tracks)]);
                break;
              }
              // ??????????????????
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
              // ????????????
              case 'changeShift': {
                ee.emit(
                  'shift',
                  data.value - trackList[data.index].startTime,
                  playContext.tracks[data.index],
                );
                break;
              }
              // ????????????
              case 'changeCut': {
                ee.emit('cut', data.start, data.end, data.index);
                dispatch?.({
                  type: 'global/updateRow',
                  attr: 'cut',
                  index: data.index,
                  start: data.start,
                  end: data.end,
                });
                break;
              }
              // ????????????
              case 'changeCopy': {
                ee.emit(
                  'autoPaste',
                  data.start,
                  data.end,
                  data.position,
                  data.index,
                  data.targetTrackIndex,
                );
                dispatch?.({
                  type: 'global/updateRow',
                  attr: 'copy',
                  index: data.index,
                  start: data.start,
                  end: data.end,
                  position: data.position,
                  targetTrackIndex: data.targetTrackIndex,
                });
                break;
              }
              // ??????????????????
              case 'muteAllTracks': {
                onMuteBtnClicked('auto');
                break;
              }
              // ??????????????????
              case 'restoreAllTracks': {
                onConfirmResetAllTracks('auto');
                break;
              }
              // ??????????????????
              case 'reloadTrack': {
                dispatch?.({
                  type: 'global/updateRow',
                  attr: 'reloadTrack',
                  index: data.index,
                });
                ee.emit(
                  'reload',
                  playContext.tracks[data.index],
                  data.index,
                  'auto',
                  () => {
                    setTrackList([...playContext.tracks]);
                    ee.emit('stop');
                  },
                );
                break;
              }
              // ??????
              case 'revoke': {
                const cloneCurrentTracks = cloneDeep(currentTracks);
                const cloneData = cloneDeep(
                  cloneCurrentTracks[data.index][data.value],
                );
                cloneData.pop();
                cloneCurrentTracks[data.index][data.value] = [...cloneData];
                dispatch?.({
                  type: 'global/update',
                  payload: {
                    currentTracks: [...cloneCurrentTracks],
                  },
                });
                ee.emit(
                  'reload',
                  trackList[data.index],
                  data.index,
                  'auto',
                  () => {
                    cloneCurrentTracks.forEach((item: any, index: number) => {
                      if (index === data.index) {
                        handleInit(item, index);
                      }
                    });
                    setTrackList([...playContext.tracks]);
                  },
                );
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
      socket.on('disconnect', () => {
        dispatch?.({
          type: 'global/save',
          payload: { socketConnectSuccess: false },
        });
      });
    }
  }, [socket, playContext, global, trackList, currentProject, currentTracks]);

  const onClearBtnClicked = useCallback(() => {
    if (currentTracks.length > 0) {
      setClearModalVisible(true);
    }
  }, [currentTracks]);

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
                className={styles.btnIcon}
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
                className={styles.btnIcon}
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
            <button
              onClick={() =>
                onRevokeClicked(null, () => setRevokeLoading(false))
              }
              className={
                revocationList.length === 0 || revokeLoading
                  ? styles.disabled
                  : ''
              }
            >
              {revokeLoading ? <LoadingOutlined /> : <UndoOutlined />}
            </button>
            <button
              onClick={onClearBtnClicked}
              className={`${styles.clearBtn} ${
                resetDisabled ? styles.disabled : ''
              }`}
            >
              <img
                src={require('@/assets/workshop/clear.png')}
                alt="clear"
                className={styles.btnIcon}
              />
            </button>
          </div>
        </div>
      </div>
      <div className={styles.resourceWrap} ref={resourceWrapRef}>
        <div>
          <Resource
            show={showResource}
            onClose={() => setShowResource(false)}
            onSelect={onFileSelect}
          />
          <TrackList
            tracks={trackList}
            onDeleteClicked={onDeleteClicked}
            onRevokeClicked={onSimpleRevokeClicked}
          />
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
      <ConfirmModal
        text="Are you sure you want to clear all operations?"
        visible={clearModalVisible}
        onOk={() => onConfirmResetAllTracks('manual')}
        onCancel={() => setClearModalVisible(false)}
      />
    </div>
  );
};

export default connect(({ global }: { global: GlobalModelState }) => ({
  global,
}))(Workspace);
