import React, { useCallback, useState, useEffect, useRef } from 'react';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import Collapse from '../collapse';
import Tag from '../tag';
import styles from './index.less';
import {
  createAsset,
  fetchPresigned,
  uploadAudio,
  fetchTagList,
} from '@/services/api';
import useAsync from '@/hooks/useAsync';
import { cloneDeep } from 'lodash';
import { Spin } from 'antd';

type Tab = 'cloud' | 'local';

interface Props {
  show: boolean;
  onClose: () => void;
  onSelect: (file: any, type: 'cloud' | 'local') => void;
}

const useTags = () => {
  const { execute, data } = useAsync(
    useCallback(async () => {
      const result = await fetchTagList();
      if (result.code === 0) {
        return result.data.result;
      }
      return [];
    }, []),
  );

  useEffect(() => execute(), [execute]);

  return {
    list: data,
  };
};

export default function Resource(props: Props) {
  const [tab, setTab] = useState<Tab>('local');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [tagList, setTagList] = useState([
    {
      id: 1,
      text: 'Vocals',
      src: 'https://naomiaro.github.io/waveform-playlist/media/audio/Vocals30.mp3',
      name: 'Vocals30.mp3',
      time: '2022-05-05 12:43',
      active: false,
    },
    {
      id: 2,
      text: 'Piano',
      src: 'https://naomiaro.github.io/waveform-playlist/media/audio/PianoSynth30.mp3',
      name: 'PianoSynth30.mp3',
      time: '2022-05-06 17:10',
      active: false,
    },
    {
      id: 3,
      text: 'Bass',
      src: 'https://naomiaro.github.io/waveform-playlist/media/audio/BassDrums30.mp3',
      name: 'BassDrums30.mp3',
      time: '2022-05-06 09:18',
      active: false,
    },
  ]);
  const [searchResultList, setSearchResultList] = useState<any>([]);
  const [loading, setLoading] = useState(false);
  // const { tagList } = useTags()
  const onCloseBtnClicked = useCallback(() => {
    props.onClose();
  }, [props.onClose]);

  if (!props.show) {
    return null;
  }

  const onTagClicked = (index: number) => {
    const list = cloneDeep(tagList);
    list[index].active = !list[index].active;
    const sourceList: any = [];
    list.forEach((item: any) => {
      if (item.active) {
        sourceList.push({
          name: item.name,
          time: item.time,
          src: item.src,
        });
      }
    });
    setSearchResultList([...sourceList]);
    setTagList([...list]);
  };

  const onItemClicked = (item: any) => {
    props.onSelect(
      {
        src: item.src,
        name: item.name,
      },
      'cloud',
    );
  };

  const renderCloud = () => {
    return (
      <div className={styles.cloudWrap}>
        <div className={styles.searchWrap}>
          <input type="text" placeholder="Search" />
          <img src={require('@/assets/workshop/search.png')} alt="" />
        </div>
        <Collapse label="Input sources" collapse={true}>
          <div>
            {tagList.map((tag, index) => {
              return (
                <Tag
                  text={tag.text}
                  active={tag.active}
                  onClick={() => onTagClicked(index)}
                  key={tag.id}
                />
              );
            })}
          </div>
        </Collapse>
        <Collapse label="Fx Types" />
        <Collapse label="characters" />
        <div className={styles.resultWrap}>
          <div className={styles.title}>Result</div>
          <ul className={styles.resultList}>
            {searchResultList.map((item: any) => (
              <li key={item.name} onClick={() => onItemClicked(item)}>
                <div>{item.name}</div>
                <div>{item.time}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  const onUploadBtnClicked = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: any) => {
    setLoading(true);
    const file = e.target.files[0];
    const fileName = file.name;
    const fileNameSplitByDot = fileName.split('.');
    const fileSuffix = fileNameSplitByDot[fileNameSplitByDot.length - 1];
    const preSignData = await fetchPresigned(fileSuffix);
    const uploadLink = preSignData.data.link;
    const token = preSignData.data.token;
    const formdata = new FormData();
    formdata.append('', file, token);
    await uploadAudio(uploadLink, formdata);
    const res = await createAsset(token);
    if (res.code === 0) {
      const data = res.data.result;
      props.onSelect(
        {
          name: fileName,
          src: data.url,
        },
        'local',
      );
    }
    setLoading(false);
  };

  const renderLocal = () => {
    return (
      <div>
        <div className={styles.uploadWrap} onClick={onUploadBtnClicked}>
          {loading ? (
            <Spin size="large" />
          ) : (
            <>
              <div>
                <PlusOutlined />
              </div>
            </>
          )}
          Local File
        </div>
        <input
          type="file"
          ref={fileInputRef}
          className={styles.uploadBtn}
          onChange={onFileChange}
          accept=".mp3,.wav"
        />
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          onClick={() => setTab('cloud')}
          className={tab === 'cloud' ? styles.active : ''}
        >
          Loop Cloud
        </button>
        <button
          onClick={() => setTab('local')}
          className={tab === 'local' ? styles.active : ''}
        >
          My Loop
        </button>
        <button onClick={onCloseBtnClicked} className={styles.onCloseBtn}>
          <CloseOutlined />
        </button>
      </div>
      <div>{tab === 'local' ? renderLocal() : renderCloud()}</div>
    </div>
  );
}
