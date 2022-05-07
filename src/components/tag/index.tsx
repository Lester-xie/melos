import React, { useCallback } from 'react';
import styles from './index.less';

interface Props {
  text: string;
  active: boolean;
  onClick: () => void;
}

export default function Tag(props: Props) {
  const onTagClicked = useCallback(
    (text) => {
      props.onClick();
    },
    [props.onClick],
  );

  return (
    <div
      className={`${styles.container} ${props.active ? styles.active : null}`}
      onClick={onTagClicked}
    >
      {props.text}
    </div>
  );
}
