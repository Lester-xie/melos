import React, { useCallback, useState, useRef, useEffect } from 'react';
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
import { debouncePushAction } from '@/services/api';
import { connect } from 'umi';
import { GlobalModelState } from '@/models/global';
import { ConnectProps } from '@@/plugin-dva/connect';

type Tab = 'M' | 'S' | 'R' | 'W' | 'A' | '';

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
  const [tab, setTab] = useState<Tab>('');
  const [showLoading, setShowLoading] = useState(false);
  const { project: currentProject, userRoleInCurrentProject } = global;

  const onFileSelect = (file: any, type: 'cloud' | 'local') => {
    setIsNoneState(false);
    playContext.load([file]).then(() => {
      setTrackList([...playContext.tracks]);
    });
    if (type === 'local') {
      setShowResource(false);
    }
    debouncePushAction(currentProject.id, 'addTrack', file);
  };

  useEffect(() => {
    setToneCtx(Tone.getContext());
  }, []);

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
          setPlayContext(null);
          setShowLoading(false);
        });

        ee.on('audiosourcesrendered', function () {
          setPlayContext(playlist);
        });

        ee.on('select', function (start, end, track) {
          // console.log(start, end, track);
        });

        ee.on('audiosourcesstartload', (trackList) => {
          if (trackList.length > 0) {
            setShowLoading(true);
          }
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
    if (!currentProject?.id) {
      message.warn('Please select one project first');
      return;
    }
    setShowResource(true);
  };

  const onDeleteClicked = (index: number) => {
    ee.emit('removeTrack', playContext.tracks[index]);
    setTrackList([...playContext.tracks]);
    setIsNoneState(playContext.tracks.length === 0);
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

  useEffect(() => {
    if (token) {
      socket?.disconnect();
      dispatch?.({
        type: 'global/save',
        payload: { socketConnectSuccess: false },
      });
      setSocket(io(`https://www.metaapp.fun?token=${token}`));
    }
  }, [token]);

  useEffect(() => {
    if (socket && playContext) {
      socket.removeAllListeners();
      socket.on('action', (arg: any) => {
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
                });
                break;
              }
              // 移除音频
              case 'removeTrack': {
                ee.emit('removeTrack', playContext.tracks[data.index]);
                setTrackList([...playContext.tracks]);
                setIsNoneState(playContext.tracks.length === 0);
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
  }, [socket, playContext, trackList, currentProject]);

  return (
    <div className={styles.container}>
      <div className={styles.operationWrap}>
        <div className={styles.left}>
          <button
            onClick={() => setTab('M')}
            className={tab === 'M' ? styles.active : ''}
          >
            M
          </button>
          <button
            onClick={() => setTab('S')}
            className={tab === 'S' ? styles.active : ''}
          >
            S
          </button>
          <button
            onClick={() => setTab('R')}
            className={tab === 'R' ? styles.active : ''}
          >
            R
          </button>
          <button
            onClick={() => setTab('W')}
            className={tab === 'W' ? styles.active : ''}
          >
            W
          </button>
          <button
            onClick={() => setTab('A')}
            className={tab === 'A' ? styles.active : ''}
          >
            A
          </button>
          <button className={styles.btnAdd} onClick={onAddBtnClicked}>
            <PlusOutlined />
          </button>
        </div>
        <div className={styles.right}>
          <div className={styles.trackTransport}>
            <button onClick={onStopBtnClicked} className={styles.stopBtn} />
            <button onClick={onPlayBtnClicked} className={styles.playBtn} />
            <button onClick={onPauseBtnClicked} className={styles.pauseBtn} />
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
          <TrackList
            tracks={trackList}
            onAddBtnClicked={onAddBtnClicked}
            onDeleteClicked={onDeleteClicked}
          />
        </div>
        <div className={styles.trackContainer}>
          <div className={styles.trackWrap}>
            {!isNoneState && (
              <div ref={container} className={styles.trackList} />
            )}
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
