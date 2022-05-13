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
  fetchUploadList,
} from '@/services/api';
import useAsync from '@/hooks/useAsync';
import { cloneDeep } from 'lodash';
import { Spin } from 'antd';
import { useSelector } from 'umi';
import { UserInfo } from '@/models/global';

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

function formatTime(time: string) {
  const date = new Date(time);
  return `${date.getFullYear()}-${addZero(date.getMonth() + 1)}-${addZero(
    date.getDate(),
  )} ${date.getHours()}:${addZero(date.getMinutes())}`;
}

function addZero(number: number) {
  if (number < 10) {
    return `0${number}`;
  }
  return number;
}

export default function Resource(props: Props) {
  const [tab, setTab] = useState<Tab>('local');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [tagList, setTagList] = useState([
    {
      id: 0,
      text: 'Vocals',
      src: 'https://mixmusic.oss-cn-hongkong.aliyuncs.com/mixmusic/55CD2D9B81E981D4F51890555491E28F.LZfA1bsAiArc.9315690.mpeg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=LTAI5tEGW864FBDZopbNZwMW%2F20220512%2Foss-cn-hongkong%2Fs3%2Faws4_request&X-Amz-Date=20220512T074921Z&X-Amz-Expires=43200&X-Amz-SignedHeaders=host&X-Amz-Signature=7f198e1f4b2acea541bc1907f133243783a49054083e9091a3d953079ff9b61a',
      name: 'Vocals30.mp3',
      time: '2022-05-05 12:43',
      active: false,
    },
    {
      id: 1,
      text: 'Piano',
      src: 'https://mixmusic.oss-cn-hongkong.aliyuncs.com/mixmusic/3805811796D6907D8E1CFBE0468E4341.wtrX72MBh0f7.9716957.mpeg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=LTAI5tEGW864FBDZopbNZwMW%2F20220512%2Foss-cn-hongkong%2Fs3%2Faws4_request&X-Amz-Date=20220512T074921Z&X-Amz-Expires=43200&X-Amz-SignedHeaders=host&X-Amz-Signature=0b1ecc8aa6c730310a0b2a66f72d8f77f2c86be4c34679eb68ab00d89dcea107',
      name: 'PianoSynth30.mp3',
      time: '2022-05-06 17:10',
      active: false,
    },
    {
      id: 2,
      text: 'Bass',
      src: 'https://mixmusic.oss-cn-hongkong.aliyuncs.com/mixmusic/9C9C80F6BA029C187AECDAA1DA6FADDF.TZKU50bjIpik.9560295.mpeg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=LTAI5tEGW864FBDZopbNZwMW%2F20220512%2Foss-cn-hongkong%2Fs3%2Faws4_request&X-Amz-Date=20220512T074921Z&X-Amz-Expires=43200&X-Amz-SignedHeaders=host&X-Amz-Signature=2a56413d6b00802f7151de8651fe7f78e4b5c31990fc0cf05f8ede5b0bce5478',
      name: 'BassDrums30.mp3',
      time: '2022-05-07 12:13',
      active: false,
    },
    {
      id: 3,
      text: 'Hop',
      src: 'https://mixmusic.oss-cn-hongkong.aliyuncs.com/mixmusic/2018DDA36DE2FB27830F353828B2C119.Zm73NpGLKH4l.10788996.mpeg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=LTAI5tEGW864FBDZopbNZwMW%2F20220512%2Foss-cn-hongkong%2Fs3%2Faws4_request&X-Amz-Date=20220512T074921Z&X-Amz-Expires=43200&X-Amz-SignedHeaders=host&X-Amz-Signature=1ea4de96956757a036c0c1a157b56cedc221cfb63e5961e658846aaf404d85af',
      name: '329.mp3',
      time: '2022-05-05 14:31',
      active: false,
    },
    {
      id: 4,
      text: 'Trip',
      src: 'https://mixmusic.oss-cn-hongkong.aliyuncs.com/mixmusic/D45C771F937C03F937FFA76DD0B6AECB.jQSeontkyQpB.10622959.mpeg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=LTAI5tEGW864FBDZopbNZwMW%2F20220512%2Foss-cn-hongkong%2Fs3%2Faws4_request&X-Amz-Date=20220512T074921Z&X-Amz-Expires=43200&X-Amz-SignedHeaders=host&X-Amz-Signature=20e49ee7054a3b3f84949af89aa0e2607589dfc51c72ff06059a65b04a511ac4',
      name: '305.mp3',
      time: '2022-05-06 17:18',
      active: false,
    },
    {
      id: 5,
      text: 'Pop',
      src: 'https://mixmusic.oss-cn-hongkong.aliyuncs.com/mixmusic/BB9AEFD85052FFF48A7C9570BA41EBF0.TmcqbJ6uACxT.10457856.mpeg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=LTAI5tEGW864FBDZopbNZwMW%2F20220512%2Foss-cn-hongkong%2Fs3%2Faws4_request&X-Amz-Date=20220512T074921Z&X-Amz-Expires=43200&X-Amz-SignedHeaders=host&X-Amz-Signature=f59189efe304455e403b8eb83bdd3a75318ff0139875ea623ac1f8e2e3150e80',
      name: '318.mp3',
      time: '2022-05-06 19:01',
      active: false,
    },
    {
      id: 6,
      text: 'Grunge',
      src: 'https://mixmusic.oss-cn-hongkong.aliyuncs.com/mixmusic/BB9AEFD85052FFF48A7C9570BA41EBF0.TmcqbJ6uACxT.10457856.mpeg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=LTAI5tEGW864FBDZopbNZwMW%2F20220512%2Foss-cn-hongkong%2Fs3%2Faws4_request&X-Amz-Date=20220512T074921Z&X-Amz-Expires=43200&X-Amz-SignedHeaders=host&X-Amz-Signature=f59189efe304455e403b8eb83bdd3a75318ff0139875ea623ac1f8e2e3150e80',
      name: '054.mp3',
      time: '2022-05-06 12:10',
      active: false,
    },
  ]);
  const [searchResultList, setSearchResultList] = useState<any>([]);
  const [loading, setLoading] = useState(false);
  const [historyList, setHistoryList] = useState([]);

  // @ts-ignore
  const userInfo: UserInfo = useSelector((state) => state.global.userInfo);

  useEffect(() => {
    if (userInfo && tab === 'local') {
      fetchUploadList(userInfo.id).then((res) => {
        if (res.code === 0) {
          setHistoryList(res.data.result);
        }
      });
    }
  }, [tab, userInfo]);

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

  const onHistoryItemClicked = (item: any) => {
    props.onSelect(
      {
        src: item.url,
        name: item.name || 'test.mp3',
      },
      'cloud',
    );
  };

  const renderCloud = () => {
    return (
      <div className={styles.cloudWrap}>
        <div className={styles.searchWrap}>
          <input type="text" placeholder="Search" />
          <img src={require('@/assets/workshop/search.png')} alt="search" />
        </div>
        <Collapse label="Input sources" collapse={true}>
          <div>
            {tagList.slice(0, 3).map((tag) => {
              return (
                <Tag
                  text={tag.text}
                  active={tag.active}
                  onClick={() => onTagClicked(tag.id)}
                  key={tag.id}
                />
              );
            })}
          </div>
        </Collapse>
        <Collapse label="Fx Types">
          <div>
            {tagList.slice(3, 6).map((tag) => {
              return (
                <Tag
                  text={tag.text}
                  active={tag.active}
                  onClick={() => onTagClicked(tag.id)}
                  key={tag.id}
                />
              );
            })}
          </div>
        </Collapse>
        <Collapse label="characters">
          <div>
            {tagList.slice(6).map((tag) => {
              return (
                <Tag
                  text={tag.text}
                  active={tag.active}
                  onClick={() => onTagClicked(tag.id)}
                  key={tag.id}
                />
              );
            })}
          </div>
        </Collapse>
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
    const res = await createAsset(token, userInfo.id, fileName);
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
    fetchUploadList(userInfo.id).then((res) => {
      if (res.code === 0) {
        setHistoryList(res.data.result);
      }
    });
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
        <div className={styles.historyWrap}>
          <div className={styles.historyTitle}>History Upload</div>
          <ul>
            {historyList.map((item: any) => (
              <div
                className={styles.historyItem}
                onClick={() => onHistoryItemClicked(item)}
                key={item.url}
              >
                <div>{item.name || 'test.mp3'}</div>
                <div>{formatTime(item.updatedAt)}</div>
              </div>
            ))}
          </ul>
        </div>
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
