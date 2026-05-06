import React, {type ReactNode} from 'react';
import OriginalDocItemFooter from '@theme-original/DocItem/Footer';

import Comments from '../../../components/Comments';

export default function DocItemFooter(): ReactNode {
  return (
    <>
      <OriginalDocItemFooter />
      <Comments />
    </>
  );
}
