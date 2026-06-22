import React from 'react';
import { Composition } from 'remotion';
import PromptWarsPost from './PromptWarsPost';

export function RemotionRoot() {
  return (
    <Composition
      id="PromptWarsPost"
      component={PromptWarsPost}
      durationInFrames={720}
      fps={30}
      width={1080}
      height={1080}
    />
  );
}
